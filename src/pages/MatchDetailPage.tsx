import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ChevronDown, Clock, Handshake, Lock, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import type { FeedbackValue, Mode, PartnerIntent } from '../../shared/types';
import { TIME_SLOT_LABELS } from '../../shared/labels';
import { DimensionBars } from '../components/match/DimensionBars';
import { PersonaBadge } from '../components/match/MatchCard';
import { MutualIntentPanel } from '../components/match/MutualIntentPanel';
import { ReasonList } from '../components/match/ReasonList';
import { Avatar } from '../components/ui/Avatar';
import { Button, ButtonLink } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { ErrorNote, PageLoader } from '../components/ui/Feedback';
import { ScoreRing } from '../components/ui/ScoreRing';
import { useToast } from '../components/ui/Toast';
import { api, errorMessage } from '../lib/api';
import { useMe } from '../lib/me';
import { isMode, MODE_THEMES } from '../lib/modes';
import { loadLastDiscover } from '../lib/session';
import { useLoad } from '../lib/useLoad';
import { usePartnerUp } from '../lib/usePartnerUp';

function Block({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      <h2 className="eyebrow mb-4">{title}</h2>
      {children}
    </section>
  );
}

/** The request this match was found with (navigation state, else the last search — survives refresh). */
function readIntent(state: unknown, mode: Mode): PartnerIntent | null {
  const fromState = (state as { intent?: PartnerIntent | null } | null)?.intent;
  const intent = fromState ?? loadLastDiscover()?.response.intent ?? null;
  return intent && typeof intent === 'object' && intent.mode === mode ? intent : null;
}

