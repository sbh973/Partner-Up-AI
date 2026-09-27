import { motion } from 'framer-motion';
import { Check, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MuseAvatar } from '../brand/Logo';

const STEPS = ['Understanding what you need…', 'Updating your Partner DNA…', 'Looking for compatible people…'];

/** Honest progress: steps advance while the request is actually in flight. */
export function MuseThinking({ steps = STEPS }: { steps?: string[] }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setActive((i) => Math.min(i + 1, steps.length - 1)), 700);
    return () => window.clearInterval(t);
  }, [steps.length]);
  return (
    <div className="flex items-start gap-3" role="status" aria-live="polite">
      <MuseAvatar thinking />
      <div className="card px-5 py-4">
        <p className="mb-2 text-sm font-bold">Muse is thinking…</p>
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <motion.li key={s} initial={{ opacity: 0 }} animate={{ opacity: i <= active ? 1 : 0.35 }} className="flex items-center gap-2 text-sm font-medium">
              <span className={`flex size-5 items-center justify-center rounded-full ${i < active ? 'bg-good-soft text-good' : 'bg-sky-soft text-sky-ink'}`}>
                {i < active ? <Check className="size-3" aria-hidden /> : i === active ? <LoaderCircle className="size-3 animate-spin" aria-hidden /> : null}
              </span>
              {s}
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  );
}
