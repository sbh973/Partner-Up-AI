import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LogoMark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="pu-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFB38A" />
          <stop offset=".5" stopColor="#FFFC79" />
          <stop offset="1" stopColor="#79D7FF" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#pu-mark)" />
      <circle cx="25" cy="32" r="11" fill="none" stroke="#0F0F0F" strokeWidth="5" />
      <circle cx="39" cy="32" r="11" fill="none" stroke="#0F0F0F" strokeWidth="5" />
    </svg>
  );
}

/** The small "AI powered by Muse" badge — landing page and footer only. */
export function MuseBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-bold tracking-wide text-ink-2 ${className}`}>
      <Sparkles className="size-3" aria-hidden /> AI powered by Muse
    </span>
  );
}

export function Logo({ to = '/', badge = false }: { to?: string; badge?: boolean }) {
  return (
    <Link to={to} className="inline-flex shrink-0 items-center gap-2.5 rounded-xl" aria-label="Partner Up home">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-xl font-extrabold tracking-[-0.04em] whitespace-nowrap">Partner Up</span>
        {badge && <span className="mt-1 text-[11px] font-semibold text-muted">AI powered by Muse</span>}
      </span>
    </Link>
  );
}

/** Muse's presence: a soft gradient orb — a facilitator, not a mascot. */
export function MuseAvatar({ size = 'md', thinking = false }: { size?: 'sm' | 'md' | 'lg'; thinking?: boolean }) {
  const dims = size === 'sm' ? 'size-8' : size === 'lg' ? 'size-14' : 'size-10';
  const icon = size === 'lg' ? 'size-6' : 'size-4';
  return (
    <span className={`relative inline-flex ${dims} shrink-0 items-center justify-center rounded-full grad-scout shadow-soft`} aria-hidden>
      {thinking && <span className="absolute inset-0 animate-ping rounded-full bg-sky/40" />}
      <Sparkles className={`relative ${icon} text-ink`} />
    </span>
  );
}
