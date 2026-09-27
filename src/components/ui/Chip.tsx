import type { ReactNode } from 'react';

export type ChipTone = 'neutral' | 'mutual' | 'scout' | 'banana' | 'good' | 'warn';

const TONES: Record<ChipTone, string> = {
  neutral: 'bg-ink/[0.05] text-ink-2',
  mutual: 'bg-peach-soft text-peach-ink',
  scout: 'bg-sky-soft text-sky-ink',
  banana: 'bg-banana-soft text-ink',
  good: 'bg-good-soft text-good',
  warn: 'bg-warn-soft text-warn',
};

interface ChipProps {
  children: ReactNode;
  tone?: ChipTone;
  size?: 'sm' | 'md';
  icon?: ReactNode;
  className?: string;
}

export function Chip({ children, tone = 'neutral', size = 'md', icon, className = '' }: ChipProps) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full font-semibold ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'} ${TONES[tone]} ${className}`}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}
