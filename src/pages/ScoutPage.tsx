import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, BellRing, Check, ChevronRight, Dna, Radar, RotateCcw, Square, UserPlus } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LENS_LABELS } from '../../shared/labels';
import type { PartnerDNA, ScoutConnectionView, ScoutSearchResponse } from '../../shared/types';
import { MuseAvatar } from '../components/brand/Logo';
import { GroupCard } from '../components/scout/GroupCard';
import { MuseOnboarding } from '../components/scout/MuseOnboarding';
import { MuseThinking } from '../components/scout/MuseThinking';
import { patchItems } from '../components/scout/patch';
import { PersonCard } from '../components/scout/PersonCard';
import { ConnectionBadge } from '../components/scout/ConnectionBadge';
import { SourceNote } from '../components/scout/SourceNote';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/Feedback';
import { useToast } from '../components/ui/Toast';
import { api, errorMessage } from '../lib/api';
import { timeAgo } from '../lib/format';
import { useLoad } from '../lib/useLoad';
import { useSession } from '../lib/session';

const EXAMPLES = [
  'I need a programmer for a sustainability hackathon.',
  'Find me a roommate at KSU next semester.',
  'Find me a group to explore Atlanta this weekend.',
  'I need a Calc II study group.',
];

function dnaIsEmpty(dna: PartnerDNA | null): boolean {
  if (!dna) return true;
  return !dna.about && !dna.location && [dna.interests, dna.skills, dna.learning, dna.goals, dna.needs, dna.offers].every((l) => l.length === 0);
}

const SKIP_KEY = 'pu_scout_onboarding_skipped';
function readSkipped(): boolean {
  try {
    return sessionStorage.getItem(SKIP_KEY) === '1';
  } catch {
    return false;
  }
}

export function ScoutPage() {
  const { me, config, refresh } = useSession();
  const [skipped, setSkipped] = useState(readSkipped);
  const needsOnboarding = dnaIsEmpty(me?.dna ?? null) && !skipped;

  if (needsOnboarding) {
    return (
      <MuseOnboarding
        onDone={() => {
          try {
            sessionStorage.setItem(SKIP_KEY, '1');
          } catch {
            // private mode — fine, onboarding just may show again
          }
          setSkipped(true);
          void refresh();
        }}
      />
    );
  }
  return <ScoutHome demoMode={config?.demoMode ?? false} firstName={me?.profile?.firstName ?? ''} />;
}

