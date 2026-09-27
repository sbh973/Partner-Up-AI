import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { useEffect, useId } from 'react';

interface ScoreRingProps {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
  showLabel?: boolean;
  system?: 'scout' | 'mutual';
}

const STOPS = {
  scout: ['#2bb4ee', '#79d7ff'],
  mutual: ['#ff8a57', '#ffb38a'],
};

/** Animated match score. It comes from our deterministic engine — not a probability, never from AI. */
export function ScoreRing({ score, size = 96, stroke = 9, label = 'match', showLabel = false, system = 'scout' }: ScoreRingProps) {
  const id = useId();
  const reduce = useReducedMotion();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useMotionValue(reduce ? score : 0);
  const dashOffset = useTransform(progress, (v) => circumference * (1 - v / 100));
  const rounded = useTransform(progress, (v) => Math.round(v));

  useEffect(() => {
    if (reduce) {
      progress.set(score);
      return;
    }
    const controls = animate(progress, score, { duration: 1.1, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [score, reduce, progress]);

  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${score}% ${label}`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={STOPS[system][0]} />
            <stop offset="100%" stopColor={STOPS[system][1]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#efede3" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#g-${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashOffset }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <span className="font-extrabold leading-none tracking-tight text-ink" style={{ fontSize: size * 0.28 }}>
          <motion.span>{rounded}</motion.span>
          <span style={{ fontSize: size * 0.15 }}>%</span>
        </span>
        {showLabel && <span className="mt-1 text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">{label}</span>}
      </div>
    </div>
  );
}
