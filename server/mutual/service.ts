// MUTUAL — "You know WHO."
//
// Deliberately contains NO AI: no Muse, no scoring, no hints, no recommendations.
// (Enforced by an ESLint rule: nothing under server/mutual may import server/ai.)
//
// Privacy rules implemented here:
//   • A request is visible only to its sender. Targets never learn who chose them.
//   • People only learn anonymous counts: searches received, private choices received.
//   • Identity + approved contact info are revealed only when BOTH chose each other.

import type { MutualRequest as RequestRow } from '@prisma/client';
import type {
  MutualMatchView,
  MutualOverview,
  MutualPartnerUpResponse,
  MutualRequestStatus,
  MutualSearchResponse,
  MutualSentRequest,
} from '../../shared/types';
import { config } from '../config';
import { DAY_MS, db, normName } from '../db';
import { ApiError, notFound } from '../http/errors';
import { notify } from '../notify';

const HOUR_MS = 3_600_000;

function windowStart(): Date {
  return new Date(Date.now() - config.mutualWindowDays * DAY_MS);
}

async function myProfile(userId: string) {
  const profile = await db().profile.findUnique({ where: { userId } });
  if (!profile) throw new ApiError(409, 'profile_required', 'Set up your profile first.');
  return profile;
}

/** Lazily expire requests past their 30-day window (and tell only the sender). */
async function expireRequests(senderId?: string): Promise<void> {
  const stale = await db().mutualRequest.findMany({
    where: { status: { in: ['active', 'waiting'] }, expiresAt: { lt: new Date() }, ...(senderId ? { senderId } : {}) },
  });
  for (const r of stale) {
    await db().mutualRequest.update({ where: { id: r.id }, data: { status: 'expired' } });
    await notify(r.senderId, 'mutual', 'request_expired', `Your private request for ${r.targetDisplay} expired after ${config.mutualRequestTtlDays} days.`, '/app/mutual');
  }
}

async function usedThisWindow(userId: string): Promise<number> {
  return db().mutualRequest.count({ where: { senderId: userId, createdAt: { gte: windowStart() } } });
}

async function activeMatchFor(userId: string) {
  return db().mutualMatch.findFirst({ where: { active: true, OR: [{ userAId: userId }, { userBId: userId }] } });
}

// ─── Search (exact first + last name; never a browse) ─────────────────────

export async function search(userId: string, firstName: string, lastName: string): Promise<MutualSearchResponse> {
  const first = normName(firstName);
  const last = normName(lastName);
  if (!first || !last) throw new ApiError(400, 'invalid_input', 'Enter both a first and last name.');

  const people = await db().profile.findMany({
    where: { firstNameNorm: first, lastNameNorm: last, userId: { not: userId }, age: { gte: config.minAge }, user: { dormant: false } },
    take: 10,
  });
  const mine = await db().mutualRequest.findMany({
    where: { senderId: userId, status: { in: ['active', 'waiting', 'matched'] }, targetId: { in: people.map((p) => p.userId) } },
  });

  // Record the search so the other person's anonymous "searches" counter grows
  // (at most once per searcher per person per day).
  const since = new Date(Date.now() - DAY_MS);
  if (people.length === 0) {
    await db().mutualSearch.create({ data: { searcherId: userId, searchedName: `${firstName.trim()} ${lastName.trim()}`, firstNorm: first, lastNorm: last } });
  }
  for (const p of people) {
    const recent = await db().mutualSearch.findFirst({ where: { searcherId: userId, matchedUserId: p.userId, createdAt: { gte: since } } });
    if (!recent) {
      await db().mutualSearch.create({
        data: { searcherId: userId, searchedName: `${p.firstName} ${p.lastName}`, firstNorm: first, lastNorm: last, matchedUserId: p.userId },
      });
    }
  }

  return {
    query: { firstName: firstName.trim(), lastName: lastName.trim() },
    results: people.map((p) => ({
      id: p.userId,
      firstName: p.firstName,
      lastName: p.lastName,
      age: p.age,
      avatarHue: p.avatarHue,
      taken: p.taken,
      alreadyRequested: mine.some((r) => r.targetId === p.userId),
    })),
    canSaveForJoin: people.length === 0,
  };
}

// ─── Secret Partner Up ─────────────────────────────────────────────────────

async function assertCanSend(userId: string): Promise<void> {
  const me = await myProfile(userId);
  if (me.taken) throw new ApiError(409, 'taken', 'You’re in an active match. End it first to send new requests.');
  if ((await usedThisWindow(userId)) >= config.mutualRequestLimit) {
    throw new ApiError(429, 'limit', `You’ve used all ${config.mutualRequestLimit} requests for this ${config.mutualWindowDays}-day window.`);
  }
}

