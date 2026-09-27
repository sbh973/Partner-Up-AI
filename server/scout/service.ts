import type { ScoutConnection as ConnectionRow } from '@prisma/client';
import type {
  DnaExtractResponse,
  DnaPatch,
  IntentTags,
  PartnerDNA,
  ScoutCandidate,
  ScoutConnectionStatus,
  ScoutConnectionView,
  ScoutGroup,
  ScoutIntent,
  ScoutOverview,
  ScoutReason,
  ScoutSearchResponse,
} from '../../shared/types';
import { listToSentence } from '../../shared/labels';
import { extractProfile, generateGroupExplanation, generateGroupSummary, museReply, parseGroupIntent } from '../ai/service';
import { db, parseJson } from '../db';
import { ApiError, notFound } from '../http/errors';
import { notify } from '../notify';
import { canonicalize, toTag } from '../semantic/similarity';
import { applyPatch, emptyDna, isDnaEmpty, loadDna, removePatch, rowToDna, saveDna } from './dna';
import { personView, scoreCandidate, type ScoutProfile } from './engine';
import { assembleGroup, labelOf, memberContributions } from './group';

const SHOW_THRESHOLD = 55; // below this Muse says "I'll keep looking"
const KEEP_LOOKING_THRESHOLD = 65; // a new person must be this good to trigger "Muse found someone"
const PERSONA_ACCEPT = 50;

interface Explanation {
  forRequester: ScoutReason[];
  forCandidate: ScoutReason[];
  requestSummary: string;
}

// ─── Loading people ────────────────────────────────────────────────────────

async function profileFor(userId: string): Promise<ScoutProfile> {
  const user = await db().user.findUnique({
    where: { id: userId },
    include: { profile: true, dna: true, scoutRequests: { where: { active: true } } },
  });
  if (!user?.profile) throw new ApiError(409, 'profile_required', 'Set up your profile first.');
  const dna = (await loadDna(userId)) ?? emptyDna();
  return {
    userId,
    firstName: user.profile.firstName,
    age: user.profile.age,
    avatarHue: user.profile.avatarHue,
    isDemoPersona: user.isDemoPersona,
    dna,
    intents: user.scoutRequests.map((r) => parseJson<ScoutIntent | null>(r.intentJson, null)).filter((i): i is ScoutIntent => i !== null),
  };
}

/** Everyone discoverable in Scout: has a profile + Partner DNA, and has joined. */
async function loadPool(excludeUserId: string): Promise<ScoutProfile[]> {
  const users = await db().user.findMany({
    where: { id: { not: excludeUserId }, dormant: false, profile: { isNot: null }, dna: { isNot: null } },
    include: { profile: true, dna: true, scoutRequests: { where: { active: true } } },
  });
  const out: ScoutProfile[] = [];
  for (const u of users) {
    if (!u.profile || !u.dna) continue;
    const dna = rowToDna(u.dna);
    if (isDnaEmpty(dna)) continue;
    out.push({
      userId: u.id,
      firstName: u.profile.firstName,
      age: u.profile.age,
      avatarHue: u.profile.avatarHue,
      isDemoPersona: u.isDemoPersona,
      dna,
      intents: u.scoutRequests.map((r) => parseJson<ScoutIntent | null>(r.intentJson, null)).filter((i): i is ScoutIntent => i !== null),
    });
  }
  return out;
}

// ─── Partner DNA from conversation ─────────────────────────────────────────

const ONBOARDING_FOLLOWUPS = [
  'What are you good at — and what are you still learning?',
  'Where are you based, and when are you usually free?',
];

