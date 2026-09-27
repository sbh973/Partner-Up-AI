import { AnimatePresence, motion } from 'framer-motion';
import { Clock3, Eye, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '../ui/Button';

const POINTS = [
  { icon: Eye, text: 'Your phone and Instagram are never visible to anyone by default.' },
  { icon: UserRoundCheck, text: 'They unlock only after a confirmed two‑sided connection — a mutual match in Mutual, or both people saying yes in Scout.' },
  { icon: Clock3, text: 'You can add, edit, or skip your contact info any time from Account.' },
];

interface PrivacyGateProps {
  /** Shown when this gate is guarding a specific demo persona, e.g. "Arnav Desai". Omit for normal onboarding. */
  personaName?: string;
  onContinue: () => void;
  /** Omit to hide the skip option entirely (e.g. when contact info isn't being collected at all). */
  onSkip?: () => void;
  busy?: boolean;
}

/**
 * The privacy checkpoint every path into contact-sharing goes through: normal
 * onboarding, every demo account entry, and any future flow that touches
 * phone/Instagram. Nothing here is decorative — it's the same gate every time.
 */
export function PrivacyGate({ personaName, onContinue, onSkip, busy }: PrivacyGateProps) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    button.current?.focus();
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-gate-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-ink/70 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.94, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 190, damping: 22 }}
          className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-lift"
        >
          <div className="grad-brand px-7 pt-8 pb-7 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/70 shadow-soft">
              <ShieldCheck className="size-7" aria-hidden />
            </span>
            <h2 id="privacy-gate-title" className="mt-4 text-3xl tracking-[-0.02em]">
              Privacy &amp; contact sharing
            </h2>
            <p className="mt-2 text-sm font-semibold text-ink/70">
              {personaName ? `Before you explore Partner Up as ${personaName}, here’s how contact info actually works.` : 'Before you finish setting up, here’s how we protect your contact info.'}
            </p>
          </div>

          <div className="space-y-4 px-7 py-6">
            <ul className="space-y-3">
              {POINTS.map((p) => (
                <li key={p.text} className="flex items-start gap-3 text-sm font-medium text-ink-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-banana-soft text-ink">
                    <p.icon className="size-4" aria-hidden />
                  </span>
                  {p.text}
                </li>
              ))}
            </ul>

            {personaName && (
              <p className="rounded-2xl bg-ink/[0.04] px-4 py-3 text-xs font-semibold text-muted">This same screen appears before real onboarding and before every demo account — it isn’t a one‑off for the demo.</p>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <Button ref={button} variant="primary" size="lg" className="w-full" loading={busy} onClick={onContinue}>
                Got it — continue
              </Button>
              {onSkip && (
                <Button variant="ghost" className="w-full" disabled={busy} onClick={onSkip}>
                  Skip contact info for now
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
