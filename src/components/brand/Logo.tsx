import { Link } from 'react-router-dom';

export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="pu-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFC53D" />
          <stop offset="1" stopColor="#FF4D8D" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#pu-logo)" />
      <circle cx="25" cy="32" r="11" fill="none" stroke="#fff" strokeWidth="5" />
      <circle cx="39" cy="32" r="11" fill="none" stroke="#fff" strokeWidth="5" />
    </svg>
  );
}

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="inline-flex shrink-0 items-center gap-2 rounded-xl" aria-label="Partner Up home">
      <LogoMark />
      <span className="font-display text-lg font-bold tracking-tight whitespace-nowrap sm:text-xl">
        Partner Up<span className="brand-text max-[380px]:hidden"> AI</span>
      </span>
    </Link>
  );
}