export function MatchDetailPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const { me } = useMe();
  const toast = useToast();
  const mode: Mode = isMode(params.get('mode')) ? (params.get('mode') as Mode) : 'connect';
  const intent = readIntent(location.state, mode);
  // intent comes from navigation state and is fixed for this page view.
  const { data: detail, error, reload, setData: setDetail } = useLoad(() => api.matchDetail(id, mode, intent), [id, mode]);
  const [showWhy, setShowWhy] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackValue | null>(null);

  const markPending = useCallback(() => setDetail((d) => (d ? { ...d, status: 'pending' } : d)), [setDetail]);
  const { partnerUp, busyId } = usePartnerUp(markPending);

  const sendFeedback = async (value: FeedbackValue) => {
    setFeedback(value);
    try {
      await api.feedback(id, mode, value);
      toast('Thanks — this helps Partner AI get better.', 'success');
    } catch (e) {
      setFeedback(null);
      toast(errorMessage(e), 'error');
    }
  };

  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!detail || !me?.profile) return <PageLoader label="Checking mutual intent…" />;

  const { profile, match, narrative } = detail;
  const theme = MODE_THEMES[mode];
  const first = profile.displayName.split(' ')[0];
  const myFirst = me.profile.displayName.split(' ')[0];
  const context = [profile.age ? `${profile.age}` : null, profile.pronouns, profile.community, profile.city].filter(Boolean).join(' · ');
  const top = [...match.dimensions].sort((a, b) => b.weight * b.score - a.weight * a.score).slice(0, 3);

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-24">
      <Link to={`/app/discover?mode=${mode}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Back to results
      </Link>

      {/* Hero */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-hidden p-6 text-center sm:p-10">
        <div className="brand-gradient pointer-events-none absolute -top-32 left-1/2 size-80 -translate-x-1/2 rounded-full opacity-25 blur-3xl" aria-hidden />
        <div className="relative flex items-center justify-center">
          <Avatar name={me.profile.displayName} hue={me.profile.avatarHue} size="lg" className="-mr-3" />
          <span className="brand-gradient z-10 flex size-9 items-center justify-center rounded-full font-display text-lg font-bold text-ink shadow-soft ring-4 ring-white" aria-hidden>
            +
          </span>
          <Avatar name={profile.displayName} hue={profile.avatarHue} size="lg" className="-ml-3" />
        </div>
        <h1 className="relative mt-4 font-display text-2xl font-extrabold tracking-tight uppercase sm:text-3xl">
          {myFirst} + {first}
        </h1>
        <div className="relative mt-5 flex justify-center">
          <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 160, damping: 16 }}>
            <ScoreRing score={match.score} size={150} stroke={12} showLabel label={`${theme.name} match`} />
          </motion.div>
        </div>
        <p className="relative mt-3 text-sm font-bold tracking-[0.18em] text-muted uppercase">Partner Match</p>
        <div className="relative mt-3 flex flex-wrap items-center justify-center gap-2">
          <Chip tone={mode} emoji={theme.emoji}>
            {theme.name}
          </Chip>
          {profile.isDemoPersona && <PersonaBadge />}
        </div>
        {context && <p className="relative mt-3 text-sm text-muted">{context}</p>}
        {profile.bio && <p className="relative mx-auto mt-3 max-w-xl text-ink-soft">{profile.bio}</p>}

        <button
          type="button"
          onClick={() => setShowWhy((v) => !v)}
          aria-expanded={showWhy}
          className="relative mt-5 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft hover:border-ink/25"
        >
          Why this score? <ChevronDown className={`size-4 transition-transform ${showWhy ? 'rotate-180' : ''}`} aria-hidden />
        </button>
        <AnimatePresence initial={false}>
          {showWhy && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="relative overflow-hidden text-left">
              <div className="mx-auto mt-5 max-w-xl rounded-2xl bg-canvas p-5">
                <DimensionBars dimensions={match.dimensions} />
                <p className="mt-4 text-xs leading-relaxed text-muted">
                  This {theme.name} score is a weighted blend of the dimensions above, computed deterministically from both profiles by our matching
                  model — not a probability, and not written by AI. It was driven mostly by {top.map((d) => d.label.toLowerCase()).join(', ')}. The same two
                  people can score very differently in another mode.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* AI narrative */}
      <section className="rounded-3xl border border-rose/20 bg-blush p-5 sm:p-6">
        <p className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-rose-deep uppercase">
          <Sparkles className="size-4" aria-hidden /> Partner AI
        </p>
        <p className="mt-2 text-lg leading-snug font-semibold text-ink sm:text-xl">{narrative.summary}</p>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <Block title="Why you match" className="md:col-span-2">
          <ReasonList reasons={match.reasons} />
        </Block>

        {match.mutualIntent && (
          <div className="md:col-span-2">
            <MutualIntentPanel intent={match.mutualIntent} partnerName={first} />
          </div>
        )}

        {(match.youOffer.length > 0 || match.theyOffer.length > 0) && (
          <Block title="Complementary strengths" className="md:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-canvas p-4">
                <p className="text-sm font-semibold">You bring</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {match.youOffer.length ? match.youOffer.map((t) => <Chip key={t.id} emoji={t.emoji} tone="good">{t.label}</Chip>) : <span className="text-sm text-muted">—</span>}
                </div>
              </div>
              <div className="rounded-2xl bg-canvas p-4">
                <p className="text-sm font-semibold">{first} brings</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {match.theyOffer.length ? match.theyOffer.map((t) => <Chip key={t.id} emoji={t.emoji} tone={mode}>{t.label}</Chip>) : <span className="text-sm text-muted">—</span>}
                </div>
              </div>
            </div>
          </Block>
        )}

        {match.sharedInterests.length > 0 && (
          <Block title="Shared interests">
            <div className="flex flex-wrap gap-2">
              {match.sharedInterests.map((t) => (
                <Chip key={t.id} emoji={t.emoji}>
                  {t.label}
                </Chip>
              ))}
            </div>
          </Block>
        )}

        <Block title="Availability">
          {match.availabilityOverlap.length ? (
            <div className="flex flex-wrap gap-2">
              {match.availabilityOverlap.map((s) => (
                <Chip key={s} emoji="🕐" tone="good">
                  {TIME_SLOT_LABELS[s]}
                </Chip>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No exact overlap in your usual times — worth checking schedules.</p>
          )}
        </Block>

        <Block title={`What you could ${mode === 'learn' ? 'work on' : 'do'} together`} className="md:col-span-2">
          <ul className="grid gap-2 sm:grid-cols-3">
            {narrative.ideas.map((idea) => (
              <li key={idea} className="rounded-2xl bg-cream p-4 text-sm font-medium text-ink">
                {idea}
              </li>
            ))}
          </ul>
        </Block>

        {detail.lookingFor && !match.mutualIntent && (
          <Block title={`In ${first}’s words`}>
            <p className="text-lg font-semibold text-ink-soft">“{detail.lookingFor}”</p>
          </Block>
        )}

        {match.caveats.length > 0 && (
          <Block title="Worth knowing">
            <ul className="space-y-2 text-sm text-ink-soft">
              {match.caveats.map((c) => (
                <li key={c}>• {c}</li>
              ))}
            </ul>
          </Block>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted">
        Was this a good suggestion?
        <button
          type="button"
          onClick={() => void sendFeedback('good')}
          aria-pressed={feedback === 'good'}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold ${feedback === 'good' ? 'border-good bg-good-soft text-good' : 'border-line bg-white text-ink-soft'}`}
        >
          <ThumbsUp className="size-4" aria-hidden /> Good match
        </button>
        <button
          type="button"
          onClick={() => void sendFeedback('not_for_me')}
          aria-pressed={feedback === 'not_for_me'}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold ${feedback === 'not_for_me' ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft'}`}
        >
          <ThumbsDown className="size-4" aria-hidden /> Not for me
        </button>
      </div>

      {/* Sticky CTA */}
      <div className="glass fixed inset-x-0 bottom-[4.25rem] z-30 border-t border-line/70 px-4 py-3 md:bottom-0">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <p className="hidden items-center gap-2 text-sm text-muted sm:flex">
            <Lock className="size-4 text-rose" aria-hidden /> {first} only finds out if they choose you too.
          </p>
          {detail.status === 'mutual' && detail.partnershipId ? (
            <ButtonLink to={`/app/partnership/${detail.partnershipId}`} variant="primary" size="lg" className="w-full sm:w-auto">
              Open your partnership
            </ButtonLink>
          ) : detail.status === 'pending' ? (
            <span className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-cream px-6 font-semibold text-ink-soft sm:w-auto">
              <Clock className="size-5" aria-hidden /> Sent privately — waiting on {first}
            </span>
          ) : (
            <Button
              variant="brand"
              size="lg"
              className="w-full sm:w-auto"
              loading={busyId === profile.id}
              onClick={() => void partnerUp(profile, mode, intent)}
              icon={busyId !== profile.id && <Handshake className="size-5" aria-hidden />}
            >
              Partner Up with {first}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
