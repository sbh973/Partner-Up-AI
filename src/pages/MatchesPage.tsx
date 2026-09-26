import { Clock, Eye, Lock } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PersonaBadge } from '../components/match/MatchCard';
import { Avatar } from '../components/ui/Avatar';
import { ButtonLink } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { EmptyState, ErrorNote, PageLoader } from '../components/ui/Feedback';
import { useToast } from '../components/ui/Toast';
import { api, errorMessage } from '../lib/api';
import { MODE_THEMES } from '../lib/modes';
import { useLoad } from '../lib/useLoad';

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000));
}

export function MatchesPage() {
  const toast = useToast();
  const { data, error, reload, setData } = useLoad(() => api.matches(), []);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  const withdraw = async (id: string) => {
    setWithdrawing(id);
    try {
      await api.withdraw(id);
      setData((d) => (d ? { ...d, sent: d.sent.filter((s) => s.id !== id) } : d));
      toast('Request withdrawn. They were never told.', 'info');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setWithdrawing(null);
    }
  };

  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return <PageLoader />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">Matches</h1>
        <p className="mt-1 text-ink-soft">Partnerships happen only when both people independently choose each other.</p>
      </div>

      {data.incomingInterest > 0 && (
        <div className="brand-gradient flex flex-col gap-3 rounded-3xl p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-3 font-medium text-ink">
            <Eye className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span>
              <strong className="text-lg font-extrabold">{data.incomingInterest} {data.incomingInterest === 1 ? 'person has' : 'people have'}</strong> privately
              chosen to Partner Up with you. We’ll never say who — if you choose them too, you’ll both find out.
            </span>
          </p>
          <ButtonLink to="/app/discover" variant="primary" size="sm">
            Discover people
          </ButtonLink>
        </div>
      )}

      <section aria-labelledby="partners-title">
        <h2 id="partners-title" className="mb-3 text-xl font-bold">
          Your partnerships
        </h2>
        {data.partnerships.length === 0 ? (
          <EmptyState
            emoji="🤝"
            title="No partnerships yet"
            body="When you and someone both choose to Partner Up, they’ll show up here — with a Connection Bridge to help you start."
            action={<ButtonLink to="/app/discover" variant="brand">Find my partner</ButtonLink>}
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {data.partnerships.map((p) => {
              const theme = MODE_THEMES[p.mode];
              return (
                <li key={p.id}>
                  <Link to={`/app/partnership/${p.id}`} className="card flex items-center gap-4 p-4 transition hover:shadow-lift">
                    <Avatar name={p.partner.displayName} hue={p.partner.avatarHue} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                        {p.partner.displayName} {p.partner.isDemoPersona && <PersonaBadge />}
                      </span>
                      <span className="block truncate text-sm text-muted">{[p.partner.community, p.partner.city].filter(Boolean).join(' · ')}</span>
                    </span>
                    <Chip tone={p.mode} emoji={theme.emoji} size="sm">
                      {theme.name}
                    </Chip>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="sent-title">
        <h2 id="sent-title" className="flex items-center gap-2 text-xl font-bold">
          Private requests you’ve sent <Lock className="size-4 text-muted" aria-hidden />
        </h2>
        <p className="mb-3 text-sm text-muted">Only you can see these. They expire after 30 days.</p>
        {data.sent.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong p-5 text-sm text-muted">No open requests.</p>
        ) : (
          <ul className="space-y-2">
            {data.sent.map((s) => (
              <li key={s.id} className="card flex flex-wrap items-center gap-3 p-4">
                <Avatar name={s.target.displayName} hue={s.target.avatarHue} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{s.target.displayName}</span>
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <Clock className="size-3" aria-hidden /> {MODE_THEMES[s.mode].name} · expires in {daysLeft(s.expiresAt)} days
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void withdraw(s.id)}
                  disabled={withdrawing === s.id}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-ink/5 hover:text-ink disabled:opacity-50"
                >
                  Withdraw
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
