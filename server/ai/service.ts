// Muse service layer — the only entry point Scout uses for AI.
//
// Contract:
//   • Muse UNDERSTANDS language and WRITES short explanations from given facts.
//   • The deterministic engine SCORES. Muse never produces a score.
//   • Every function returns { value, source } and falls back to deterministic
//     logic on ANY failure (missing key, timeout, rate limit, bad JSON), so the
//     live demo never breaks — and the UI can honestly label offline results.

import type { AiSource, DnaPatch, ScoutIntent, TimeSlot } from '../../shared/types';
import { listToSentence } from '../../shared/labels';
import { config } from '../config';
import { CONCEPT_BY_ID } from '../semantic/ontology';
import { canonicalize, conceptLabel, conceptSimilarity } from '../semantic/similarity';
import { MuseProvider } from './muse';
import { extractProfileOffline, parseIntentOffline } from './offline';
import type { AIProvider, GroupFacts, GroupMemberFacts, IntentExtraction, ProfileExtraction } from './provider';

export interface Sourced<T> {
  value: T;
  source: AiSource;
}

let provider: AIProvider | null | undefined;
function getProvider(): AIProvider | null {
  if (provider === undefined) provider = config.museEnabled ? new MuseProvider() : null;
  return provider;
}

/** For tests: inject a provider (or null to force offline). */
export function setAIProviderForTesting(p: AIProvider | null): void {
  provider = p;
}

export function museStatus(): { configured: boolean } {
  return { configured: getProvider() !== null };
}

const cache = new Map<string, unknown>();
function remember<T>(key: string, value: T): T {
  if (cache.size > 400) cache.delete(cache.keys().next().value as string);
  cache.set(key, value);
  return value;
}

