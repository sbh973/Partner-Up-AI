import { Check, Copy, Footprints, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import type { ConnectionBridge as Bridge } from '../../../shared/types';
import { Chip } from '../ui/Chip';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        });
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-ink/5 hover:text-ink"
      aria-label={copied ? 'Copied' : 'Copy conversation starter'}
    >
      {copied ? <Check className="size-3.5 text-good" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/** AI provides the bridge; the humans have the conversation. */
export function ConnectionBridgeCard({ bridge, partnerName }: { bridge: Bridge; partnerName: string }) {
  return (
    <section className="card overflow-hidden" aria-labelledby="bridge-title">
      <div className="border-b border-line bg-cream px-5 py-4 sm:px-6">
        <h2 id="bridge-title" className="text-xl font-bold">
          Your Connection Bridge
        </h2>
        <p className="text-sm text-ink-soft">Partner AI helps you start. The conversation is all yours.</p>
      </div>
      <div className="space-y-6 p-5 sm:p-6">
        {bridge.common.length > 0 && (
          <div>
            <p className="eyebrow">You already have something in common</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {bridge.common.map((t) => (
                <Chip key={t.id} emoji={t.emoji} tone="brand">
                  {t.label}
                </Chip>
              ))}
            </div>
          </div>
        )}
        {bridge.exchange && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-good-soft p-4">
              <p className="text-xs font-semibold text-good uppercase">You help with</p>
              <p className="mt-1 font-semibold text-ink">{bridge.exchange.youOffer.join(', ')}</p>
            </div>
            <div className="rounded-2xl bg-learn-soft p-4">
              <p className="text-xs font-semibold text-learn uppercase">{partnerName} helps with</p>
              <p className="mt-1 font-semibold text-ink">{bridge.exchange.theyOffer.join(', ')}</p>
            </div>
          </div>
        )}
        <div>
          <p className="eyebrow flex items-center gap-1.5">
            <MessageCircle className="size-3.5" aria-hidden /> Conversation starters
          </p>
          <ul className="mt-3 space-y-2">
            {bridge.starters.map((s) => (
              <li key={s} className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-white p-4">
                <span className="text-[15px] leading-relaxed text-ink">“{s}”</span>
                <CopyButton text={s} />
              </li>
            ))}
          </ul>
        </div>
        <p className="flex items-start gap-2 rounded-2xl bg-canvas p-4 text-sm text-ink-soft">
          <Footprints className="mt-0.5 size-4 shrink-0 text-rose-deep" aria-hidden />
          <span>
            <strong className="text-ink">First step:</strong> {bridge.firstStep}
          </span>
        </p>
      </div>
    </section>
  );
}
