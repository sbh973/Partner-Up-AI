import type { PartnerDNA as DnaRow } from '@prisma/client';
import type { AiSource, DnaPatch, PartnerDNA, TimeSlot } from '../../shared/types';
import { TIME_SLOTS } from '../../shared/types';
import { db, parseList } from '../db';

const LIST_KEYS = ['interests', 'skills', 'learning', 'goals', 'needs', 'offers', 'preferences', 'languages'] as const;
type ListKey = (typeof LIST_KEYS)[number];

const COLUMN: Record<ListKey | 'availability', keyof DnaRow> = {
  interests: 'interestsJson',
  skills: 'skillsJson',
  learning: 'learningJson',
  goals: 'goalsJson',
  needs: 'needsJson',
  offers: 'offersJson',
  preferences: 'preferencesJson',
  languages: 'languagesJson',
  availability: 'availabilityJson',
};

export function emptyDna(): PartnerDNA {
  return {
    about: '',
    interests: [],
    skills: [],
    learning: [],
    goals: [],
    needs: [],
    offers: [],
    location: null,
    availability: [],
    preferences: [],
    languages: [],
    lastSource: null,
    updatedAt: new Date(0).toISOString(),
  };
}

export function rowToDna(row: DnaRow): PartnerDNA {
  const src = row.lastSource;
  return {
    about: row.about,
    interests: parseList(row.interestsJson),
    skills: parseList(row.skillsJson),
    learning: parseList(row.learningJson),
    goals: parseList(row.goalsJson),
    needs: parseList(row.needsJson),
    offers: parseList(row.offersJson),
    location: row.location,
    availability: parseList(row.availabilityJson).filter((s): s is TimeSlot => (TIME_SLOTS as readonly string[]).includes(s)),
    preferences: parseList(row.preferencesJson),
    languages: parseList(row.languagesJson),
    lastSource: src === 'muse' || src === 'offline' || src === 'manual' ? src : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function isDnaEmpty(dna: PartnerDNA | null): boolean {
  if (!dna) return true;
  return LIST_KEYS.every((k) => dna[k].length === 0) && dna.availability.length === 0 && !dna.location;
}

function mergeList(current: string[], add: string[] | undefined): string[] {
  const out = [...current];
  for (const item of add ?? []) if (!out.some((x) => x.toLowerCase() === item.toLowerCase())) out.push(item);
  return out.slice(0, 20);
}

/** Merge a patch; returns the new DNA and exactly what was added (for the visible "Muse added…" UI). */
export function applyPatch(dna: PartnerDNA, patch: DnaPatch): { next: PartnerDNA; added: DnaPatch } {
  const next = { ...dna };
  const added: DnaPatch = {};
  for (const key of LIST_KEYS) {
    const merged = mergeList(dna[key], patch[key]);
    const fresh = merged.slice(dna[key].length);
    if (fresh.length) {
      next[key] = merged;
      added[key] = fresh;
    }
  }
  const slots = patch.availability?.filter((s) => !dna.availability.includes(s)) ?? [];
  if (slots.length) {
    next.availability = [...dna.availability, ...slots];
    added.availability = slots;
  }
  if (patch.location && !dna.location) {
    next.location = patch.location;
    added.location = patch.location;
  }
  return { next, added };
}

/** Undo a previously applied patch (only removes the exact items it added). */
export function removePatch(dna: PartnerDNA, patch: DnaPatch): PartnerDNA {
  const next = { ...dna };
  for (const key of LIST_KEYS) {
    const drop = new Set((patch[key] ?? []).map((x) => x.toLowerCase()));
    if (drop.size) next[key] = dna[key].filter((x) => !drop.has(x.toLowerCase()));
  }
  if (patch.availability?.length) next.availability = dna.availability.filter((s) => !patch.availability?.includes(s));
  if (patch.location && dna.location === patch.location) next.location = null;
  return next;
}

export async function loadDna(userId: string): Promise<PartnerDNA | null> {
  const row = await db().partnerDNA.findUnique({ where: { userId } });
  return row ? rowToDna(row) : null;
}

export async function saveDna(userId: string, dna: PartnerDNA, source: AiSource | 'manual'): Promise<PartnerDNA> {
  const data = {
    about: dna.about.slice(0, 600),
    location: dna.location,
    lastSource: source,
    ...Object.fromEntries(
      [...LIST_KEYS, 'availability' as const].map((k) => [COLUMN[k], JSON.stringify(dna[k])]),
    ),
  };
  const row = await db().partnerDNA.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  return rowToDna(row);
}
