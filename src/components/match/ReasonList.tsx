import { motion } from 'framer-motion';
import type { MatchReason } from '../../../shared/types';

export function ReasonList({ reasons, compact }: { reasons: MatchReason[]; compact?: boolean }) {
  return (
    <ul className={compact ? 'space-y-2' : 'space-y-3'}>
      {reasons.map((r, i) => (
        <motion.li
          key={`${r.kind}-${r.title}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i }}
          className="flex items-start gap-3"
        >
          <span
            aria-hidden
            className={`flex shrink-0 items-center justify-center rounded-xl bg-cream leading-none ${compact ? 'size-8 text-base' : 'size-10 text-lg'}`}
          >
            {r.emoji}
          </span>
          <span className="min-w-0 pt-0.5">
            <span className={`block font-semibold text-ink ${compact ? 'text-sm' : ''}`}>{r.title}</span>
            {!compact && r.detail && <span className="mt-0.5 block text-sm leading-relaxed break-words text-muted">{r.detail}</span>}
          </span>
        </motion.li>
      ))}
    </ul>
  );
}
