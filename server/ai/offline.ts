// Deterministic language understanding — the fallback whenever Muse is off,
// slow, rate-limited or returns malformed output. It returns exactly the same
// shapes as the Muse provider, so callers never branch on the source. It only
// extracts things literally present in the text.

import type { TimeSlot } from '../../shared/types';
import { findLocationInText } from '../scout/location';
import { CONCEPT_BY_ID, type ConceptCategory } from '../semantic/ontology';
import { conceptLabel, extractConcepts, normalizeText } from '../semantic/similarity';
import type { IntentExtraction, ProfileExtraction } from './provider';

const cat = (id: string): ConceptCategory | undefined => CONCEPT_BY_ID.get(id)?.category;
const unique = <T>(xs: T[]) => [...new Set(xs)];
const label = conceptLabel;

const SKILL_CATS = new Set<ConceptCategory>(['tech', 'math', 'science', 'humanities']);
const INTEREST_CATS = new Set<ConceptCategory>(['game', 'sport', 'music', 'creative', 'food', 'outdoors', 'explore', 'tech', 'lifestyle']);
const PREFERENCE_IDS = new Set(['quiet', 'tidy', 'early-riser', 'night-owl', 'non-smoker', 'pet-friendly', 'social-home', 'small-groups', 'in-person', 'online']);
const CATEGORY_IDS = [
  'roommate', 'hackathon-team', 'startup-team', 'robotics-team', 'competition-team', 'project-partner', 'study-partner',
  'language-exchange', 'local-friend', 'explore-city', 'meet-internationals', 'gaming-buddy', 'watch-party', 'event-buddy', 'club',
];
const EXPLORE_IDS = new Set(['local-friend', 'explore-city', 'meet-internationals', 'show-around', 'cultural-exchange', 'newcomer']);

/** Split into clauses first (normalising would strip the separators), then normalise each. */
function clauses(text: string): string[] {
  return text
    .split(/[.;!?,]|\bbut\b|\bwhile\b|\balthough\b|\bthough\b/i)
    .map((c) => normalizeText(c))
    .filter(Boolean);
}

export function detectAvailability(text: string): TimeSlot[] {
  const t = normalizeText(text);
  const slots: TimeSlot[] = [];
  if (/\b(night|nights|tonight|late|night owl)\b/.test(t)) slots.push('evenings', 'late_nights');
  if (/\b(evening|evenings|after class|after classes|after work|weeknights?)\b/.test(t)) slots.push('evenings');
  if (/\b(morning|mornings|early bird)\b/.test(t)) slots.push('mornings');
  if (/\b(afternoon|afternoons)\b/.test(t)) slots.push('afternoons');
  if (/\b(weekend|weekends|saturday|saturdays|sunday|sundays)\b/.test(t)) slots.push('weekends');
  if (/\b(weekday|weekdays)\b/.test(t)) slots.push('weekdays');
  return unique(slots);
}

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const toNum = (w: string) => NUMBER_WORDS[w] ?? Number(w);

/** Number of OTHER people wanted, or null for "someone". */
export function detectGroupSize(text: string): number | null {
  const t = normalizeText(text);
  const team = t.match(/\b(\d|two|three|four|five|six)[ -]?(?:person|people|member)s?(?: [a-z]+){0,2} (?:team|group|squad)\b/);
  if (team) return Math.max(1, toNum(team[1]) - 1);
  const range = t.match(/\b(\d|two|three|four|five|six)\s*(?:or|to|-)\s*(\d|two|three|four|five|six)\s+(?:people|friends|others|students|teammates)/);
  if (range) return toNum(range[2]);
  const n = t.match(/\b(\d|two|three|four|five|six)\s+(?:people|friends|others|students|teammates|more people)\b/);
  if (n) return toNum(n[1]);
  if (/\b(a group|group of|study group|squad|crew|people to|people who|friends to)\b/.test(t)) return 3;
  return null;
}

function detectLanguages(text: string): string[] {
  const out: string[] = [];
  for (const clause of clauses(text)) {
    if (!/\b(speak|native|fluent|bilingual)\b/.test(clause)) continue;
    out.push(...extractConcepts(clause).filter((id) => cat(id) === 'language'));
  }
  return unique(out).map(conceptLabel);
}

