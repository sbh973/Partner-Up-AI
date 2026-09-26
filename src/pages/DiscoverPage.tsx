import { motion } from 'framer-motion';
import { ArrowRight, Info } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { DiscoverResponse, Mode } from '../../shared/types';
import { IntentSummary } from '../components/ai/IntentSummary';
import { PartnerPrompt } from '../components/ai/PartnerPrompt';
import { ThinkingSteps } from '../components/ai/ThinkingSteps';
import { MatchCard } from '../components/match/MatchCard';
import { ButtonLink } from '../components/ui/Button';
import { EmptyState, ErrorNote } from '../components/ui/Feedback';
import { api, errorMessage } from '../lib/api';
import { useMe } from '../lib/me';
import { isMode, MODE_ORDER, MODE_THEMES } from '../lib/modes';
import { clearPendingPrompt, loadLastDiscover, peekPendingPrompt, saveLastDiscover } from '../lib/session';
import { usePartnerUp } from '../lib/usePartnerUp';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Start =
  | { kind: 'pending'; text: string }
  | { kind: 'saved'; text: string; response: DiscoverResponse }
  | { kind: 'fresh' };

/** What to show first: a prompt handed over from Home/Landing, the last results, or a fresh profile-based search. */
function decideStart(paramMode: string | null): Start {
  const pending = peekPendingPrompt();
  if (pending) return { kind: 'pending', text: pending };
  const saved = loadLastDiscover();
  if (saved && (!isMode(paramMode) || saved.response.mode === paramMode)) return { kind: 'saved', ...saved };
  return { kind: 'fresh' };
}

