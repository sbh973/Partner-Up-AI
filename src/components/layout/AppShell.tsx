import { Compass, Handshake, House, UserRound, UsersRound } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useMe } from '../../lib/me';
import { Logo } from '../brand/Logo';
import { Avatar } from '../ui/Avatar';

const NAV = [
  { to: '/app', label: 'Home', icon: House, end: true },
  { to: '/app/discover', label: 'Discover', icon: Compass, end: false },
  { to: '/app/matches', label: 'Matches', icon: Handshake, end: false },
  { to: '/app/groups', label: 'Groups', icon: UsersRound, end: false },
  { to: '/app/profile', label: 'Profile', icon: UserRound, end: false },
];

export function AppShell({ children }: { children?: ReactNode }) {
  const { me } = useMe();
  const { pathname } = useLocation();
  // New page → start at the top (the browser keeps scroll between SPA routes).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:shadow-lift">
        Skip to content
      </a>
      <header className="glass sticky top-0 z-40 border-b border-line/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo to="/app" />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-ink text-white' : 'text-ink-soft hover:bg-ink/5'
                  }`
                }
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>
          {me?.profile ? (
            <NavLink to="/app/profile" className="rounded-full md:hidden" aria-label="Your profile">
              <Avatar name={me.profile.displayName} hue={me.profile.avatarHue} size="sm" />
            </NavLink>
          ) : (
            <span className="md:hidden" />
          )}
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 pt-6 pb-32 sm:px-6 md:pb-16">
        {children ?? <Outlet />}
      </main>

      <nav
        className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line/70 pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Main"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${isActive ? 'text-rose-deep' : 'text-muted'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`rounded-full px-3 py-1 transition ${isActive ? 'bg-blush' : ''}`}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