async function attempt<T>(task: string, key: string, run: (p: AIProvider) => Promise<T>): Promise<T | null> {
  const p = getProvider();
  if (!p) return null;
  const cacheKey = `${task}:${key}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) as T;
  try {
    return remember(cacheKey, await run(p));
  } catch (error) {
    // Log the reason only — never the key or user text.
    console.warn(`[muse] ${task} → offline fallback (${error instanceof Error ? error.message : 'error'})`);
    return null;
  }
}

// ─── Canonicalisation (Muse output → our concept vocabulary) ───────────────

function tidy(items: string[], max = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const text = raw.replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!text) continue;
    const id = canonicalize(text);
    const labelText = CONCEPT_BY_ID.has(id) ? conceptLabel(id) : capitalize(text);
    const key = (id || text).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(labelText);
    if (out.length >= max) break;
  }
  return out;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const SLOTS: TimeSlot[] = ['mornings', 'afternoons', 'evenings', 'late_nights', 'weekdays', 'weekends'];

function toPatch(p: Partial<ProfileExtraction> | null | undefined): DnaPatch {
  if (!p) return {};
  const patch: DnaPatch = {};
  const lists = ['interests', 'skills', 'learning', 'goals', 'needs', 'offers', 'preferences', 'languages'] as const;
  for (const key of lists) {
    const v = tidy(p[key] ?? []);
    if (v.length) patch[key] = v;
  }
  const slots = (p.availability ?? []).filter((s): s is TimeSlot => SLOTS.includes(s));
  if (slots.length) patch.availability = [...new Set(slots)];
  if (p.location && p.location.trim()) patch.location = p.location.trim().slice(0, 60);
  return patch;
}

// ─── 1. Profile extraction → Partner DNA ───────────────────────────────────

export async function extractProfile(rawText: string): Promise<Sourced<DnaPatch>> {
  const out = await attempt('extractProfile', rawText, (p) => p.extractProfile(rawText));
  if (out) {
    const patch = toPatch(out);
    if (Object.keys(patch).length) return { value: patch, source: 'muse' };
  }
  return { value: toPatch(extractProfileOffline(rawText)), source: 'offline' };
}

// ─── 2. Intent parsing ─────────────────────────────────────────────────────

function toIntent(out: IntentExtraction): { intent: ScoutIntent; aboutMe: DnaPatch } {
  const intent: ScoutIntent = {
    summary: out.summary.trim().slice(0, 160),
    category: out.category.trim().slice(0, 40) || 'New friends',
    lens: out.lens,
    neededSkills: tidy(out.needed_skills, 8),
    interests: tidy(out.interests, 8),
    learningNeeds: tidy(out.learning_needs, 8),
    offers: tidy(out.offers, 8),
    location: out.location?.trim().slice(0, 60) || null,
    context: out.context?.trim().slice(0, 60) || null,
    groupSize: out.group_size,
    availability: out.availability.filter((s): s is TimeSlot => SLOTS.includes(s)),
    languages: tidy(out.languages, 6),
  };
  return { intent, aboutMe: toPatch(out.about_me) };
}

export async function parseGroupIntent(rawText: string): Promise<Sourced<{ intent: ScoutIntent; aboutMe: DnaPatch }>> {
  const offline = toIntent(parseIntentOffline(rawText));
  const out = await attempt('parseGroupIntent', rawText, (p) => p.parseGroupIntent(rawText));
  if (out) {
    const parsed = toIntent(out);
    const i = parsed.intent;
    // Safety net: an AI intent with nothing to match on isn't usable.
    const usable = i.neededSkills.length + i.interests.length + i.learningNeeds.length > 0 || Boolean(i.location) || Boolean(i.category);
    if (usable) {
      // Keep deterministic signals the model may drop (times, city, group size).
      i.availability = i.availability.length ? i.availability : offline.intent.availability;
      i.location = i.location ?? offline.intent.location;
      i.groupSize = i.groupSize ?? offline.intent.groupSize;
      i.summary = i.summary || offline.intent.summary;
      return { value: parsed, source: 'muse' };
    }
  }
  return { value: offline, source: 'offline' };
}

// ─── 3. Semantic similarity ────────────────────────────────────────────────

/** Deterministic ontology similarity; Muse is consulted only for unknown phrases. */
export async function analyzeSemanticSimilarity(a: string, b: string): Promise<Sourced<number>> {
  const ca = canonicalize(a);
  const cb = canonicalize(b);
  const known = conceptSimilarity(ca, cb);
  const bothKnown = CONCEPT_BY_ID.has(ca) && CONCEPT_BY_ID.has(cb);
  if (known > 0 || bothKnown) return { value: known, source: 'offline' };
  const out = await attempt('similarity', `${ca}|${cb}`, (p) => p.analyzeSemanticSimilarity(a, b));
  return out === null ? { value: known, source: 'offline' } : { value: Math.max(0, Math.min(1, out)), source: 'muse' };
}

// ─── 4 & 5. Group explanation + summary ────────────────────────────────────

function templateExplanation(members: GroupMemberFacts[], sharedTraits: string[]): string {
  if (members.every((m) => m.skills.length === 0)) {
    // A social group (Explore): when they're free and what they share, not what they can build.
    const [first, ...rest] = members.map((m) => m.availability ?? []);
    const slot = (first ?? []).find((x) => rest.every((r) => r.length === 0 || r.includes(x)));
    const parts = [
      slot && `everyone’s free ${slot.toLowerCase()}`,
      sharedTraits.length && `the group overlaps on ${listToSentence(sharedTraits.slice(0, 3)).toLowerCase()}`,
    ].filter((x): x is string => Boolean(x));
    return parts.length ? `${capitalize(parts.join(', and '))}.` : 'These people are up for the same plans you are.';
  }
  const skills = [...new Set(members.flatMap((m) => m.contributes))].slice(0, 4);
  const shared = sharedTraits.slice(0, 2);
  if (shared.length && skills.length) return `This group shares an interest in ${listToSentence(shared)} and covers ${listToSentence(skills)} between them.`;
  if (skills.length) return `Between them, this group covers ${listToSentence(skills)}.`;
  if (shared.length) return `This group shares an interest in ${listToSentence(shared)}.`;
  return 'These people line up with what you asked for.';
}

function templateSummary(group: GroupFacts): string {
  if (group.members.every((m) => m.skills.length === 0)) {
    const into = group.members.filter((m) => !m.isYou && m.contributes.length).map((m) => `${m.name} is into ${listToSentence(m.contributes).toLowerCase()}`);
    return into.length ? `${listToSentence(into)}.` : templateExplanation(group.members, group.sharedTraits);
  }
  const parts = group.members
    .filter((m) => m.contributes.length)
    .map((m) => `${m.isYou ? 'you bring' : `${m.name} brings`} ${listToSentence(m.contributes.slice(0, 2))}`);
  const first = parts.length ? `${capitalize(listToSentence(parts))}.` : '';
  const missing = group.missing.length ? ` Still missing: ${listToSentence(group.missing)}.` : '';
  return (first + missing).trim() || templateExplanation(group.members, group.sharedTraits);
}

export async function generateGroupExplanation(members: GroupMemberFacts[], sharedTraits: string[]): Promise<Sourced<string>> {
  const out = await attempt('groupExplanation', JSON.stringify({ members, sharedTraits }), (p) => p.generateGroupExplanation(members, sharedTraits));
  return out?.trim() ? { value: out.trim().slice(0, 400), source: 'muse' } : { value: templateExplanation(members, sharedTraits), source: 'offline' };
}

export async function generateGroupSummary(group: GroupFacts): Promise<Sourced<string>> {
  const out = await attempt('groupSummary', JSON.stringify(group), (p) => p.generateGroupSummary(group));
  return out?.trim() ? { value: out.trim().slice(0, 400), source: 'muse' } : { value: templateSummary(group), source: 'offline' };
}

// ─── Muse's short conversational replies ───────────────────────────────────

export async function museReply(situation: string, facts: Record<string, unknown>, fallback: string): Promise<Sourced<string>> {
  const out = await attempt('reply', `${situation}:${JSON.stringify(facts)}`, (p) => p.reply(situation, facts));
  return out?.trim() ? { value: out.trim().slice(0, 300), source: 'muse' } : { value: fallback, source: 'offline' };
}
