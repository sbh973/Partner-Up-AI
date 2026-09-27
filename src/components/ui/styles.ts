// Shared class recipes (kept out of component files so Fast Refresh works).

export type ButtonVariant = 'primary' | 'mutual' | 'scout' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-white hover:bg-ink-2 shadow-soft',
  mutual: 'grad-mutual text-ink font-bold shadow-soft hover:shadow-lift hover:brightness-[1.03]',
  scout: 'grad-scout text-ink font-bold shadow-soft hover:shadow-lift hover:brightness-[1.03]',
  secondary: 'bg-white text-ink border border-line-strong hover:border-ink/40',
  ghost: 'text-ink-2 hover:bg-ink/5',
  danger: 'bg-white text-danger border border-danger/30 hover:bg-danger-soft',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-4 text-sm gap-1.5',
  md: 'min-h-12 px-5 text-[15px] gap-2',
  lg: 'min-h-14 px-7 text-base gap-2.5',
};

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = ''): string {
  return [
    'inline-flex items-center justify-center whitespace-nowrap rounded-full font-semibold transition-all duration-200 select-none',
    'active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 disabled:shadow-none',
    VARIANTS[variant],
    SIZES[size],
    extra,
  ].join(' ');
}

export const controlClass =
  'w-full rounded-2xl border border-line-strong bg-white px-4 py-3 text-[15px] text-ink placeholder:text-muted/80 transition focus:border-ink focus:outline-none focus:ring-4 focus:ring-banana';