export async function extractDna(userId: string, text: string, step: number): Promise<DnaExtractResponse> {
  const current = (await loadDna(userId)) ?? emptyDna();
  const { value: patch, source } = await extractProfile(text);
  const { next, added } = applyPatch(current, patch);
  if (!next.about && text.length > 20) next.about = text.slice(0, 280);
  const saved = await saveDna(userId, next, source);
  const addedItems = Object.values(added).flat().filter((x): x is string => typeof x === 'string');
  const followUp = ONBOARDING_FOLLOWUPS[step] ?? null;
  const fallback = addedItems.length
    ? `Got it — I added ${listToSentence(addedItems.slice(0, 4))} to your Partner DNA.${followUp ? ` ${followUp}` : ''}`
    : `Thanks! I didn't catch anything new there.${followUp ? ` ${followUp}` : ''}`;
  const reply = await museReply(
    followUp ? `acknowledge what was added to their Partner DNA, then ask exactly this follow-up question: "${followUp}"` : 'acknowledge what was added and say their Partner DNA is ready to review',
    { added, followUp },
    fallback,
  );
  return { added, dna: saved, reply: reply.value, source };
}

export async function undoDnaPatch(userId: string, patch: DnaPatch): Promise<PartnerDNA> {
  const current = (await loadDna(userId)) ?? emptyDna();
  return saveDna(userId, removePatch(current, patch), 'manual');
}

// ─── Search ────────────────────────────────────────────────────────────────

function intentTags(intent: ScoutIntent): IntentTags {
  const t = (items: string[]) => items.map((x) => toTag(canonicalize(x) || x));
  return {
    category: toTag(canonicalize(intent.category) || intent.category),
    neededSkills: t(intent.neededSkills),
    interests: t(intent.interests),
    learningNeeds: t(intent.learningNeeds),
  };
}

async function connectionStatusMap(requestId: string): Promise<Map<string, ScoutConnectionStatus>> {
  const rows = await db().scoutConnection.findMany({ where: { requestId } });
  return new Map(rows.map((r) => [r.candidateId, r.status as ScoutConnectionStatus]));
}

