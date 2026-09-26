import { motion } from 'framer-motion';
import type { DimensionScore } from '../../../shared/types';

/** Transparent breakdown: each dimension's score and its weight in this mode. */
export function DimensionBars({ dimensions }: { dimensions: DimensionScore[] }) {
  return (
    <ul className="space-y-3">
      {dimensions.map((d, i) => (
        <li key={d.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-ink">{d.label}</span>
            <span className="shrink-0 text-xs text-muted">
              <span className="font-semibold text-ink">{Math.round(d.score * 100)}</span>/100 · weight {Math.round(d.weight * 100)}%
            </span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#f6eec9]" aria-hidden>
            <motion.div
              className="brand-gradient h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(2, d.score * 100)}%` }}
              transition={{ duration: 0.7, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