export async function partnerUp(userId: string, targetId: string): Promise<MutualPartnerUpResponse> {
  await expireRequests();
  if (targetId === userId) throw new ApiError(400, 'self', 'You can’t Partner Up with yourself.');
  const target = await db().profile.findUnique({ where: { userId: targetId }, include: { user: { select: { dormant: true } } } });
  if (!target || target.user.dormant || target.age < config.minAge) throw notFound('That person');
  if (target.taken) throw new ApiError(409, 'target_taken', `${target.firstName} is taken right now.`);

  const existing = await db().mutualRequest.findFirst({ where: { senderId: userId, targetId, status: { in: ['active', 'matched'] } } });
  if (existing?.status === 'matched') {
    const match = await activeMatchFor(userId);
    return { status: 'mutual', matchId: match?.id ?? null };
  }
  if (!existing) {
    await assertCanSend(userId);
    await db().mutualRequest.create({
      data: {
        senderId: userId,
        targetId,
        targetFirstNorm: target.firstNameNorm,
        targetLastNorm: target.lastNameNorm,
        targetDisplay: `${target.firstName} ${target.lastName}`,
        expiresAt: new Date(Date.now() + config.mutualRequestTtlDays * DAY_MS),
      },
    });
  }

  // Did they independently choose me too?
  const theirs = await db().mutualRequest.findFirst({ where: { senderId: targetId, targetId: userId, status: 'active', expiresAt: { gt: new Date() } } });
  if (!theirs) return { status: 'sent', matchId: null };
  const matchId = await createMatch(userId, targetId);
  return { status: 'mutual', matchId };
}

/** Save a private request for someone who hasn't joined yet (matched by exact name when they sign up). */
export async function saveForJoin(userId: string, firstName: string, lastName: string): Promise<MutualPartnerUpResponse> {
  const first = normName(firstName);
  const last = normName(lastName);
  if (!first || !last) throw new ApiError(400, 'invalid_input', 'Enter both a first and last name.');
  const exists = await db().profile.findFirst({ where: { firstNameNorm: first, lastNameNorm: last, userId: { not: userId } } });
  if (exists) throw new ApiError(409, 'exists', 'That person is already on Partner Up — search for them instead.');
  const dup = await db().mutualRequest.findFirst({ where: { senderId: userId, targetId: null, targetFirstNorm: first, targetLastNorm: last, status: 'waiting' } });
  if (dup) return { status: 'saved_for_join', matchId: null };
  await assertCanSend(userId);
  await db().mutualRequest.create({
    data: {
      senderId: userId,
      targetFirstNorm: first,
      targetLastNorm: last,
      targetDisplay: `${firstName.trim()} ${lastName.trim()}`,
      status: 'waiting',
      expiresAt: new Date(Date.now() + config.mutualRequestTtlDays * DAY_MS),
    },
  });
  return { status: 'saved_for_join', matchId: null };
}

async function createMatch(a: string, b: string): Promise<string> {
  const now = Date.now();
  const match = await db().$transaction(async (tx) => {
    await tx.mutualRequest.updateMany({
      where: { OR: [{ senderId: a, targetId: b }, { senderId: b, targetId: a }], status: 'active' },
      data: { status: 'matched' },
    });
    await tx.profile.updateMany({ where: { userId: { in: [a, b] } }, data: { taken: true } });
    return tx.mutualMatch.create({ data: { userAId: a, userBId: b, earliestEndAt: new Date(now + config.mutualEndAfterHours * HOUR_MS) } });
  });
  const [pa, pb] = await Promise.all([db().profile.findUnique({ where: { userId: a } }), db().profile.findUnique({ where: { userId: b } })]);
  await notify(a, 'mutual', 'matched', `It’s mutual! You and ${pb?.firstName ?? 'they'} chose each other. Contact info is now visible.`, '/app/mutual');
  await notify(b, 'mutual', 'matched', `It’s mutual! You and ${pa?.firstName ?? 'they'} chose each other. Contact info is now visible.`, '/app/mutual');
  return match.id;
}

export async function withdraw(userId: string, requestId: string): Promise<{ ok: true }> {
  const request = await db().mutualRequest.findUnique({ where: { id: requestId } });
  if (!request || request.senderId !== userId) throw notFound('That request');
  if (request.status === 'active' || request.status === 'waiting') {
    await db().mutualRequest.update({ where: { id: requestId }, data: { status: 'withdrawn' } });
  }
  return { ok: true };
}

export async function endMatch(userId: string, matchId: string): Promise<{ ok: true }> {
  const match = await db().mutualMatch.findUnique({ where: { id: matchId } });
  if (!match || (match.userAId !== userId && match.userBId !== userId) || !match.active) throw notFound('That match');
  if (match.earliestEndAt.getTime() > Date.now()) {
    throw new ApiError(409, 'too_soon', `Matches can be ended after ${config.mutualEndAfterHours} hours.`);
  }
  await db().$transaction([
    db().mutualMatch.update({ where: { id: matchId }, data: { active: false, endedAt: new Date() } }),
    db().profile.updateMany({ where: { userId: { in: [match.userAId, match.userBId] } }, data: { taken: false } }),
    db().mutualRequest.updateMany({
      where: { OR: [{ senderId: match.userAId, targetId: match.userBId }, { senderId: match.userBId, targetId: match.userAId }], status: 'matched' },
      data: { status: 'ended' },
    }),
  ]);
  const other = match.userAId === userId ? match.userBId : match.userAId;
  await notify(other, 'mutual', 'match_ended', 'Your Mutual match has ended. You’re available again.', '/app/mutual');
  return { ok: true };
}

