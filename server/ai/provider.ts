import { z } from 'zod';
import { TIME_SLOTS } from '../../shared/types';

// The AI surface of Partner Up. Only Scout uses it — Mutual never imports
// anything from server/ai. Implementations must throw on any failure; the
// service layer (./service.ts) always has a deterministic fallback.

export const ProfileExtraction = z.object({
  interests: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  learning: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  needs: z.array(z.string()).default([]),
  offers: z.array(z.string()).default([]),
  preferences: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  availability: z.array(z.enum(TIME_SLOTS)).catch([]).default([]),
  location: z.string().nullable().catch(null).default(null),
});
export type ProfileExtraction = z.infer<typeof ProfileExtraction>;

export const IntentExtraction = z.object({
  summary: z.string().default(''),
  category: z.string().default(''),
  lens: z.enum(['connect', 'learn', 'explore']).catch('connect').default('connect'),
  needed_skills: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  learning_needs: z.array(z.string()).default([]),
  offers: z.array(z.string()).default([]),
  location: z.string().nullable().catch(null).default(null),
  context: z.string().nullable().catch(null).default(null),
  group_size: z.number().int().min(1).max(8).nullable().catch(null).default(null),
  availability: z.array(z.enum(TIME_SLOTS)).catch([]).default([]),
  languages: z.array(z.string()).default([]),
  about_me: ProfileExtraction.partial().nullable().catch(null).default(null),
});
export type IntentExtraction = z.infer<typeof IntentExtraction>;

export const SimilarityOutput = z.object({ score: z.number().min(0).max(1) });
export const TextOutput = z.object({ text: z.string() });

export interface GroupMemberFacts {
  name: string;
  isYou: boolean;
  skills: string[];
  interests: string[];
  contributes: string[];
}

export interface GroupFacts {
  request: string;
  members: GroupMemberFacts[];
  sharedTraits: string[];
  covered: string[];
  missing: string[];
}

export interface AIProvider {
  readonly name: string;
  extractProfile(rawText: string): Promise<ProfileExtraction>;
  parseGroupIntent(rawText: string): Promise<IntentExtraction>;
  analyzeSemanticSimilarity(a: string, b: string): Promise<number>;
  generateGroupExplanation(members: GroupMemberFacts[], sharedTraits: string[]): Promise<string>;
  generateGroupSummary(group: GroupFacts): Promise<string>;
  /** One or two concise sentences in Muse's voice, grounded in the facts given. */
  reply(situation: string, facts: Record<string, unknown>): Promise<string>;
}

export class AIUnavailableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'AIUnavailableError';
  }
}