export async function search(userId: string, text: string): Promise<ScoutSearchResponse> {
  const { value: parsed, source } = await parseGroupIntent(text);
  const { intent, aboutMe } = parsed;

  // Visible, undoable Partner DNA update from what the person said about themselves.
  let dnaUpdate: DnaPatch | null = null;
  if (Object.keys(aboutMe).length) {
    const current = (await loadDna(userId)) ?? emptyDna();
    const { next, added } = applyPatch(current, aboutMe);
    if (Object.keys(added).length) {
      await saveDna(userId, next, source);
      dnaUpdate = added;
    }
  }

  const me = await profileFor(userId);
  const request = await db().scoutRequest.create({
    data: { userId, rawText: text.slice(0, 600), intentJson: JSON.stringify(intent), lens: intent.lens, source },
  });
  const pool = await loadPool(userId);
  const statuses = await connectionStatusMap(request.id);

  let kind: ScoutSearchResponse['kind'] = 'people';
  let people: ScoutCandidate[] = [];
  let group: ScoutGroup | null = null;

  if (intent.groupSize && intent.groupSize > 1) {
    const pick = assembleGroup(me, intent, pool, Math.min(intent.groupSize, 5));
    if (pick && pick.members.some((m) => m.result.score >= SHOW_THRESHOLD)) {
      kind = 'group';
      const wanted = pick.wanted;
      const members = [
        { person: personView(me), isYou: true, contributes: memberContributions(me, wanted) },
        ...pick.members.map((m) => ({ person: personView(m.profile), isYou: false, contributes: memberContributions(m.profile, wanted) })),
      ];
      const facts = members.map((m) => ({
        name: m.isYou ? 'You' : m.person.firstName,
        isYou: m.isYou,
        skills: m.isYou ? me.dna.skills : (pool.find((p) => p.userId === m.person.id)?.dna.skills ?? []),
        interests: m.isYou ? me.dna.interests : (pool.find((p) => p.userId === m.person.id)?.dna.interests ?? []),
        contributes: m.contributes,
      }));
      const shared = pick.sharedTraits.map(labelOf);
      const [explanation, summary] = await Promise.all([
        generateGroupExplanation(facts, shared),
        generateGroupSummary({ request: intent.summary, members: facts, sharedTraits: shared, covered: pick.covered.map(labelOf), missing: pick.missing.map(labelOf) }),
      ]);
      group = {
        members,
        score: pick.score,
        explanation: explanation.value,
        summary: summary.value,
        covered: pick.covered.map(toTag),
        missing: pick.missing.map(toTag),
        source: explanation.source === 'muse' && summary.source === 'muse' ? 'muse' : 'offline',
      };
      people = pick.members.map((m) => ({
        person: personView(m.profile),
        score: m.result.score,
        reasons: m.result.reasons,
        caveats: m.result.caveats,
        theyAreLookingFor: m.result.theyAreLookingFor,
        connectionStatus: statuses.get(m.profile.userId) ?? null,
      }));
    }
  } else {
    people = pool
      .map((p) => ({ p, r: scoreCandidate(me, intent, p) }))
      .filter((x) => x.r.score >= SHOW_THRESHOLD)
      .sort((a, b) => b.r.score - a.r.score || a.p.userId.localeCompare(b.p.userId))
      .slice(0, 3)
      .map(({ p, r }) => ({
        person: personView(p),
        score: r.score,
        reasons: r.reasons,
        caveats: r.caveats,
        theyAreLookingFor: r.theyAreLookingFor,
        connectionStatus: statuses.get(p.userId) ?? null,
      }));
  }

  if (kind === 'people' && people.length === 0) kind = 'keep_looking';
  if (kind === 'keep_looking') await db().scoutRequest.update({ where: { id: request.id }, data: { watching: true } });

  const fallbackMessage =
    kind === 'keep_looking'
      ? 'Nobody fits yet — I’ll keep looking and tell you the moment someone does.'
      : kind === 'group'
        ? `Here’s a group that fits: ${listToSentence((group?.members ?? []).filter((m) => !m.isYou).map((m) => m.person.firstName))}.`
        : people.length === 1
          ? `I found someone: ${people[0].person.firstName}.`
          : `I found ${people.length} people who fit — ${people[0].person.firstName} is the strongest.`;
  const reply = await museReply(
    kind === 'keep_looking'
      ? 'tell them nobody fits yet and that you will keep looking and notify them'
      : 'introduce the results in one sentence, naming the top person or the group members',
    { request: intent.summary, kind, names: people.map((p) => p.person.firstName) },
    fallbackMessage,
  );

  // This new request might be exactly what someone else is waiting for.
  await matchWatchersAgainst(userId);

  return {
    requestId: request.id,
    intent,
    intentTags: intentTags(intent),
    kind,
    message: reply.value,
    people,
    group,
    dnaUpdate,
    source: source === 'muse' && reply.source === 'muse' ? 'muse' : source,
  };
}

// ─── Consent flow ──────────────────────────────────────────────────────────

async function createConnection(
  request: { id: string; userId: string; intentJson: string },
  candidateId: string,
  opts: { requesterAccepted: boolean; origin: 'search' | 'keep_looking'; groupKey: string | null },
): Promise<ConnectionRow> {
  const existing = await db().scoutConnection.findUnique({ where: { requestId_candidateId: { requestId: request.id, candidateId } } });
  if (existing) return existing;
  const intent = parseJson<ScoutIntent | null>(request.intentJson, null);
  if (!intent) throw notFound('That search');
  const me = await profileFor(request.userId);
  const them = await profileFor(candidateId);
  const result = scoreCandidate(me, intent, them);
  const explanation: Explanation = { forRequester: result.reasons, forCandidate: result.reasonsForThem, requestSummary: intent.summary };
  // Demo personas are fictional: they "decide" instantly from the match strength.
  const candidateAccepted = them.isDemoPersona && result.score >= PERSONA_ACCEPT;
  const status: ScoutConnectionStatus = opts.requesterAccepted && candidateAccepted ? 'connected' : opts.origin === 'keep_looking' ? 'suggested' : 'pending';
  const row = await db().scoutConnection.create({
    data: {
      requestId: request.id,
      requesterId: request.userId,
      candidateId,
      score: result.score,
      explanationJson: JSON.stringify(explanation),
      groupKey: opts.groupKey,
      origin: opts.origin,
      requesterAccepted: opts.requesterAccepted,
      candidateAccepted,
      status,
    },
  });
  if (status === 'connected') {
    await notify(request.userId, 'scout', 'connected', `You and ${them.firstName} both said yes — contact info is unlocked.`, `/app/scout/connection/${row.id}`);
  } else if (opts.origin === 'search' && !them.isDemoPersona) {
    await notify(candidateId, 'scout', 'connection_request', `${me.firstName} wants to connect: “${intent.summary}”. Muse thinks you fit.`, `/app/scout/connection/${row.id}`);
  }
  return row;
}

