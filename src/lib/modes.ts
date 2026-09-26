import { BookOpen, Compass, Handshake, type LucideIcon } from 'lucide-react';
import type { Mode } from '../../shared/types';
import { MODE_LABELS } from '../../shared/labels';

export interface ModeTheme {
  mode: Mode;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind classes (literal strings so Tailwind can see them). */
  text: string;
  soft: string;
  ring: string;
  border: string;
  gradient: string;
  examples: string[];
}

export const MODE_THEMES: Record<Mode, ModeTheme> = {
  connect: {
    mode: 'connect',
    ...MODE_LABELS.connect,
    description: 'Friends, gaming squads, niche hobbies, someone to go to the thing with.',
    icon: Handshake,
    text: 'text-connect',
    soft: 'bg-connect-soft',
    ring: 'ring-connect/30',
    border: 'border-connect/25',
    gradient: 'from-[#ff8fb5] to-[#ff4d8d]',
    examples: ['Gaming squads', 'Shared hobbies', 'Event buddies'],
  },
  learn: {
    mode: 'learn',
    ...MODE_LABELS.learn,
    description: 'Study partners who cover your gaps while you cover theirs. Everyone contributes.',
    icon: BookOpen,
    text: 'text-learn',
    soft: 'bg-learn-soft',
    ring: 'ring-learn/30',
    border: 'border-learn/25',
    gradient: 'from-[#ffe08a] to-[#ffb020]',
    examples: ['Study pairs', 'Study groups', 'Language exchange'],
  },
  explore: {
    mode: 'explore',
    ...MODE_LABELS.explore,
    description: 'New city, new country, new campus — meet the people who make it feel like home.',
    icon: Compass,
    text: 'text-explore',
    soft: 'bg-explore-soft',
    ring: 'ring-explore/30',
    border: 'border-explore/25',
    gradient: 'from-[#8ee3d6] to-[#2bb5a3]',
    examples: ['Locals', 'Newcomers', 'Cultural exchange'],
  },
};

export const MODE_ORDER: Mode[] = ['connect', 'learn', 'explore'];

export const PROMPT_EXAMPLES: Array<{ text: string; mode: Mode }> = [
  { text: 'I want someone to play Valorant with at night who also likes F1.', mode: 'connect' },
  { text: "I'm good at calculus but struggling with chemistry. I want someone to study with at night.", mode: 'learn' },
  { text: "I'm an international student who just moved to Atlanta and want someone local to explore the city with.", mode: 'explore' },
  { text: 'I want someone to practice Spanish with — I can help with English.', mode: 'learn' },
  { text: "I'm visiting Tokyo for a week and want to meet someone local who likes food and photography.", mode: 'explore' },
];

export function isMode(value: string | null | undefined): value is Mode {
  return value === 'connect' || value === 'learn' || value === 'explore';
}