// ─── Overview (Partner Pulse, limits, history, current match) ──────────────

function toSent(r: RequestRow & { target: { profile: { avatarHue: number } | null } | null }): MutualSentRequest {
  const status: MutualRequestStatus = (['active', 'waiting', 'matched', 'expired', 'ended', 'withdrawn'] as const).includes(r.status as MutualRequestStatus)
    ? (r.status as MutualRequestStatus)
    : 'active';
  return {
    id: r.id,
    targetName: r.targetDisplay,
    avatarHue: r.target?.profile?.avatarHue ?? null,
    status,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
  };
}

async function matchView(userId: string): Promise<MutualMatchView | null> {
  const match = await activeMatchFor(userId);
  if (!match) return null;
  const otherId = match.userAId === userId ? match.userBId : match.userAId;
  const [other, me] = await Promise.all([db().profile.findUnique({ where: { userId: otherId } }), db().profile.findUnique({ where: { userId } })]);
  if (!other || !me) return null;
  return {
    id: match.id,
    partner: { firstName: other.firstName, lastName: other.lastName, age: other.age, avatarHue: other.avatarHue },
    // Only the contact info each person chose to provide, only after it's mutual.
    contacts: { phone: other.phone, instagram: other.instagram },
    myContacts: { phone: me.phone, instagram: me.instagram },
    matchedAt: match.matchedAt.toISOString(),
    canEndAt: match.earliestEndAt.toISOString(),
    canEnd: match.earliestEndAt.getTime() <= Date.now(),
  };
}

export async function overview(userId: string): Promise<MutualOverview> {
  await expireRequests(userId);
  const me = await myProfile(userId);
  const monthAgo = new Date(Date.now() - 30 * DAY_MS);
  const [searchesThisMonth, privatelyChoseYou, used, sent, match] = await Promise.all([
    db().mutualSearch.count({ where: { matchedUserId: userId, createdAt: { gte: monthAgo } } }),
    db().mutualRequest.count({ where: { targetId: userId, status: 'active', expiresAt: { gt: new Date() } } }),
    usedThisWindow(userId),
    db().mutualRequest.findMany({ where: { senderId: userId }, orderBy: { createdAt: 'desc' }, take: 30, include: { target: { select: { profile: { select: { avatarHue: true } } } } } }),
    matchView(userId),
  ]);
  const views = sent.map(toSent);
  return {
    pulse: { searchesThisMonth, privatelyChoseYou },
    limits: {
      used,
      limit: config.mutualRequestLimit,
      remaining: Math.max(0, config.mutualRequestLimit - used),
      windowDays: config.mutualWindowDays,
      requestTtlDays: config.mutualRequestTtlDays,
    },
    active: views.filter((v) => v.status === 'active' || v.status === 'waiting'),
    history: views.filter((v) => v.status !== 'active' && v.status !== 'waiting'),
    match,
    taken: me.taken,
  };
}

// ─── When someone new joins ────────────────────────────────────────────────

/** Attach name-saved requests to a newly created profile — without revealing who sent them. */
export async function onProfileCreated(userId: string, firstNorm: string, lastNorm: string): Promise<void> {
  const waiting = await db().mutualRequest.findMany({
    where: { targetId: null, targetFirstNorm: firstNorm, targetLastNorm: lastNorm, status: 'waiting', expiresAt: { gt: new Date() } },
  });
  for (const r of waiting) {
    if (r.senderId === userId) continue;
    await db().mutualRequest.update({ where: { id: r.id }, data: { targetId: userId, status: 'active' } });
    await notify(r.senderId, 'mutual', 'joined', `${r.targetDisplay} just joined Partner Up. Your private request is now waiting for them.`, '/app/mutual');
  }
  if (waiting.some((r) => r.senderId !== userId)) {
    await notify(userId, 'mutual', 'pulse', 'Someone on Partner Up was already hoping you’d join. If you choose them too, you’ll both find out.', '/app/mutual');
  }
  const searchers = await db().mutualSearch.findMany({ where: { matchedUserId: null, firstNorm, lastNorm, notifiedJoin: false, searcherId: { not: userId } } });
  const notified = new Set(waiting.map((r) => r.senderId));
  for (const s of searchers) {
    await db().mutualSearch.update({ where: { id: s.id }, data: { notifiedJoin: true, matchedUserId: userId } });
    if (notified.has(s.searcherId)) continue;
    notified.add(s.searcherId);
    await notify(s.searcherId, 'mutual', 'joined', `Someone you searched for (${s.searchedName}) just joined Partner Up.`, '/app/mutual');
  }
}
