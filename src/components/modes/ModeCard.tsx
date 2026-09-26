import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { Mode } from '../../../shared/types';
import { MODE_THEMES } from '../../lib/modes';

interface ModeCardProps {
  mode: Mode;
  onSelect: (mode: Mode) => void;
  selected?: boolean;
  compact?: boolean;
  badge?: string;
}

export function ModeCard({ mode, onSelect, selected, compact, badge }: ModeCardProps) {
  const t = MODE_THEMES[mode];
  const Icon = t.icon;
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(mode)}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      aria-pressed={selected}
      className={`group relative flex w-full flex-col overflow-hidden rounded-3xl border bg-surface text-left shadow-soft transition-shadow hover:shadow-lift ${
        selected ? `border-transparent ring-4 ${t.ring}` : 'border-line'
      } ${compact ? 'p-4' : 'p-6'}`}
    >
      <span className={`pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-gradient-to-br opacity-25 blur-2xl ${t.gradient}`} aria-hidden />
      <span className="flex items-center justify-between">
        <span className={`inline-flex items-center justify-center rounded-2xl ${t.soft} ${compact ? 'size-10' : 'size-12'}`}>
          <span className={compact ? 'text-xl' : 'text-2xl'} aria-hidden>
            {t.emoji}
          </span>
        </span>
        {badge ? (
          <span className="rounded-full bg-good-soft px-2.5 py-1 text-xs font-semibold text-good">{badge}</span>
        ) : (
          <Icon className={`size-5 ${t.text} opacity-70`} aria-hidden />
        )}
      </span>
      <span className={`mt-4 font-display font-bold tracking-tight ${compact ? 'text-lg' : 'text-2xl'}`}>{t.name}</span>
      <span className={`font-medium ${t.text}`}>{t.tagline}</span>
      {!compact && <span className="mt-2 text-sm leading-relaxed text-muted">{t.description}</span>}
      {!compact && (
        <span className="mt-4 flex flex-wrap gap-1.5">
          {t.examples.map((e) => (
            <span key={e} className="rounded-full bg-ink/[0.04] px-2.5 py-1 text-xs font-medium text-ink-soft">
              {e}
            </span>
          ))}
        </span>
      )}
      {!compact && (
        <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-ink">
          Start here <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
        </span>
      )}
    </motion.button>
  );
}
