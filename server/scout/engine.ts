// Scout matching engine — deterministic and explainable.
// Muse turns language into a ScoutIntent; THIS file decides who fits and why.
// Every number comes from the weighted dimensions below (spec §3), never from AI.

import type { PartnerDNA, ScoutIntent, ScoutLens, ScoutPerson, ScoutReason, TimeSlot } from '../../shared/types';
import { TIME_SLOT_LABELS, listToSentence } from '../../shared/labels';
import { availabilityOverlap, availabilityScore } from '../matching/availability';
import { bestMatch, canonicalize, canonicalizeAll, commonConcept, conceptLabel, coverage, extractConcepts, softOverlap } from '../semantic/similarity';
import { locationFit, resolveLocation, type Place } from './location';

export const WEIGHTS: Record<ScoutLens, Array<{ key: string; label: string; weight: number }>> = {
  connect: [
    { key: 'interests', label: 'Shared interests', weight: 0.35 },
    { key: 'goals', label: 'Shared goals', weight: 0.25 },
    { key: 'availability', label: 'Availability', weight: 0.2 },
    { key: 'social', label: 'Social / activity fit', weight: 0.1 },
    { key: 'complementary', label: 'Complementary traits', weight: 0.1 },
  ],
  learn: [
    { key: 'coverage', label: 'Strength → weakness coverage', weight: 0.4 },
    { key: 'mutual', label: 'Mutual learning benefit', weight: 0.25 },
    { key: 'availability', label: 'Availability', weight: 0.15 },
    { key: 'preferences', label: 'Learning preferences', weight: 0.1 },
    { key: 'context', label: 'Shared academic context', weight: 0.1 },
  ],
  explore: [
    { key: 'location', label: 'Location relevance', weight: 0.3 },
    { key: 'interests', label: 'Shared interests', weight: 0.25 },
    { key: 'intent', label: 'Mutual intent', weight: 0.2 },
    { key: 'availability', label: 'Availability', weight: 0.15 },
    { key: 'language', label: 'Language compatibility', weight: 0.1 },
  ],
};

const STRONG = 0.75;
const EXPLORE_WANTS = ['explore-city', 'meet-internationals', 'show-around', 'local-friend', 'make-friends', 'cultural-exchange'];

/** Everything the engine knows about one person (from Partner DNA + their active Scout requests). */
export interface ScoutProfile {
  userId: string;
  firstName: string;
  age: number | null;
  avatarHue: number;
  isDemoPersona: boolean;
  dna: PartnerDNA;
  intents: ScoutIntent[];
}

interface Canon {
  skills: string[];
  interests: string[];
  learning: string[];
  wants: string[];
  prefs: string[];
  languages: string[];
  place: Place | null;
  availability: TimeSlot[];
}

function canonOf(p: ScoutProfile): Canon {
  const d = p.dna;
  return {
    skills: canonicalizeAll([...d.skills, ...d.offers]),
    interests: canonicalizeAll([...d.interests, ...p.intents.flatMap((i) => i.interests)]),
    learning: canonicalizeAll([...d.learning, ...p.intents.flatMap((i) => i.learningNeeds)]),
    wants: [...new Set([...canonicalizeAll([...d.goals, ...d.needs, ...p.intents.map((i) => i.category)]), ...p.intents.flatMap((i) => extractConcepts(i.summary))])],
    prefs: canonicalizeAll(d.preferences),
    languages: canonicalizeAll(d.languages),
    place: resolveLocation(d.location),
    availability: d.availability,
  };
}

export function personView(p: ScoutProfile): ScoutPerson {
  const roles = (p.dna.skills.length ? p.dna.skills : p.dna.interests).slice(0, 2);
  return {
    id: p.userId,
    firstName: p.firstName,
    age: p.age,
    location: p.dna.location,
    avatarHue: p.avatarHue,
    isDemoPersona: p.isDemoPersona,
    roles,
  };
}

