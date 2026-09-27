import { AnimatePresence, motion } from 'framer-motion';
import { Clock, EyeOff, HeartHandshake, Hourglass, Lock, Search, Send, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { MutualPerson, MutualSearchResponse, MutualSentRequest } from '../../shared/types';
import { ContactList } from '../components/mutual/ContactList';
import { MutualReveal } from '../components/mutual/MutualReveal';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { ErrorNote, PageLoader } from '../components/ui/Feedback';
import { TextField } from '../components/ui/Field';
import { useToast } from '../components/ui/Toast';
import { api, errorMessage } from '../lib/api';
import { daysLeft, hoursLeft } from '../lib/format';
import { useSession } from '../lib/session';
import { useLoad } from '../lib/useLoad';

// Mutual has no AI anywhere — this page only talks to /api/mutual.

const STATUS_LABEL: Record<MutualSentRequest['status'], string> = {
  active: 'Waiting privately',
  waiting: 'Saved until they join',
  matched: 'Mutual',
  expired: 'Expired',
  ended: 'Ended',
  withdrawn: 'Withdrawn',
};

function ConfirmSend({ person, remaining, onCancel, onConfirm, busy }: { person: string; remaining: number; onCancel: () => void; onConfirm: () => void; busy: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-2xl border border-peach bg-peach-soft p-4">
      <p className="font-bold">Privately Partner Up with {person}?</p>
      <p className="mt-1 text-sm text-ink-2">
        They’ll never know it was you — unless they independently choose you too. This uses 1 of your {remaining} remaining requests.
      </p>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="mutual" size="sm" onClick={onConfirm} loading={busy} icon={!busy && <Send className="size-4" aria-hidden />}>
          Partner Up
        </Button>
      </div>
    </motion.div>
  );
}

export function MutualPage() {
  const { me } = useSession();
  const toast = useToast();
  const { data, error, reload } = useLoad(() => api.mutual(), []);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [results, setResults] = useState<MutualSearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [confirm, setConfirm] = useState<MutualPerson | 'join' | null>(null);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState(false);

  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data || !me?.profile) return <PageLoader />;
  const profile = me.profile;

  const search = async (e: FormEvent) => {
    e.preventDefault();
    if (!first.trim() || !last.trim()) return toast('Enter both a first and last name.', 'info');
    setSearching(true);
    setConfirm(null);
    try {
      setResults(await api.mutualSearch(first.trim(), last.trim()));
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSearching(false);
    }
  };

  const send = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const res = confirm === 'join' ? await api.mutualSaveForJoin(first.trim(), last.trim()) : await api.mutualPartnerUp(confirm.id);
      if (res.status === 'mutual') {
        reload();
        setReveal(true);
      } else if (res.status === 'saved_for_join') {
        toast(`Saved privately. If ${first.trim()} joins, your request will be waiting for them.`, 'success');
        reload();
      } else {
        toast('Sent privately. They’ll only find out if they choose you too.', 'success');
        reload();
      }
      if (results && confirm !== 'join') {
        setResults({ ...results, results: results.results.map((p) => (p.id === confirm.id ? { ...p, alreadyRequested: true } : p)) });
      }
      setConfirm(null);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (id: string) => {
    try {
      await api.mutualWithdraw(id);
      toast('Request withdrawn. They were never told.', 'info');
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const end = async () => {
    if (!data.match) return;
    try {
      await api.mutualEnd(data.match.id);
      toast('Match ended. You’re both available again.', 'info');
      reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const { pulse, limits, match } = data;

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {reveal && match && (
          <MutualReveal match={match} myName={`${profile.firstName} ${profile.lastName}`} myHue={profile.avatarHue} onClose={() => setReveal(false)} />
        )}
      </AnimatePresence>

      <div>
        <Chip tone="mutual" icon={<HeartHandshake className="size-4" aria-hidden />}>
          Mutual · You know WHO
        </Chip>
        <h1 className="mt-3 text-4xl sm:text-5xl">Make the move without making it awkward.</h1>
        <p className="mt-2 max-w-2xl font-medium text-ink-2">Your feelings stay private unless they’re mutual. No AI here — just you, someone you already know, and a secret only you two can unlock.</p>
      </div>

      {match && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grad-mutual rounded-[1.75rem] p-6 shadow-soft sm:p-7" aria-labelledby="match-title">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex">
              <Avatar name={`${profile.firstName} ${profile.lastName}`} hue={profile.avatarHue} size="lg" />
              <Avatar name={`${match.partner.firstName} ${match.partner.lastName}`} hue={match.partner.avatarHue} size="lg" className="-ml-4" />
            </div>
            <div className="flex-1">
              <p className="eyebrow text-ink-2">Current match</p>
              <h2 id="match-title" className="text-3xl">
                It’s mutual with {match.partner.firstName} {match.partner.lastName}
              </h2>
            </div>
            <Chip tone="neutral" className="bg-white/70">
              Taken
            </Chip>
          </div>
          <div className="mt-5 rounded-3xl bg-white p-4">
            <p className="eyebrow mb-2">How to reach {match.partner.firstName}</p>
            <ContactList contacts={match.contacts} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm font-medium text-ink-2">
            <span className="flex items-center gap-1.5">
              <Lock className="size-4" aria-hidden /> While matched, neither of you can receive new Mutual requests.
            </span>
            {match.canEnd ? (
              <Button variant="secondary" size="sm" onClick={() => void end()}>
                End match
              </Button>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 font-semibold">
                <Hourglass className="size-4" aria-hidden /> Can end in {hoursLeft(match.canEndAt)}h
              </span>
            )}
          </div>
        </motion.section>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <section className="card p-6 md:col-span-2" aria-labelledby="pulse-title">
          <h2 id="pulse-title" className="flex items-center gap-2 text-lg">
            <EyeOff className="size-5" aria-hidden /> Partner Pulse
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-mutual-surface p-4">
              <p className="text-4xl font-extrabold tracking-tight">{pulse.searchesThisMonth}</p>
              <p className="mt-1 text-sm font-semibold text-ink-2">times you appeared in searches this month</p>
            </div>
            <div className="rounded-2xl bg-mutual-surface p-4">
              <p className="text-4xl font-extrabold tracking-tight">{pulse.privatelyChoseYou}</p>
              <p className="mt-1 text-sm font-semibold text-ink-2">{pulse.privatelyChoseYou === 1 ? 'person has' : 'people have'} privately Partnered Up with you</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">Anonymous counts only. Nobody — including you — ever sees who searched or who chose whom.</p>
        </section>
        <section className="card p-6" aria-labelledby="limit-title">
          <h2 id="limit-title" className="text-lg">
            Requests
          </h2>
          <p className="mt-3 text-4xl font-extrabold tracking-tight">
            {limits.remaining}
            <span className="text-lg text-muted">/{limits.limit}</span>
          </p>
          <p className="text-sm font-semibold text-ink-2">left this {limits.windowDays}-day window</p>
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {Array.from({ length: limits.limit }, (_, i) => (
              <span key={i} className={`h-2 flex-1 rounded-full ${i < limits.used ? 'bg-ink/15' : 'bg-peach'}`} />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">Each request stays active for {limits.requestTtlDays} days, then expires quietly.</p>
        </section>
      </div>

      <section className="card p-6" aria-labelledby="search-title">
        <h2 id="search-title" className="flex items-center gap-2 text-lg">
          <Search className="size-5" aria-hidden /> Search someone you already know
        </h2>
        <p className="mt-1 text-sm text-muted">Exact first and last name. Mutual isn’t for browsing strangers.</p>
        <form onSubmit={search} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <TextField label="First name" value={first} onChange={(e) => setFirst(e.target.value)} maxLength={40} autoComplete="off" />
          <TextField label="Last name" value={last} onChange={(e) => setLast(e.target.value)} maxLength={40} autoComplete="off" />
          <Button type="submit" size="lg" loading={searching} disabled={profile.taken} icon={!searching && <Search className="size-4" aria-hidden />}>
            Search
          </Button>
        </form>
        {profile.taken && <p className="mt-3 text-sm font-semibold text-peach-ink">You’re in an active match, so searching and new requests are paused.</p>}

        <AnimatePresence mode="wait">
          {results && (
            <motion.div key={`${results.query.firstName}-${results.query.lastName}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5">
              {results.results.length > 0 ? (
                <ul className="space-y-2">
                  {results.results.map((p) => (
                    <li key={p.id} className="rounded-2xl border border-line p-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${p.firstName} ${p.lastName}`} hue={p.avatarHue} />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold">
                            {p.firstName} {p.lastName}
                          </p>
                          <p className="text-sm text-muted">{p.age}</p>
                        </div>
                        {p.taken ? (
                          <Chip>Taken</Chip>
                        ) : p.alreadyRequested ? (
                          <Chip tone="mutual" icon={<Clock className="size-3.5" aria-hidden />}>
                            Sent privately
                          </Chip>
                        ) : (
                          <Button variant="mutual" size="sm" onClick={() => setConfirm(p)} disabled={limits.remaining === 0 || profile.taken}>
                            Partner Up
                          </Button>
                        )}
                      </div>
                      {confirm !== 'join' && confirm?.id === p.id && (
                        <ConfirmSend person={p.firstName} remaining={limits.remaining} busy={busy} onCancel={() => setConfirm(null)} onConfirm={() => void send()} />
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-dashed border-line-strong p-5">
                  <p className="font-bold">
                    {results.query.firstName} {results.query.lastName} isn’t on Partner Up yet.
                  </p>
                  <p className="mt-1 text-sm text-muted">Save a private request. If they join with that name, it’ll be waiting — they still won’t know it was you.</p>
                  {confirm === 'join' ? (
                    <ConfirmSend person={results.query.firstName} remaining={limits.remaining} busy={busy} onCancel={() => setConfirm(null)} onConfirm={() => void send()} />
                  ) : (
                    <Button variant="secondary" size="sm" className="mt-3" onClick={() => setConfirm('join')} disabled={limits.remaining === 0 || profile.taken} icon={<UserPlus className="size-4" aria-hidden />}>
                      Save for when they join
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className="card p-6" aria-labelledby="sent-title">
        <h2 id="sent-title" className="flex items-center gap-2 text-lg">
          <Lock className="size-5" aria-hidden /> Your private requests
        </h2>
        <p className="mt-1 text-sm text-muted">Only you can see these.</p>
        {data.active.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-canvas p-4 text-sm text-muted">No active requests.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {data.active.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-3">
                <Avatar name={r.targetName} hue={r.avatarHue ?? 30} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{r.targetName}</span>
                  <span className="block text-xs text-muted">
                    {STATUS_LABEL[r.status]} · expires in {daysLeft(r.expiresAt)} days
                  </span>
                </span>
                <Button variant="ghost" size="sm" onClick={() => void withdraw(r.id)}>
                  Withdraw
                </Button>
              </li>
            ))}
          </ul>
        )}
        {data.history.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-bold">History ({data.history.length})</summary>
            <ul className="mt-2 space-y-1 text-sm">
              {data.history.map((r) => (
                <li key={r.id} className="flex justify-between gap-3 rounded-xl px-2 py-1.5">
                  <span className="font-medium">{r.targetName}</span>
                  <span className="text-muted">{STATUS_LABEL[r.status]}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}