export function DiscoverPage() {
  const { me } = useMe();
  const [params, setParams] = useSearchParams();
  const paramMode = params.get('mode');
  const defaultMode: Mode = isMode(paramMode) ? paramMode : (me?.modeProfiles[0]?.mode ?? 'connect');
  const [start] = useState(() => decideStart(paramMode));
  const [text, setText] = useState(start.kind === 'fresh' ? '' : start.text);
  const [data, setData] = useState<DiscoverResponse | null>(start.kind === 'saved' ? start.response : null);
  const [loading, setLoading] = useState<null | 'text' | 'profile'>(start.kind === 'pending' ? 'text' : start.kind === 'fresh' ? 'profile' : null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const mode: Mode = data?.mode ?? defaultMode;

  /** Fire the request; every state update happens when it settles. Stale responses are dropped. */
  const fetchResults = (query: string, modeHint: Mode | null) => {
    const id = ++requestId.current;
    Promise.all([api.discover(modeHint, query || undefined), wait(query ? 1300 : 600)]).then(
      ([res]) => {
        if (id !== requestId.current) return;
        setData(res);
        setLoading(null);
        saveLastDiscover({ text: query, response: res });
        setParams({ mode: res.mode }, { replace: true });
      },
      (e: unknown) => {
        if (id !== requestId.current) return;
        setError(errorMessage(e));
        setLoading(null);
      },
    );
  };

  const run = (query: string, modeHint: Mode | null) => {
    setLoading(query ? 'text' : 'profile');
    setError(null);
    setText(query);
    fetchResults(query, modeHint);
  };

  useEffect(() => {
    if (start.kind === 'saved') return;
    if (start.kind === 'pending') clearPendingPrompt();
    fetchResults(start.kind === 'pending' ? start.text : '', start.kind === 'pending' ? null : defaultMode);
    // Runs once per page view: `start` is fixed at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markPending = (profileId: string) => {
    if (!data) return;
    const next = { ...data, results: data.results.map((r) => (r.profile.id === profileId ? { ...r, status: 'pending' as const } : r)) };
    setData(next);
    saveLastDiscover({ text, response: next });
  };
  const { partnerUp, busyId } = usePartnerUp(markPending);

  const switchMode = (m: Mode) => {
    if (loading) return;
    setParams({ mode: m }, { replace: true });
    void run('', m);
  };

  const hasModeProfile = me?.modeProfiles.some((m) => m.mode === mode);
  const theme = MODE_THEMES[mode];
  const featured = data?.results.slice(0, 3) ?? [];
  const others = data?.results.slice(3) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">Who are you looking for?</h1>
        <p className="mt-1 text-ink-soft">Describe it, or browse by mode. Partner AI ranks people by how much you’d both gain.</p>
      </div>

      <div className="no-scrollbar -m-1 flex gap-2 overflow-x-auto p-1" role="tablist" aria-label="Mode">
        {MODE_ORDER.map((m) => {
          const t = MODE_THEMES[m];
          const active = m === mode;
          return (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => switchMode(m)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                active ? `border-transparent ${t.soft} ${t.text} ring-2 ${t.ring}` : 'border-line bg-white text-ink-soft hover:border-ink/25'
              }`}
            >
              <span aria-hidden>{t.emoji}</span> {t.name}
            </button>
          );
        })}
      </div>

      <PartnerPrompt key={text} initialValue={text} onSubmit={(q) => void run(q, mode)} busy={loading === 'text'} showExamples={!data?.intent} />

      {!hasModeProfile && !loading && (
        <div className={`flex flex-col gap-3 rounded-3xl border ${theme.border} ${theme.soft} p-4 sm:flex-row sm:items-center sm:justify-between`}>
          <p className="flex items-start gap-2 text-sm text-ink">
            <Info className={`mt-0.5 size-4 shrink-0 ${theme.text}`} aria-hidden />
            Answer a few {theme.name} questions so these people can find you too — and so you can Partner Up.
          </p>
          <ButtonLink to={`/app/start/${mode}`} variant="primary" size="sm" icon={<ArrowRight className="size-4" aria-hidden />}>
            Set up {theme.name}
          </ButtonLink>
        </div>
      )}

      {loading ? (
        <ThinkingSteps withText={loading === 'text'} />
      ) : error ? (
        <ErrorNote message={error} onRetry={() => void run(text, mode)} />
      ) : data ? (
        <div className="space-y-6">
          {data.intent && data.intentTags && (
            <IntentSummary intent={data.intent} tags={data.intentTags} onAnswer={(answer) => void run(`${text}. ${answer}`, mode)} />
          )}
          {data.results.length === 0 ? (
            <EmptyState
              emoji="🔭"
              title="We haven’t found the right partner yet."
              body="Try broadening your request — fewer must-haves, a different time, or another mode."
              action={
                <Link to={`/app/start/${mode}`} className="font-semibold text-rose-deep underline underline-offset-4">
                  Update your {MODE_THEMES[mode].name} answers
                </Link>
              }
            />
          ) : (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">Found your strongest partners</h2>
                  <p className="text-sm text-muted">
                    {data.results.length} of {data.searchedCount} people in {MODE_THEMES[data.mode].name} fit — ranked by mutual benefit.
                  </p>
                </div>
              </motion.div>
              <div className="grid gap-4 lg:grid-cols-3">
                {featured.map((card, i) => (
                  <MatchCard
                    key={card.profile.id}
                    card={card}
                    mode={data.mode}
                    rank={i}
                    featured
                    busy={busyId === card.profile.id}
                    onPartnerUp={() => void partnerUp(card.profile, data.mode, data.intent)}
                    detailState={{ intent: data.intent }}
                  />
                ))}
              </div>
              {others.length > 0 && (
                <section aria-labelledby="more-title">
                  <h2 id="more-title" className="mb-3 text-lg font-bold text-ink-soft">
                    Also worth meeting
                  </h2>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {others.map((card, i) => (
                      <MatchCard
                        key={card.profile.id}
                        card={card}
                        mode={data.mode}
                        rank={i + 3}
                        busy={busyId === card.profile.id}
                        onPartnerUp={() => void partnerUp(card.profile, data.mode, data.intent)}
                        detailState={{ intent: data.intent }}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
