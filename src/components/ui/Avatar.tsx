interface AvatarProps {
  name: string;
  hue: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: 'size-9 text-sm',
  md: 'size-12 text-base',
  lg: 'size-16 text-xl',
  xl: 'size-24 text-3xl',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase() || '?';
}

/** Generated, non-photographic avatars: nobody is ranked by how they look. */
export function Avatar({ name, hue, size = 'md', className = '' }: AvatarProps) {
  const h = ((hue % 360) + 360) % 360;
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-ink ring-2 ring-white ${SIZES[size]} ${className}`}
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${h} 95% 86%), hsl(${(h + 35) % 360} 90% 72%))` }}
    >
      {initials(name)}
    </span>
  );
}
