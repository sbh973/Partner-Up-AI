import type { DnaListField, Gender, ScoutLens, TimeSlot } from './types';

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  mornings: 'Mornings',
  afternoons: 'Afternoons',
  evenings: 'Evenings',
  late_nights: 'Late nights',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
};

export const GENDER_LABELS: Record<Gender, string> = {
  woman: 'Woman',
  man: 'Man',
  nonbinary: 'Non-binary',
  self_describe: 'Self-described',
  prefer_not: 'Prefer not to say',
};

export const DNA_FIELD_LABELS: Record<DnaListField | 'location', string> = {
  interests: 'Interests',
  skills: 'Skills',
  learning: 'Learning',
  goals: 'Goals',
  needs: 'Needs',
  offers: 'Can offer',
  preferences: 'Preferences',
  languages: 'Languages',
  availability: 'Availability',
  location: 'Location',
};

export const LENS_LABELS: Record<ScoutLens, string> = {
  connect: 'Connect',
  learn: 'Learn',
  explore: 'Explore',
};

export function listToSentence(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