export interface ScoreResult {
  score: number;
  dimensions: Array<{ key: string; label: string; weight: number; score: number }>;
  reasons: ScoutReason[];
  caveats: string[];
  /** Why the OTHER person would want this (shown on their side of a connection). */
  reasonsForThem: ScoutReason[];
  theyAreLookingFor: string | null;
  gatesApplied: string[];
}

function labels(ids: string[], max = 3): string {
  return listToSentence(ids.slice(0, max).map((id) => conceptLabel(id)));
}

function strongHits(wanted: string[], pool: string[]): Array<{ want: string; by: string }> {
  const out: Array<{ want: string; by: string }> = [];
  for (const want of wanted) {
    const m = bestMatch(want, pool);
    if (m.match && m.score >= STRONG) out.push({ want, by: m.match });
  }
  return out;
}

function sharedInterests(focus: string[], mine: string[], theirs: string[]): { score: number; shared: string[] } {
  const base = softOverlap(mine, theirs, { categoryCredit: 0.2 });
  const focusCov = coverage(focus, theirs, { categoryCredit: 0.2 });
  const score = focusCov === null ? base.score : 0.7 * focusCov + 0.3 * base.score;
  const display = softOverlap([...new Set([...focus, ...mine])], theirs, { minPairScore: STRONG });
  const shared: string[] = [];
  for (const pair of display.pairs) {
    const c = commonConcept(pair.a, pair.b);
    if (c && !shared.includes(c)) shared.push(c);
  }
  // Put what they asked about first.
  shared.sort((x, y) => Number(!focus.includes(x)) - Number(!focus.includes(y)));
  return { score, shared };
}

function slotsText(slots: TimeSlot[]): string {
  return listToSentence(slots.map((s) => TIME_SLOT_LABELS[s].toLowerCase()));
}

/** Their active request most related to what I asked for (for "they're looking for…"). */
function relatedIntent(category: string, them: ScoutProfile): ScoutIntent | null {
  let best: { intent: ScoutIntent; score: number } | null = null;
  for (const intent of them.intents) {
    const score = bestMatch(category, [canonicalize(intent.category), ...extractConcepts(intent.summary)]).score;
    if (!best || score > best.score) best = { intent, score };
  }
  return best && best.score >= 0.55 ? best.intent : null;
}

/**
 * Score candidate `them` for requester `me` asking `intent`.
 * score = round(100 · Σ weight·dimension · gates), clamped 1–99.
 * Gates: a hard location request that isn't met, or a required skill the
 * candidate doesn't list, scale the score down (and are shown as caveats).
 */
