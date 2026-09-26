import { motion } from 'framer-motion';
import { ArrowRight, Eye, Play, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { MatchesResponse, Mode } from '../../shared/types';
import { PartnerPrompt } from '../components/ai/PartnerPrompt';
import { PartnerDnaCard } from '../components/dna/PartnerDnaCard';
import { ModeCard } from '../components/modes/ModeCard';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { api, errorMessage } from '../lib/api';
import { useMe } from '../lib/me';
import { MODE_ORDER, MODE_THEMES, PROMPT_EXAMPLES } from '../lib/modes';
import { saveLastDiscover, setPendingPrompt } from '../lib/session';

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function HomePage() {
  const { me, refresh } = useMe();
  const navigate = useNavigate();
  const toast = useToast();
  const [matches, setMatches] = useState<MatchesResponse | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    api
      .matches()
      .then(setMatches)
      .catch(() => setMatches(null));
  }, []);

  if (!me?.profile) return null;
  const first = me.profile.displayName.split(' ')[0];
  const configured = new Set(me.modeProfiles.map((m) => m.mode));

  const ask = (text: string) => {
    setPendingPrompt(text);
    navigate('/app/discover');
  };

  const openMode = (mode: Mode) => navigate(configured.has(mode) ? `/app/discover?mode=${mode}` : `/app/start/${mode}`);

  const resetDemo = async () => {
    setResetting(true);
    try {
      await api.resetDemo();
      saveLastDiscover(null);
      await refresh();
      setMatches(await api.matches());
      toast('Demo reset — ready for a fresh run.', 'success');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-muted">
          {greeting()}, {first} 👋
        </p>
        <h1 className="mt-1 text-3xl font-bold sm:text-5xl">Who are you looking for today?</h1>
      </motion.div>

      <PartnerPrompt onSubmit={ask} />

      {me.isDemoAccount && (
        <section className="rounded-3xl border border-dashed border-line-strong bg-white/60 p-4 sm:p-5" aria-labelledby="demo-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="demo-title" className="flex items-center gap-2 font-display text-lg font-bold">
              <Play className="size-4 text-rose" aria-hidden /> Demo scenarios
            </h2>
            <Button variant="ghost" size="sm" onClick={() => void resetDemo()} loading={resetting} icon={!resetting && <RotateCcw className="size-4" aria-hidden />}>
              Reset demo
            </Button>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {PROMPT_EXAMPLES.slice(0, 3).map((ex) => {
              const t = MODE_THEMES[ex.mode];
              return (
                <button
                  key={ex.text}
                  type="button"
                  onClick={() => ask(ex.text)}
                  className={`rounded-2xl border ${t.border} ${t.soft} p-4 text-left text-sm transition hover:shadow-soft`}
                >
                  <span className={`text-xs font-bold uppercase ${t.text}`}>
                    {t.emoji} {t.name}
                  </span>
                  <span className="mt-1 block font-medium text-ink">“{ex.text}”</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section aria-labelledby="modes-title">
        <h2 id="modes-title" className="mb-3 text-xl font-bold">
          Or pick a mode
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {MODE_ORDER.map((mode) => (
            <ModeCard key={mode} mode={mode} compact onSelect={openMode} badge={configured.has(mode) ? undefined : 'Set up'} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {me.dna && <PartnerDnaCard dna={me.dna} name={me.profile.displayName} compact />}

        <section className="space-y-4" aria-labelledby="activity-title">
          <h2 id="activity-title" className="sr-only">
            Your activity
          </h2>
          {matches && matches.incomingInterest > 0 && (
            <Link to="/app/matches" className="brand-gradient flex items-center gap-3 rounded-3xl p-5 text-ink shadow-glow">
              <Eye className="size-6 shrink-0" aria-hidden />
              <span className="flex-1">
                <span className="block font-display text-lg font-bold">
                  {matches.incomingInterest} {matches.incomingInterest === 1 ? 'person' : 'people'} chose you
                </span>
                <span className="text-sm text-ink/80">Privately. Choose them too and you’ll both find out.</span>
              </span>
              <ArrowRight className="size-5" aria-hidden />
            </Link>
          )}
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Recent partnerships</h3>
              <Link to="/app/matches" className="text-sm font-semibold text-rose-deep">
                See all
              </Link>
            </div>
            {matches?.partnerships.length ? (
              <ul className="mt-3 space-y-2">
                {matches.partnerships.slice(0, 3).map((p) => (
                  <li key={p.id}>
                    <Link to={`/app/partnership/${p.id}`} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-canvas">
                      <Avatar name={p.partner.displayName} hue={p.partner.avatarHue} size="sm" />
                      <span className="flex-1 font-medium">{p.partner.displayName}</span>
                      <span className={`text-xs font-semibold ${MODE_THEMES[p.mode].text}`}>
                        {MODE_THEMES[p.mode].emoji} {MODE_THEMES[p.mode].name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No partnerships yet — they appear here when it’s mutual.</p>
            )}
            {matches && matches.sent.length > 0 && (
              <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
                {matches.sent.length} private request{matches.sent.length === 1 ? '' : 's'} waiting on the other person.
              </p>
            )}
          </div>
        </section>
      </div>

      <p className="pt-4 text-center font-display text-ink-soft">AI doesn’t become your friend. It helps you find one.</p>
    </div>
  );
}
