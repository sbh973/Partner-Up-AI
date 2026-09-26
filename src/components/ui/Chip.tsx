import type { ReactNode } from 'react';

type Tone = 'neutral' | 'connect' | 'learn' | 'explore' | 'good' | 'warn' | 'brand';

const TONES: Record<Tone, string> = {
  neutral: 'bg-ink/[0.05] text-ink-soft',
  connect: 'bg-connect-soft text-connect',
  learn: 'bg-learn-soft text-learn',
  explore: 'bg-explore-soft text-explore',
  good: 'bg-good-soft text-good',
  warn: 'bg-warn-soft text-warn',
  brand: 'bg-cream text-ink',
};

interface ChipProps {
  children: ReactNode;
  emoji?: string;
  tone?: Tone;
  size?: 'sm' | 'md';
  className?: string;
}

export function Chip({ children, emoji, tone = 'neutral', size = 'md', className = '' }: ChipProps) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full font-medium ${
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
      } ${TONES[tone]} ${className}`}
    >
      {emoji && (
        <span aria-hidden className="leading-none">
          {emoji}
        </span>
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}
