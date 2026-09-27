import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { ArrowRight, Bell, Dna, Eye, HeartHandshake, Radar, Search, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AppNotification, MutualOverview, ScoutOverview } from '../../shared/types';
import { MuseAvatar } from '../components/brand/Logo';
import { Avatar } from '../components/ui/Avatar';
import { ButtonLink } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { api } from '../lib/api';
import { timeAgo } from '../lib/format';
import { useSession } from '../lib/session';
import { useLoad } from '../lib/useLoad';

interface DashboardData {
  mutual: MutualOverview;
  scout: ScoutOverview;
  notifications: AppNotification[];
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/70 px-4 py-3">
      <p className="text-2xl font-extrabold tracking-tight">{value}</p>
      <p className="text-xs font-semibold text-ink-2">{label}</p>
    </div>
  );
}

function Section({ title, icon, children, action }: { title: string; icon: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DashboardPage() {
  const { me } = useSession();
  const { data } = useLoad<DashboardData>(async () => {
    const [mutual, scout, n] = await Promise.all([api.mutual(), api.scout(), api.notifications()]);
    return { mutual, scout, notifications: n.notifications };
  }, []);
  if (!me?.profile) return null;
  const dna = me.dna;
  const dnaChips = dna ? [...dna.interests, ...dna.skills].slice(0, 8) : [];

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-lg font-semibold text-muted">Hey, {me.profile.firstName}</p>
        <h1 className="mt-1 text-4xl sm:text-5xl">Who are you looking for today?</h1>
      </motion.div>

      <div className="grid gap-5 md:grid-cols-2">
        {(['mutual', 'scout'] as const).map((system, i) => {
          const mutual = system === 'mutual';
          return (
            <motion.div key={system} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.07 }} whileHover={{ y: -4 }}>
              <Link to={`/app/${system}`} className={`flex h-full flex-col rounded-[1.75rem] p-6 shadow-soft transition-shadow hover:shadow-lift sm:p-7 ${mutual ? 'grad-mutual' : 'grad-scout'}`}>
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-white/70">
                    {mutual ? <HeartHandshake className="size-5" aria-hidden /> : <Radar className="size-5" aria-hidden />}
                  </span>
                  <ArrowRight className="size-5" aria-hidden />
                </div>
                <h2 className="mt-5 text-3xl">{mutual ? 'Mutual' : 'Scout'}</h2>
                <p className="font-bold text-ink-2">{mutual ? 'You know WHO.' : 'You know WHAT.'}</p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {mutual ? (
                    <>
                      <Stat value={data ? `${data.mutual.limits.remaining}/${data.mutual.limits.limit}` : '–'} label="requests left" />
                      <Stat value={data?.mutual.pulse.searchesThisMonth ?? '–'} label="searches for you" />
                    </>
                  ) : (
                    <>
                      <Stat value={data?.scout.requests.length ?? '–'} label="active searches" />
                      <Stat value={data?.scout.connections.filter((c) => c.status === 'connected').length ?? '–'} label="connections" />
                    </>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Section title="Mutual activity" icon={<Eye className="size-5" aria-hidden />} action={<Link to="/app/mutual" className="text-sm font-bold underline underline-offset-4">Open</Link>}>
          {data ? (
            <div className="space-y-3 text-sm">
              {data.mutual.match ? (
                <div className="flex items-center gap-3 rounded-2xl bg-peach-soft p-3">
                  <Avatar name={`${data.mutual.match.partner.firstName} ${data.mutual.match.partner.lastName}`} hue={data.mutual.match.partner.avatarHue} size="sm" />
                  <p className="font-bold">It’s mutual with {data.mutual.match.partner.firstName}</p>
                </div>
              ) : null}
              <p className="font-medium">
                <span className="text-2xl font-extrabold">{data.mutual.pulse.privatelyChoseYou}</span> {data.mutual.pulse.privatelyChoseYou === 1 ? 'person has' : 'people have'} privately Partnered Up with you
              </p>
              <p className="text-muted">You’ve appeared in {data.mutual.pulse.searchesThisMonth} searches this month. We never say who.</p>
              <p className="text-muted">{data.mutual.active.length} active request{data.mutual.active.length === 1 ? '' : 's'} · {data.mutual.limits.remaining} left this month</p>
            </div>
          ) : (
            <div className="skeleton h-24 rounded-2xl" />
          )}
        </Section>

        <Section title="Scout" icon={<Search className="size-5" aria-hidden />} action={<Link to="/app/scout" className="text-sm font-bold underline underline-offset-4">Ask Muse</Link>}>
          {data ? (
            data.scout.requests.length || data.scout.connections.length ? (
              <ul className="space-y-2 text-sm">
                {data.scout.connections.slice(0, 2).map((c) => (
                  <li key={c.id}>
                    <Link to={`/app/scout/connection/${c.id}`} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-canvas">
                      <Avatar name={c.other.firstName} hue={c.other.avatarHue} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{c.other.firstName}</span>
                        <span className="block truncate text-muted">{c.requestSummary}</span>
                      </span>
                      <Chip size="sm" tone={c.status === 'connected' ? 'good' : 'scout'}>
                        {c.status === 'connected' ? 'Connected' : c.status === 'suggested' ? 'Muse found' : 'Pending'}
                      </Chip>
                    </Link>
                  </li>
                ))}
                {data.scout.requests.slice(0, 3).map((r) => (
                  <li key={r.id} className="flex items-center gap-2 rounded-2xl bg-scout-surface px-3 py-2">
                    <Radar className="size-4 shrink-0 text-sky-ink" aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-medium">{r.summary}</span>
                    {r.watching && <Chip size="sm" tone="scout">Muse is looking</Chip>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No active searches yet. Tell Muse what you’re looking for.</p>
            )
          ) : (
            <div className="skeleton h-24 rounded-2xl" />
          )}
        </Section>

        <Section title="Partner DNA" icon={<Dna className="size-5" aria-hidden />} action={<Link to="/app/dna" className="text-sm font-bold underline underline-offset-4">Edit</Link>}>
          {dnaChips.length ? (
            <div className="flex flex-wrap gap-1.5">
              {dnaChips.map((c) => (
                <Chip key={c} size="sm" tone="scout">
                  {c}
                </Chip>
              ))}
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <MuseAvatar />
              <div>
                <p className="text-sm font-medium">Muse doesn’t know you yet. A 60-second chat builds your Partner DNA.</p>
                <ButtonLink to="/app/scout" variant="scout" size="sm" className="mt-3" icon={<Sparkles className="size-4" aria-hidden />}>
                  Meet Muse
                </ButtonLink>
              </div>
            </div>
          )}
        </Section>
      </div>

      <Section title="Notifications" icon={<Bell className="size-5" aria-hidden />} action={<Link to="/app/inbox" className="text-sm font-bold underline underline-offset-4">All</Link>}>
        {data?.notifications.length ? (
          <ul className="divide-y divide-line">
            {data.notifications.slice(0, 4).map((n) => (
              <li key={n.id} className="flex items-start gap-3 py-3 text-sm">
                <span className={`mt-1 size-2 shrink-0 rounded-full ${n.system === 'mutual' ? 'bg-peach' : n.system === 'scout' ? 'bg-sky' : 'bg-ink/30'}`} aria-hidden />
                <span className="flex-1 font-medium">{n.message}</span>
                <span className="shrink-0 text-xs text-muted">{timeAgo(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Users className="size-4" aria-hidden /> Nothing new yet.
          </p>
        )}
      </Section>
    </div>
  );
}
