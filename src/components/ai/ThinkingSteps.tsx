import { motion } from 'framer-motion';
import { Check, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

const STEPS = [
  'Understanding what you need…',
  'Searching Partner DNA…',
  'Finding complementary strengths…',
  'Checking mutual intent…',
];

/** Honest progress: steps advance while the request is in flight. */
export function ThinkingSteps({ withText }: { withText: boolean }) {
  const steps = withText ? STEPS : STEPS.slice(1);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((i) => Math.min(i + 1, steps.length - 1)), 420);
    return () => window.clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="card mx-auto max-w-md p-6" role="status" aria-live="polite">
      <ol className="space-y-3">
        {steps.map((step, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <motion.li
              key={step}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: i <= active ? 1 : 0.35, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3"
            >
              <span className={`flex size-6 items-center justify-center rounded-full ${done ? 'bg-good-soft text-good' : 'bg-cream text-rose-deep'}`}>
                {done ? <Check className="size-3.5" aria-hidden /> : current ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : null}
              </span>
              <span className={`text-sm ${current ? 'font-semibold text-ink' : 'text-ink-soft'}`}>{step}</span>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
