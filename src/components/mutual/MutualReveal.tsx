import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { MutualMatchView } from '../../../shared/types';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { ContactList } from './ContactList';

const SPARKS = Array.from({ length: 16 }, (_, i) => ({
  x: Math.cos((i / 16) * Math.PI * 2) * (110 + (i % 3) * 36),
  y: Math.sin((i / 16) * Math.PI * 2) * (110 + (i % 3) * 36),
  color: ['#FFFC79', '#FFB38A', '#ffffff'][i % 3],
  size: 7 + (i % 3) * 4,
}));

/** The moment it becomes mutual: warm, brief, never over the top. */
export function MutualReveal({ match, myName, myHue, onClose }: { match: MutualMatchView; myName: string; myHue: number; onClose: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    button.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const partner = `${match.partner.firstName} ${match.partner.lastName}`;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mutual-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-ink/70 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.92, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 170, damping: 20 }}
        className="grad-mutual relative w-full max-w-md overflow-hidden rounded-[2.25rem] px-6 pt-12 pb-7 text-center shadow-lift"
      >
        <div className="pointer-events-none absolute inset-x-0 top-24 flex justify-center" aria-hidden>
          {SPARKS.map((s, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full"
              style={{ width: s.size, height: s.size, background: s.color }}
              initial={{ x: 0, y: 0, opacity: 0 }}
              animate={{ x: s.x, y: s.y, opacity: [0, 1, 0] }}
              transition={{ duration: 1.3, delay: 0.35 + (i % 5) * 0.04, ease: 'easeOut' }}
            />
          ))}
        </div>
        <div className="relative flex items-center justify-center">
          <motion.div initial={{ x: -46, opacity: 0 }} animate={{ x: 10, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 120 }}>
            <Avatar name={myName} hue={myHue} size="xl" />
          </motion.div>
          <motion.div initial={{ x: 46, opacity: 0 }} animate={{ x: -10, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 120 }}>
            <Avatar name={partner} hue={match.partner.avatarHue} size="xl" />
          </motion.div>
        </div>
        <motion.h2
          id="mutual-title"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35 }}
          className="relative mt-6 text-5xl tracking-[-0.05em]"
        >
          IT’S MUTUAL
        </motion.h2>
        <p className="relative mt-2 font-semibold text-ink-2">
          You and {match.partner.firstName} chose each other — independently.
        </p>
        <div className="relative mt-6 rounded-3xl bg-white p-4 text-left">
          <p className="eyebrow mb-2">How to reach {match.partner.firstName}</p>
          <ContactList contacts={match.contacts} />
        </div>
        <Button ref={button} variant="primary" size="lg" className="relative mt-6 w-full" onClick={onClose}>
          Done
        </Button>
      </motion.div>
    </motion.div>
  );
}