const LEARNING_CUES = /\b(struggling|struggle|need help|help with|bad at|weak in|not good at|still learning|learning|want to learn|trying to learn|improve|practice)\b/;
const OFFER_CUES = /\b(good at|strong in|strong at|great at|i know|i can help|i can teach|i tutor|experienced|i can code|i code|i build)\b/;
const SELF_CUES = /^(i m|i'm|im|i am|i like|i love|i enjoy|i play|i study|i go to|i live|i know|i can|i build|i code|my )/;

/** Partner DNA from a self-description. */
export function extractProfileOffline(text: string): ProfileExtraction {
  const out: ProfileExtraction = {
    interests: [], skills: [], learning: [], goals: [], needs: [], offers: [], preferences: [], languages: [], availability: [], location: null,
  };
  for (const clause of clauses(text)) {
    const ids = extractConcepts(clause);
    const learning = LEARNING_CUES.test(clause);
    const offering = OFFER_CUES.test(clause);
    const studying = /\b(student|major|majoring|studying|degree|engineer|developer|designer)\b/.test(clause);
    for (const id of ids) {
      const c = cat(id);
      if (c === 'language') continue;
      if (PREFERENCE_IDS.has(id)) out.preferences.push(label(id));
      else if (id === 'project-partner') out.goals.push('Build projects');
      else if (id === 'make-friends' || id === 'meet-internationals') out.goals.push('Meet people');
      else if (id === 'startups' && /\b(start|build|launch|found)\b/.test(clause)) out.goals.push('Build a startup');
      else if (CATEGORY_IDS.includes(id)) out.needs.push(label(id));
      else if (learning && c && SKILL_CATS.has(c)) out.learning.push(label(id));
      else if ((offering || studying) && c && SKILL_CATS.has(c)) {
        out.skills.push(label(id));
        if (offering) out.offers.push(label(id));
      } else if (c && INTEREST_CATS.has(c)) out.interests.push(label(id));
      else if (c && SKILL_CATS.has(c)) out.skills.push(label(id));
    }
  }
  out.languages = detectLanguages(text);
  out.availability = detectAvailability(text);
  out.location = findLocationInText(text)?.label ?? null;
  for (const key of ['interests', 'skills', 'learning', 'goals', 'needs', 'offers', 'preferences'] as const) out[key] = unique(out[key]);
  out.interests = out.interests.filter((i) => !out.skills.includes(i) && !out.learning.includes(i));
  return out;
}

const NEED_CUES = /\b(need|needs|looking for|find me|find|want|wanna|searching for|ideally|someone who|one who|who can|who knows|a person who)\b/;
const INTEREST_SPLIT = /\b(interested in|into|who likes?|who loves?|who enjoys?|passionate about|who also likes?|that likes?|who is into|who are into)\b/;

function summarize(i: IntentExtraction, category: string): string {
  const parts: string[] = [];
  const cLabel = category ? conceptLabel(category) : 'People';
  const who = i.group_size && i.group_size > 1 ? `${i.group_size} people` : null;
  if (category === 'roommate') parts.push('A roommate');
  else if (category === 'study-partner' || i.lens === 'learn') parts.push(`A study group${i.learning_needs.length ? ` for ${i.learning_needs.join(', ')}` : ''}`);
  else if (i.lens === 'explore') parts.push(`People to explore${i.location ? ` ${i.location}` : ''} with`);
  else if (i.needed_skills.length) parts.push(`${who ?? 'Someone'} who knows ${i.needed_skills.join(' & ')}`);
  else parts.push(who ? `${who} for ${cLabel.toLowerCase()}` : cLabel);
  if (i.needed_skills.length && category && !['roommate', 'study-partner'].includes(category) && i.lens === 'connect') parts.push(`for your ${cLabel.toLowerCase()}`);
  if (i.interests.length) parts.push(`into ${i.interests.slice(0, 2).join(' & ')}`);
  if (i.location && i.lens !== 'explore') parts.push(`at ${i.location}`);
  if (i.context) parts.push(i.context);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** Structured Scout request from natural language. */
export function parseIntentOffline(text: string): IntentExtraction {
  const t = normalizeText(text);
  const neededSkills: string[] = [];
  const interests: string[] = [];
  const learningNeeds: string[] = [];
  const offers: string[] = [];
  let category = '';

  for (const clause of clauses(text)) {
    const isSelf = SELF_CUES.test(clause) && !NEED_CUES.test(clause);
    const splitAt = clause.search(INTEREST_SPLIT);
    const head = splitAt >= 0 ? clause.slice(0, splitAt) : clause;
    const tail = splitAt >= 0 ? clause.slice(splitAt) : '';
    for (const id of extractConcepts(head)) {
      const c = cat(id);
      if (!category && CATEGORY_IDS.includes(id)) category = id;
      else if (CATEGORY_IDS.includes(id) || EXPLORE_IDS.has(id) || id === 'make-friends' || c === 'language') continue;
      else if (isSelf) {
        if (OFFER_CUES.test(clause) && c && SKILL_CATS.has(c)) offers.push(conceptLabel(id));
        else if (LEARNING_CUES.test(clause) && c && SKILL_CATS.has(c)) learningNeeds.push(conceptLabel(id));
      } else if (LEARNING_CUES.test(clause) && c && (c === 'math' || c === 'science' || c === 'tech' || c === 'humanities')) learningNeeds.push(conceptLabel(id));
      else if (c && (c === 'math' || c === 'science') ) learningNeeds.push(conceptLabel(id));
      else if (c && SKILL_CATS.has(c) && id !== 'hackathons' && id !== 'startups' && id !== 'sustainability') neededSkills.push(conceptLabel(id));
      else if (c && INTEREST_CATS.has(c) && !PREFERENCE_IDS.has(id)) interests.push(conceptLabel(id));
    }
    for (const id of extractConcepts(tail)) {
      if (!CATEGORY_IDS.includes(id) && !PREFERENCE_IDS.has(id) && cat(id) !== 'language') interests.push(conceptLabel(id));
      else if (!category && CATEGORY_IDS.includes(id)) category = id;
    }
  }

  if (!category) {
    if (/\bstudy|studying|tutor|exam|midterm|finals\b/.test(t)) category = 'study-partner';
    else if (/\b(explore|exploring|new to|just moved|visiting|show me around)\b/.test(t)) category = 'explore-city';
    else if (/\bteam(mate)?s?\b/.test(t) && extractConcepts(t).includes('robotics')) category = 'robotics-team';
    else if (/\bteam(mate)?s?\b/.test(t) && extractConcepts(t).includes('hackathons')) category = 'hackathon-team';
    else if (/\bplay\b/.test(t) && interests.length) category = 'make-friends';
    else category = 'make-friends';
  }

  const lens: IntentExtraction['lens'] =
    category === 'study-partner' || category === 'language-exchange' || (learningNeeds.length > 0 && neededSkills.length === 0)
      ? 'learn'
      : EXPLORE_IDS.has(category) || /\bexplore|exploring|new in town|just moved\b/.test(t)
        ? 'explore'
        : 'connect';

  const location = findLocationInText(text)?.label ?? null;
  const context = t.match(/\b(next semester|this semester|this weekend|next week|this summer|next fall|for a hackathon|at hackgt)\b/)?.[1] ?? null;
  const groupSize = detectGroupSize(text) ?? (lens === 'learn' && /\bgroup\b/.test(t) ? 3 : null);

  const result: IntentExtraction = {
    summary: '',
    category: category ? conceptLabel(category) : 'New friends',
    lens,
    needed_skills: unique(neededSkills),
    interests: unique(interests.filter((i) => !neededSkills.includes(i))),
    learning_needs: unique(learningNeeds),
    offers: unique(offers),
    location,
    context,
    group_size: groupSize,
    availability: detectAvailability(text),
    languages: detectLanguages(text),
    about_me: null,
  };
  result.summary = summarize(result, category);

  // Self-descriptions inside a request ("I'm a mechanical engineering student at KSU…")
  const selfText = clauses(text).filter((c) => SELF_CUES.test(c) && !NEED_CUES.test(c)).join('. ');
  if (selfText) {
    const me = extractProfileOffline(selfText);
    const hasAny = Object.values(me).some((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)));
    result.about_me = hasAny ? me : null;
  }
  return result;
}
