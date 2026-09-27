import { CloudOff, Sparkles } from 'lucide-react';
import type { AiSource } from '../../../shared/types';

/** Quiet, honest indicator of what produced the language understanding. Scores are always our engine's. */
export function SourceNote({ source }: { source: AiSource }) {
  return source === 'muse' ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
      <Sparkles className="size-3" aria-hidden /> Understood by Muse · matched by Partner Up’s engine
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted" title="Muse was unavailable, so Partner Up used its built-in matching.">
      <CloudOff className="size-3" aria-hidden /> Using offline matching
    </span>
  );
}
