// Group assembly for Scout ("find me a 4-person hackathon team", "a Calc II
// study group", "people to explore Atlanta with this weekend").
// Greedy and deterministic: good groups of 2–5 don't need a solver.

import type { ScoutIntent, TimeSlot } from '../../shared/types';
import { bestMatch, canonicalizeAll, commonConcept, conceptLabel, toTag } from '../semantic/similarity';
import { canonOf, contributions, scoreCandidate, type ScoreResult, type ScoutProfile } from './engine';

const STRONG = 0.75;

export interface GroupPick {
  members: Array<{ profile: ScoutProfile; result: ScoreResult }>;
  score: number;
  covered: string[];
  missing: string[];
  sharedTraits: string[];
  wanted: string[];
}

export function commonSlots(people: ScoutProfile[]): TimeSlot[] {
  const [first, ...rest] = people.map((p) => p.dna.availability);
  if (!first) return [];
  return first.filter((slot) => rest.every((slots) => slots.length === 0 || slots.includes(slot)));
}

function groupValue(me: ScoutProfile, picks: Array<{ profile: ScoutProfile; result: ScoreResult }>, wanted: string[], lens: ScoutIntent['lens']): number {
  const meanFit = picks.reduce((s, p) => s + p.result.score / 100, 0) / picks.length;
  const pool = [...new Set([...canonOf(me).skills, ...picks.flatMap((p) => canonOf(p.profile).skills)])];
  let coverage: number;
  if (lens === 'explore') {
    // Social plans: reward people who actually want to go out and explore, not a mix of skills.
    coverage = picks.reduce((s, p) => s + (p.result.dimensions.find((d) => d.key === 'intent')?.score ?? 0), 0) / picks.length;
  } else if (wanted.length) {
    coverage = wanted.reduce((s, w) => s + bestMatch(w, pool).score, 0) / wanted.length;
  } else {
    // No specific skills asked for: reward a varied mix of primary roles.
    const roles = new Set(picks.map((p) => canonicalizeAll(p.profile.dna.skills)[0] ?? p.profile.userId));
    coverage = roles.size / picks.length;
  }
  const everyone = [me, ...picks.map((p) => p.profile)];
  const timing = commonSlots(everyone).length > 0 ? 1 : 0.4;
  return 0.5 * meanFit + 0.3 * coverage + 0.2 * timing;
}

export function assembleGroup(me: ScoutProfile, intent: ScoutIntent, candidates: ScoutProfile[], size: number): GroupPick | null {
  const wanted = canonicalizeAll(intent.lens === 'learn' ? [...intent.learningNeeds, ...intent.neededSkills] : intent.neededSkills);
  const scored = candidates
    .map((profile) => ({ profile, result: scoreCandidate(me, intent, profile) }))
    .filter((c) => c.result.score >= 40)
    .sort((a, b) => b.result.score - a.result.score || a.profile.userId.localeCompare(b.profile.userId))
    .slice(0, 15);
  if (scored.length === 0) return null;

  const picks: typeof scored = [];
  while (picks.length < size) {
    let best: { pick: (typeof scored)[number]; value: number } | null = null;
    for (const candidate of scored) {
      if (picks.includes(candidate)) continue;
      const value = groupValue(me, [...picks, candidate], wanted, intent.lens);
      if (!best || value > best.value + 1e-9) best = { pick: candidate, value };
    }
    if (!best) break;
    picks.push(best.pick);
  }

  const pool = [...new Set([...canonOf(me).skills, ...picks.flatMap((p) => canonOf(p.profile).skills)])];
  const covered = wanted.filter((w) => bestMatch(w, pool).score >= STRONG);
  const missing = wanted.filter((w) => !covered.includes(w));

  // Interests shared by at least two people in the group (you included).
  const everyone = [me, ...picks.map((p) => p.profile)];
  const counts = new Map<string, number>();
  for (const person of everyone) {
    const seen = new Set<string>();
    for (const interest of canonOf(person).interests) {
      for (const other of everyone) {
        if (other === person) continue;
        for (const theirs of canonOf(other).interests) {
          const c = commonConcept(interest, theirs);
          if (c) seen.add(c);
        }
      }
    }
    for (const c of seen) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const focus = canonicalizeAll(intent.interests);
  const sharedTraits = [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => Number(focus.includes(b[0])) - Number(focus.includes(a[0])) || b[1] - a[1])
    .map(([id]) => id)
    .slice(0, 3);

  return {
    members: picks,
    score: Math.round(groupValue(me, picks, wanted, intent.lens) * 100),
    covered,
    missing,
    sharedTraits,
    wanted,
  };
}

export function memberContributions(p: ScoutProfile, wanted: string[]): string[] {
  return contributions(p, wanted);
}

/** For a social group, what someone brings is what they're into — led by what the group shares. */
export function memberInterests(p: ScoutProfile, focus: string[]): string[] {
  const mine = canonOf(p).interests;
  const led = focus.filter((f) => mine.some((m) => commonConcept(f, m))).map(conceptLabel);
  return [...new Set([...led, ...p.dna.interests])].slice(0, 2);
}

export function tagsOf(ids: string[]) {
  return ids.map(toTag);
}

export function labelOf(id: string): string {
  return conceptLabel(id);
}
