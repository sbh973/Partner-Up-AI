import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

interface CelebrationProps {
  me: { name: string; hue: number };
  partner: { name: string; hue: number };
  onContinue: () => void;
}

const DOTS = Array.from({ length: 18 }, (_, i) => ({
  x: Math.cos((i / 18) * Math.PI * 2) * (120 + (i % 3) * 40),
  y: Math.sin((i / 18) * Math.PI * 2) * (120 + (i % 3) * 40),
  color: ['#FFC53D', '#FF8A5C', '#FF4D8D', '#ffffff'][i % 4],
  size: 8 + (i % 3) * 4,
}));

/** The "it's mutual" moment: joyful, brief, not over the top. */
export function Celebration({ me, partner, onContinue }: CelebrationProps) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    button.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onContinue();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onContinue]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebrate-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/80 px-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 18 }}
        className="brand-gradient relative w-full max-w-md overflow-hidden rounded-[2.5rem] px-6 py-12 text-center shadow-lift"
      >
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          {DOTS.map((d, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full"
              style={{ width: d.size, height: d.size, background: d.color }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
              animate={{ x: d.x, y: d.y, opacity: [0, 1, 0], scale: 1 }}
              transition={{ duration: 1.4, delay: 0.25 + (i % 6) * 0.03, ease: 'easeOut' }}
            />
          ))}
        </div>
        <div className="relative flex items-center justify-center">
          <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 8, opacity: 1 }} transition={{ delay: 0.1, type: 'spring' }}>
            <Avatar name={me.name} hue={me.hue} size="xl" />
          </motion.div>
          <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: -8, opacity: 1 }} transition={{ delay: 0.1, type: 'spring' }}>
            <Avatar name={partner.name} hue={partner.hue} size="xl" />
          </motion.div>
        </div>
        <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 12 }} className="relative mt-4 text-5xl" aria-hidden>
          🤝
        </motion.p>
        <h2 id="celebrate-title" className="relative mt-3 text-3xl font-extrabold text-ink sm:text-4xl">
          IT’S A PARTNERSHIP
        </h2>
        <p className="relative mt-2 font-medium text-ink/80">You and {partner.name.split(' ')[0]} both chose to Partner Up.</p>
        <Button ref={button} variant="primary" size="lg" className="relative mt-8" onClick={onContinue}>
          See your Connection Bridge
        </Button>
      </motion.div>
    </motion.div>
  );
}