async function ownRequest(userId: string, requestId: string) {
  const request = await db().scoutRequest.findUnique({ where: { id: requestId } });
  if (!request || request.userId !== userId) throw notFound('That search');
  return request;
}

export async function partnerUp(userId: string, requestId: string, candidateIds: string[]): Promise<ScoutConnectionView[]> {
  const request = await ownRequest(userId, requestId);
  const ids = [...new Set(candidateIds)].filter((id) => id !== userId).slice(0, 5);
  const groupKey = ids.length > 1 ? request.id : null;
  const rows: ConnectionRow[] = [];
  for (const id of ids) {
    const target = await db().user.findUnique({ where: { id }, select: { dormant: true } });
    if (!target || target.dormant) throw notFound('That person');
    let row = await createConnection(request, id, { requesterAccepted: true, origin: 'search', groupKey });
    if (!row.requesterAccepted) row = await acceptAs(row, 'requester');
    rows.push(row);
  }
  return Promise.all(rows.map((r) => connectionView(r, userId)));
}

async function acceptAs(row: ConnectionRow, role: 'requester' | 'candidate'): Promise<ConnectionRow> {
  const requesterAccepted = role === 'requester' ? true : row.requesterAccepted;
  const candidateAccepted = role === 'candidate' ? true : row.candidateAccepted;
  const connected = requesterAccepted && candidateAccepted;
  const updated = await db().scoutConnection.update({
    where: { id: row.id },
    data: { requesterAccepted, candidateAccepted, status: connected ? 'connected' : row.status === 'suggested' ? 'suggested' : 'pending' },
  });
  if (connected && row.status !== 'connected') {
    const [a, b] = await Promise.all([
      db().profile.findUnique({ where: { userId: row.requesterId } }),
      db().profile.findUnique({ where: { userId: row.candidateId } }),
    ]);
    const link = `/app/scout/connection/${row.id}`;
    await notify(row.requesterId, 'scout', 'connected', `You and ${b?.firstName ?? 'your match'} both said yes — contact info is unlocked.`, link);
    await notify(row.candidateId, 'scout', 'connected', `You and ${a?.firstName ?? 'your match'} both said yes — contact info is unlocked.`, link);
  }
  return updated;
}

export async function respond(userId: string, connectionId: string, accept: boolean): Promise<ScoutConnectionView> {
  const row = await db().scoutConnection.findUnique({ where: { id: connectionId } });
  if (!row || (row.requesterId !== userId && row.candidateId !== userId)) throw notFound('That connection');
  if (row.status === 'connected' || row.status === 'declined') return connectionView(row, userId);
  const role = row.requesterId === userId ? 'requester' : 'candidate';
  if (!accept) {
    const updated = await db().scoutConnection.update({ where: { id: row.id }, data: { status: 'declined' } });
    return connectionView(updated, userId);
  }
  return connectionView(await acceptAs(row, role), userId);
}

