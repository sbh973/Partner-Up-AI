import { ArrowLeftRight } from 'lucide-react';
import type { MutualIntent } from '../../../shared/types';

export function MutualIntentPanel({ intent, partnerName }: { intent: MutualIntent; partnerName: string }) {
  return (
    <div className={`rounded-3xl border p-5 ${intent.detected ? 'border-rose/25 bg-blush' : 'border-line bg-white'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow">Mutual intent</span>
        {intent.detected ? (
          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-rose-deep shadow-soft">✓ Detected</span>
        ) : (
          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-muted">Partial</span>
        )}
      </div>
      <div className="mt-4 grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold text-muted uppercase">You want</p>
          <p className="mt-1 font-medium break-words text-ink">{intent.youWant}</p>
        </div>
        <div className="flex items-center justify-center" aria-hidden>
          <span className="brand-gradient flex size-9 items-center justify-center rounded-full text-ink shadow-soft">
            <ArrowLeftRight className="size-4" />
          </span>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold text-muted uppercase">{partnerName} wants</p>
          <p className="mt-1 font-medium break-words text-ink">{intent.theyWant}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">{intent.summary}</p>
    </div>
  );
}