function ScoutHome({ demoMode, firstName }: { demoMode: boolean; firstName: string }) {
  const toast = useToast();
  const { refresh } = useSession();
  const overview = useLoad(() => api.scout(), []);
  const [text, setText] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScoutSearchResponse | null>(null);
  const [asked, setAsked] = useState('');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [dnaUndone, setDnaUndone] = useState(false);
  const [joining, setJoining] = useState(false);

  const connections = useMemo(() => {
    const map = new Map<string, ScoutConnectionView>();
    if (!result) return map;
    for (const c of overview.data?.connections ?? []) {
      if (c.role === 'requester' && c.requestId === result.requestId) map.set(c.other.id, c);
    }
    return map;
  }, [overview.data, result]);

  async function ask(e?: FormEvent, preset?: string) {
    e?.preventDefault();
    const value = (preset ?? text).trim();
    if (!value || thinking) return;
    setAsked(value);
    setText('');
    setThinking(true);
    setError(null);
    setResult(null);
    setDismissed(new Set());
    setDnaUndone(false);
    try {
      const res = await api.scoutSearch(value);
      setResult(res);
      overview.reload();
      if (res.dnaUpdate) void refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setThinking(false);
    }
  }

  async function partnerUp(ids: string[]) {
    if (!result) return;
    setBusyIds((s) => new Set([...s, ...ids]));
    try {
      const made = await api.scoutPartnerUp(result.requestId, ids);
      const connected = made.filter((c) => c.status === 'connected').length;
      toast(connected ? `${connected === made.length ? 'Connected' : `${connected} connected`} — contact info is unlocked.` : 'Request sent. They’ll decide privately.', 'success');
      overview.reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusyIds((s) => new Set([...s].filter((x) => !ids.includes(x))));
    }
  }

  async function undoDna() {
    if (!result?.dnaUpdate) return;
    try {
      await api.dnaUndo(result.dnaUpdate);
      setDnaUndone(true);
      void refresh();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  async function stop(id: string) {
    try {
      await api.scoutStop(id);
      overview.reload();
      toast('Muse stopped looking for that.', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  async function newStudent() {
    setJoining(true);
    try {
      const res = await api.demoNewStudent();
      overview.reload();
      toast(res.found ? 'A new student joined and Muse matched them to an open search. Check your inbox.' : res.joined ? 'A new student joined, but they don’t fit any open search yet.' : 'The demo student has already joined.', res.found ? 'success' : 'info');
      void refresh();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setJoining(false);
    }
  }

  const people = result?.people.filter((p) => !dismissed.has(p.person.id)) ?? [];
  const dnaChips = patchItems(result?.dnaUpdate);
  const watching = overview.data?.requests.filter((r) => r.watching) ?? [];
  const recentConnections = overview.data?.connections ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      {/* Prompt */}
      <section className="text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-sky-ink shadow-soft">
          <Radar className="size-3.5" aria-hidden /> Scout · Partner Up AI · powered by Muse
        </p>
        <h1 className="mt-4 text-4xl sm:text-6xl">
          What are you <span className="highlight">looking for</span>{firstName ? `, ${firstName}` : ''}?
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-ink-2">Describe what you need in your own words. Muse understands it — Partner Up’s engine finds and ranks the people.</p>
      </section>

      <form onSubmit={ask} className="card mt-8 flex items-end gap-2 p-2 shadow-lift">
        <label htmlFor="scout-ask" className="sr-only">
          Ask Muse
        </label>
        <textarea
          id="scout-ask"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void ask();
            }
          }}
          rows={2}
          maxLength={600}
          placeholder="Ask Muse… e.g. “I need a designer for a 4-person hackathon team”"
          className="min-h-14 flex-1 resize-none bg-transparent px-4 py-3 text-lg font-medium outline-none"
        />
        <button type="submit" disabled={!text.trim() || thinking} className="grad-scout flex size-14 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 disabled:opacity-40" aria-label="Ask Muse">
          <ArrowUp className="size-6" aria-hidden />
        </button>
      </form>

      {!result && !thinking && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => void ask(undefined, ex)} className="min-h-10 rounded-full border border-line bg-white px-4 text-sm font-semibold transition-colors hover:border-sky hover:bg-sky-soft">
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Conversation */}
      <section className="mt-10 space-y-5" aria-live="polite">
        {asked && (thinking || result || error) && (
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-3xl rounded-br-md bg-ink px-5 py-3 font-medium text-white">{asked}</p>
          </div>
        )}
        {thinking && <MuseThinking />}
        {error && (
          <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger" role="alert">
            {error}
          </p>
        )}

        <AnimatePresence>
          {result && (
            <motion.div key={result.requestId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="flex items-start gap-3">
                <MuseAvatar />
                <div className="card flex-1 px-5 py-4">
                  <p className="text-[11px] font-bold tracking-wide text-sky-ink uppercase">Muse</p>
                  <p className="mt-1 text-lg font-semibold">{result.message}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Chip size="sm" tone="banana">
                      {LENS_LABELS[result.intent.lens]}
                    </Chip>
                    {result.intentTags.category.label && <Chip size="sm">{result.intentTags.category.label}</Chip>}
                    {result.intentTags.neededSkills.map((t) => (
                      <Chip key={t.id} size="sm" tone="scout">
                        {t.label}
                      </Chip>
                    ))}
                    {result.intent.location && <Chip size="sm">{result.intent.location}</Chip>}
                    {result.intent.groupSize && result.intent.groupSize > 1 && <Chip size="sm">{result.intent.groupSize + 1}-person group</Chip>}
                  </div>
                  <div className="mt-3">
                    <SourceNote source={result.source} />
                  </div>
                </div>
              </div>

              {dnaChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-sky/60 bg-sky-soft px-4 py-3 text-sm font-semibold">
                  <Dna className="size-4 text-sky-ink" aria-hidden />
                  {dnaUndone ? (
                    <span>Removed from your Partner DNA.</span>
                  ) : (
                    <>
                      <span>Added to your Partner DNA:</span>
                      {dnaChips.map((c) => (
                        <Chip key={c.field + c.label} size="sm" tone="scout">
                          {c.label}
                        </Chip>
                      ))}
                      <button type="button" onClick={() => void undoDna()} className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-full px-3 font-bold underline-offset-4 hover:underline">
                        <RotateCcw className="size-3.5" aria-hidden /> Undo
                      </button>
                    </>
                  )}
                </div>
              )}

              {result.kind === 'group' && result.group && (
                <GroupCard
                  group={result.group}
                  connections={connections}
                  busy={busyIds.size > 0}
                  onPartnerUp={() => void partnerUp(result.group!.members.filter((m) => !m.isYou).map((m) => m.person.id))}
                />
              )}

              {result.kind === 'people' &&
                people.map((c, i) => (
                  <PersonCard
                    key={c.person.id}
                    candidate={c}
                    index={i}
                    connection={connections.get(c.person.id) ?? null}
                    busy={busyIds.has(c.person.id)}
                    onPartnerUp={() => void partnerUp([c.person.id])}
                    onDismiss={() => setDismissed((s) => new Set([...s, c.person.id]))}
                  />
                ))}

              {result.kind === 'people' && people.length === 0 && result.people.length > 0 && (
                <EmptyState icon={<Check className="size-5" aria-hidden />} title="You’ve reviewed everyone Muse found" body="Try describing what you need a little differently, or check back later." />
              )}

              {result.kind === 'keep_looking' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
                  <div className="grad-scout flex items-center gap-2 px-5 py-3 font-extrabold">
                    <BellRing className="size-5" aria-hidden /> Muse is keeping an eye out
                  </div>
                  <div className="p-5">
                    <p className="font-semibold">Nobody is a strong fit yet — so I won’t show you weak matches. I saved this search and will notify you (and them) the moment someone who fits joins.</p>
                    <p className="mt-2 text-sm text-muted">You can stop this anytime under “Muse is watching”.</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Watching + connections */}
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg">Muse is watching</h2>
            {demoMode && (
              <Button size="sm" variant="secondary" icon={<UserPlus className="size-4" aria-hidden />} onClick={() => void newStudent()} loading={joining}>
                A new student joins
              </Button>
            )}
          </div>
          {watching.length === 0 ? (
            <p className="text-sm text-muted">When there’s no strong fit yet, Muse keeps looking here and tells you when someone joins.</p>
          ) : (
            <ul className="space-y-2">
              {watching.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-scout-surface p-3">
                  <span className="relative flex size-3 shrink-0">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky opacity-70" />
                    <span className="relative inline-flex size-3 rounded-full bg-sky-ink" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{r.summary}</p>
                    <p className="text-xs text-muted">Since {timeAgo(r.createdAt)}</p>
                  </div>
                  <button type="button" onClick={() => void stop(r.id)} className="inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-bold hover:bg-white" aria-label={`Stop watching: ${r.summary}`}>
                    <Square className="size-3" aria-hidden /> Stop
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-lg">Your Scout connections</h2>
          {recentConnections.length === 0 ? (
            <p className="text-sm text-muted">When you Partner Up with someone Muse found, they appear here. Contact info unlocks only when you both say yes.</p>
          ) : (
            <ul className="space-y-1">
              {recentConnections.slice(0, 8).map((c) => (
                <li key={c.id}>
                  <Link to={`/app/scout/connection/${c.id}`} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-scout-surface">
                    <Avatar name={c.other.firstName} hue={c.other.avatarHue} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{c.other.firstName}</p>
                      <p className="truncate text-xs text-muted">{c.requestSummary}</p>
                    </div>
                    <ConnectionBadge c={c} />
                    <ChevronRight className="size-4 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
