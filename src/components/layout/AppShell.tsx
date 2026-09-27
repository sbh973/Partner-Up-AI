import { Dna, HeartHandshake, House, Inbox, Radar } from 'lucide-react';
import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../../lib/session';
import { Logo } from '../brand/Logo';
import { Avatar } from '../ui/Avatar';

const NAV = [
  { to: '/app', label: 'Home', icon: House, end: true, system: null },
  { to: '/app/mutual', label: 'Mutual', icon: HeartHandshake, end: false, system: 'mutual' },
  { to: '/app/scout', label: 'Scout', icon: Radar, end: false, system: 'scout' },
  { to: '/app/dna', label: 'Partner DNA', icon: Dna, end: false, system: 'scout' },
  { to: '/app/inbox', label: 'Inbox', icon: Inbox, end: false, system: null },
] as const;

/** Which half of the app are we in? It tints the whole page so you never need to read a label. */
function systemFor(pathname: string): 'mutual' | 'scout' | null {
  if (pathname.startsWith('/app/mutual')) return 'mutual';
  if (pathname.startsWith('/app/scout') || pathname.startsWith('/app/dna')) return 'scout';
  return null;
}

const ACTIVE: Record<'mutual' | 'scout' | 'none', string> = {
  mutual: 'bg-peach-soft text-ink',
  scout: 'bg-sky-soft text-ink',
  none: 'bg-ink text-white',
};

export function AppShell() {
  const { me } = useSession();
  const { pathname } = useLocation();
  const system = systemFor(pathname);
  const unread = me?.unreadNotifications ?? 0;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const surface = system === 'mutual' ? 'bg-mutual-surface' : system === 'scout' ? 'bg-scout-surface' : 'bg-canvas';

  return (
    <div className={`min-h-dvh transition-colors duration-500 ${surface}`} data-system={system ?? 'home'}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:shadow-lift">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo to="/app" />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map(({ to, label, icon: Icon, end, system: s }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `relative inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
                    isActive ? ACTIVE[s ?? 'none'] : 'text-ink-2 hover:bg-ink/5'
                  }`
                }
              >
                <Icon className="size-4" aria-hidden />
                {label}
                {label === 'Inbox' && unread > 0 && (
                  <span className="ml-0.5 rounded-full bg-ink px-1.5 text-[11px] font-bold text-white" aria-label={`${unread} unread`}>
                    {unread}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <NavLink to="/app/account" className="rounded-full" aria-label="Your account">
            {me?.profile ? <Avatar name={`${me.profile.firstName} ${me.profile.lastName}`} hue={me.profile.avatarHue} size="sm" /> : <span className="block size-9 rounded-full bg-ink/10" />}
          </NavLink>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 pt-6 pb-32 sm:px-6 md:pb-16">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden" aria-label="Main">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map(({ to, label, icon: Icon, end, system: s }) => (
            <NavLink key={to} to={to} end={end} className="flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] font-bold text-muted aria-[current=page]:text-ink">
              {({ isActive }) => (
                <>
                  <span className={`relative rounded-full px-3.5 py-1 transition ${isActive ? ACTIVE[s ?? 'none'] : ''}`}>
                    <Icon className="size-5" aria-hidden />
                    {label === 'Inbox' && unread > 0 && <span className="absolute -top-0.5 right-1.5 size-2 rounded-full bg-peach-ink" aria-hidden />}
                  </span>
                  {label === 'Partner DNA' ? 'DNA' : label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
