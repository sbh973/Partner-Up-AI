// Shared class recipes (kept out of component files so Fast Refresh works).

export type ButtonVariant = 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-white text-ink border border-ink/25 shadow-soft hover:border-ink/50',
  brand: 'bg-ink text-white font-bold shadow-lift hover:brightness-110',
  secondary: 'bg-surface text-ink border border-line-strong hover:border-ink/30 hover:bg-white',
  ghost: 'text-ink-soft hover:bg-ink/5',
  danger: 'bg-surface text-rose-deep border border-rose/30 hover:bg-blush',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-[15px] gap-2 rounded-2xl',
  lg: 'h-14 px-7 text-base gap-2.5 rounded-2xl',
};

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = ''): string {
  return [
    'inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-150 select-none',
    'active:scale-[0.98] disabled:opacity-55 disabled:active:scale-100',
    VARIANTS[variant],
    SIZES[size],
    extra,
  ].join(' ');
}

export const controlClass =
  'w-full rounded-2xl border border-line-strong bg-white px-4 py-3 text-[15px] text-ink placeholder:text-muted/70 transition focus:border-rose/60 focus:outline-none focus:ring-4 focus:ring-rose/15';