async function connectionView(row: ConnectionRow, viewerId: string): Promise<ScoutConnectionView> {
  const role = row.requesterId === viewerId ? 'requester' : 'candidate';
  const otherId = role === 'requester' ? row.candidateId : row.requesterId;
  const other = await profileFor(otherId);
  const otherProfile = await db().profile.findUnique({ where: { userId: otherId } });
  const exp = parseJson<Explanation>(row.explanationJson, { forRequester: [], forCandidate: [], requestSummary: '' });
  const connected = row.status === 'connected';
  return {
    id: row.id,
    role,
    status: row.status as ScoutConnectionStatus,
    origin: row.origin === 'keep_looking' ? 'keep_looking' : 'search',
    other: personView(other),
    score: row.score,
    reasons: role === 'requester' ? exp.forRequester : exp.forCandidate,
    requestId: row.requestId,
    requestSummary: exp.requestSummary,
    youAccepted: role === 'requester' ? row.requesterAccepted : row.candidateAccepted,
    theyAccepted: role === 'requester' ? row.candidateAccepted : row.requesterAccepted,
    // Contact info only after BOTH people said yes.
    contacts: connected ? { phone: otherProfile?.phone ?? null, instagram: otherProfile?.instagram ?? null } : null,
    groupKey: row.groupKey,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getConnection(userId: string, id: string): Promise<ScoutConnectionView> {
  const row = await db().scoutConnection.findUnique({ where: { id } });
  if (!row || (row.requesterId !== userId && row.candidateId !== userId)) throw notFound('That connection');
  return connectionView(row, userId);
}

export async function overview(userId: string): Promise<ScoutOverview> {
  const [requests, connections] = await Promise.all([
    db().scoutRequest.findMany({ where: { userId, active: true }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { connections: true } } } }),
    db().scoutConnection.findMany({ where: { OR: [{ requesterId: userId }, { candidateId: userId }], status: { not: 'declined' } }, orderBy: { updatedAt: 'desc' }, take: 30 }),
  ]);
  return {
    requests: requests.map((r) => {
      const intent = parseJson<ScoutIntent | null>(r.intentJson, null);
      return {
        id: r.id,
        summary: intent?.summary ?? r.rawText,
        rawText: r.rawText,
        lens: r.lens === 'learn' || r.lens === 'explore' ? r.lens : 'connect',
        watching: r.watching,
        createdAt: r.createdAt.toISOString(),
        connections: r._count.connections,
      };
    }),
    connections: await Promise.all(connections.map((c) => connectionView(c, userId))),
  };
}

export async function stopRequest(userId: string, requestId: string): Promise<{ ok: true }> {
  await ownRequest(userId, requestId);
  await db().scoutRequest.update({ where: { id: requestId }, data: { active: false, watching: false } });
  return { ok: true };
}

// ─── Keep Looking ──────────────────────────────────────────────────────────

/**
 * Someone joined, updated their Partner DNA, or posted a request: check every
 * active "keep looking" request from other people. Strong fits become a
 * suggested connection that BOTH people must approve.
 */
export async function matchWatchersAgainst(newUserId: string): Promise<number> {
  const watchers = await db().scoutRequest.findMany({ where: { active: true, watching: true, userId: { not: newUserId } } });
  if (watchers.length === 0) return 0;
  const candidateUser = await db().user.findUnique({ where: { id: newUserId }, include: { profile: true } });
  if (!candidateUser?.profile || candidateUser.dormant) return 0;
  const candidate = await profileFor(newUserId);
  if (isDnaEmpty(candidate.dna)) return 0;
  let found = 0;
  for (const w of watchers) {
    const intent = parseJson<ScoutIntent | null>(w.intentJson, null);
    if (!intent) continue;
    const already = await db().scoutConnection.findUnique({ where: { requestId_candidateId: { requestId: w.id, candidateId: newUserId } } });
    if (already) continue;
    const owner = await profileFor(w.userId);
    const result = scoreCandidate(owner, intent, candidate);
    if (result.score < KEEP_LOOKING_THRESHOLD) continue;
    const row = await createConnection(w, newUserId, { requesterAccepted: false, origin: 'keep_looking', groupKey: null });
    await db().scoutRequest.update({ where: { id: w.id }, data: { watching: false } });
    await notify(w.userId, 'scout', 'muse_found', `Muse found someone for “${intent.summary}” — ${candidate.firstName} may be exactly who you’re looking for.`, `/app/scout/connection/${row.id}`);
    if (!candidate.isDemoPersona) {
      await notify(newUserId, 'scout', 'muse_found', `Muse found someone who may be looking for you: “${intent.summary}”.`, `/app/scout/connection/${row.id}`);
    }
    found++;
  }
  return found;
}