export function scoreCandidate(me: ScoutProfile, intent: ScoutIntent, them: ScoutProfile): ScoreResult {
  const A = canonOf(me);
  const B = canonOf(them);
  const name = them.firstName;
  const focus = canonicalizeAll(intent.interests);
  const need = canonicalizeAll(intent.neededSkills);
  const learning = canonicalizeAll(intent.learningNeeds.length ? intent.learningNeeds : intent.lens === 'learn' ? me.dna.learning : []);
  const category = canonicalize(intent.category);
  const myInterests = [...new Set([...focus, ...A.interests])];
  const requestedPlace = resolveLocation(intent.location);
  const myAvailability = intent.availability.length ? intent.availability : A.availability;
  const avail = availabilityScore(myAvailability, B.availability, intent.availability.length > 0);
  const overlapSlots = availabilityOverlap(myAvailability, B.availability);

  const reasons: ScoutReason[] = [];
  const reasonsForThem: ScoutReason[] = [];
  const caveats: string[] = [];
  const gates: string[] = [];
  const s: Record<string, number> = {};
  let gate = 1;

  const theirIntent = category ? relatedIntent(category, them) : null;
  const goalFit = category ? Math.max(bestMatch(category, B.wants).score, theirIntent ? 1 : 0) : 0.5;

  if (intent.lens === 'learn') {
    const aGets = coverage(learning, B.skills);
    const bGetsRaw = coverage(B.learning, A.skills);
    const bGets = bGetsRaw ?? 0.3;
    s.coverage = aGets ?? 0.4;
    s.mutual = Math.sqrt((aGets ?? 0.4) * bGets);
    s.availability = avail;
    const prefs = A.prefs.length && B.prefs.length ? softOverlap(A.prefs, B.prefs, { target: 2 }).score : 0.5;
    s.preferences = prefs;
    const ctx = locationFit(requestedPlace ?? A.place, B.place);
    s.context = ctx ?? 0.3;
    for (const hit of strongHits(learning, B.skills).slice(0, 2)) {
      reasons.push({ kind: 'learning', text: `${name} is strong in ${conceptLabel(hit.by)} — what you need help with.` });
    }
    const youHelp = strongHits(B.learning, A.skills);
    for (const hit of youHelp.slice(0, 2)) {
      reasons.push({ kind: 'learning', text: `You can help ${name} with ${conceptLabel(hit.want)} in return.` });
      reasonsForThem.push({ kind: 'learning', text: `${me.firstName} is strong in ${conceptLabel(hit.by)} — something you're learning.` });
    }
    if (learning.length && !strongHits(learning, B.skills).length) caveats.push(`${name} doesn't list ${labels(learning, 2)} as a strength.`);
  } else if (intent.lens === 'explore') {
    const loc = locationFit(requestedPlace ?? A.place, B.place);
    s.location = loc ?? 0.3;
    const si = sharedInterests(focus, myInterests, B.interests);
    s.interests = si.score;
    const wantsExplore = Math.max(...EXPLORE_WANTS.map((w) => bestMatch(w, B.wants).score), 0);
    s.intent = Math.max(wantsExplore, goalFit * 0.8);
    s.availability = avail;
    const sharedLang = A.languages.length && B.languages.length ? (A.languages.some((l) => B.languages.includes(l)) ? 1 : 0) : 0.6;
    s.language = sharedLang;
    if (loc !== null && loc >= 0.8 && B.place) reasons.push({ kind: 'location', text: `${name} is in ${B.place.label}${requestedPlace && requestedPlace.label !== B.place.label ? ` (${requestedPlace.label})` : ''}.` });
    if (wantsExplore >= STRONG) reasons.push({ kind: 'intent', text: theirIntent ? `${name} is also looking to ${theirIntent.summary.charAt(0).toLowerCase()}${theirIntent.summary.slice(1)}.` : `${name} wants to explore and meet new people too.` });
    if (si.shared.length) reasons.push({ kind: 'shared', text: `You both like ${labels(si.shared)}.` });
    if (sharedLang === 1) {
      const common = A.languages.find((l) => B.languages.includes(l));
      if (common) reasons.push({ kind: 'language', text: `You both speak ${conceptLabel(common)}.` });
    }
    if (requestedPlace && (loc ?? 0) < 0.6) {
      gate *= 0.5;
      gates.push('location');
      caveats.push(`${name} isn't in ${requestedPlace.label}.`);
    }
  } else {
    const si = sharedInterests(focus, myInterests, B.interests);
    s.interests = si.score;
    s.goals = goalFit;
    s.availability = avail;
    s.social = A.prefs.length && B.prefs.length ? softOverlap(A.prefs, B.prefs, { target: 2 }).score : 0.5;
    const needCov = coverage(need, B.skills);
    const theyNeedMe = coverage(canonicalizeAll(them.intents.flatMap((i) => i.neededSkills)), A.skills);
    s.complementary = needCov ?? theyNeedMe ?? 0.5;

    const skillHits = strongHits(need, B.skills);
    if (theirIntent && goalFit >= STRONG) {
      const summary = theirIntent.summary.replace(/\.$/, '');
      reasons.push({ kind: 'intent', text: `${name} is looking for ${summary.charAt(0).toLowerCase()}${summary.slice(1)}.` });
    } else if (goalFit >= STRONG && category) {
      reasons.push({ kind: 'intent', text: `${name} is also looking for ${conceptLabel(category).toLowerCase()}.` });
    }
    if (need.length) reasons.push({ kind: 'need', text: `You need ${labels(need)}.` });
    if (skillHits.length) reasons.push({ kind: 'need', text: `${name} has ${labels(skillHits.map((h) => h.by))} experience.` });
    if (si.shared.length) reasons.push({ kind: 'shared', text: `You both mentioned ${labels(si.shared).toLowerCase()}.` });
    const prefHits = A.prefs.filter((p) => B.prefs.includes(p));
    if (prefHits.length) reasons.push({ kind: 'shared', text: `Similar preferences: ${labels(prefHits).toLowerCase()}.` });

    if (need.length && (needCov ?? 0) < 0.5) {
      gate *= 0.6;
      gates.push('skills');
      caveats.push(`${name} doesn't list ${labels(need, 2)}.`);
    }
    if (requestedPlace) {
      const fit = locationFit(requestedPlace, B.place);
      if (fit === null) {
        gate *= 0.75;
        caveats.push(`${name} hasn't shared where they are.`);
      } else if (fit < 1) {
        gate *= 0.5 + 0.5 * fit;
        gates.push('location');
        caveats.push(`${name} is at ${B.place?.label ?? 'another location'}, not ${requestedPlace.label}.`);
      } else if (B.place) {
        reasons.push({ kind: 'location', text: `${name} is at ${B.place.label} too.` });
      }
    }
    reasonsForThem.push({ kind: 'intent', text: `${me.firstName} is looking for ${intent.summary.charAt(0).toLowerCase()}${intent.summary.slice(1).replace(/\.$/, '')}.` });
    if (skillHits.length) reasonsForThem.push({ kind: 'need', text: `They need ${labels(skillHits.map((h) => h.want))} — which you list.` });
    if (si.shared.length) reasonsForThem.push({ kind: 'shared', text: `You both mentioned ${labels(si.shared).toLowerCase()}.` });
  }

  if (avail >= 0.6 && overlapSlots.length) reasons.push({ kind: 'availability', text: `Your availability overlaps (${slotsText(overlapSlots)}).` });
  else if (avail < 0.35 && myAvailability.length && B.availability.length) caveats.push('Your schedules don’t overlap much.');
  if (reasonsForThem.length === 0) reasonsForThem.push({ kind: 'intent', text: `${me.firstName} is looking for ${intent.summary.charAt(0).toLowerCase()}${intent.summary.slice(1).replace(/\.$/, '')}.` });
  if (avail >= 0.6 && overlapSlots.length) reasonsForThem.push({ kind: 'availability', text: `Your availability overlaps (${slotsText(overlapSlots)}).` });

  const dims = WEIGHTS[intent.lens].map((d) => ({ ...d, score: Math.round(Math.max(0, Math.min(1, s[d.key] ?? 0)) * 100) / 100 }));
  const total = dims.reduce((sum, d) => sum + d.weight * d.score, 0) * gate;

  return {
    score: Math.max(1, Math.min(99, Math.round(total * 100))),
    dimensions: dims,
    reasons: reasons.slice(0, 5),
    caveats: caveats.slice(0, 2),
    reasonsForThem: reasonsForThem.slice(0, 4),
    theyAreLookingFor: theirIntent?.summary ?? null,
    gatesApplied: gates,
  };
}

/** What a member brings to a group, strictly from their Partner DNA. */
export function contributions(p: ScoutProfile, wanted: string[]): string[] {
  const skills = canonicalizeAll([...p.dna.skills, ...p.dna.offers]);
  const hits = strongHits(wanted, skills).map((h) => conceptLabel(h.by));
  const extra = p.dna.skills.filter((s) => !hits.some((h) => h.toLowerCase() === s.toLowerCase()));
  return [...new Set([...hits, ...extra])].slice(0, 2);
}

export { canonOf };
