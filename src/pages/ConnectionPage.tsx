import { motion } from 'framer-motion';
import { ArrowLeft, Check, Clock, Lock, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ContactList } from '../components/mutual/ContactList';
import { DemoTag } from '../components/scout/PersonCard';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { ErrorNote, PageLoader } from '../components/ui/Feedback';
import { ScoreRing } from '../components/ui/ScoreRing';
import { useToast } from '../components/ui/Toast';
import { api, errorMessage } from '../lib/api';
import { timeAgo } from '../lib/format';
import { useSession } from '../lib/session';
import { useLoad } from '../lib/useLoad';

/** One Scout connection: why Muse matched you, the consent step, and contacts once both said yes. */
export function ConnectionPage() {
  const { id = '' } = useParams();
  const toast = useToast();
  const { me, refresh } = useSession();
  const { data: c, error, reload, setData } = useLoad(() => api.scoutConnection(id), [id]);
  const [busy, setBusy] = useState<'yes' | 'no' | null>(null);

  async function answer(accept: boolean) {
    setBusy(accept ? 'yes' : 'no');
    try {
      const next = await api.scoutRespond(id, accept);
      setData(next);
      void refresh();
      if (!accept) toast('Closed. They won’t be told why.', 'info');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!c) return <PageLoader />;

  const other = c.other;
  const needsMyAnswer = !c.youAccepted && c.status !== 'declined' && c.status !== 'connected';
  const connected = c.status === 'connected';

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/app/scout" className="mb-5 inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Back to Scout
      </Link>

      <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        <div className={`${connected ? 'grad-scout' : 'bg-scout-surface'} px-6 pt-8 pb-6 text-center`}>
          <div className="flex items-center justify-center">
            <Avatar name={me?.profile?.firstName ?? 'You'} hue={me?.profile?.avatarHue ?? 200} size="lg" className="-mr-3" />
            <motion.span initial={connected ? { scale: 0 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.15 }} className="z-10 flex size-10 items-center justify-center rounded-full bg-white shadow-soft">
              {connected ? <Check className="size-5 text-good" aria-hidden /> : <Sparkles className="size-5 text-sky-ink" aria-hidden />}
            </motion.span>
            <Avatar name={other.firstName} hue={other.avatarHue} size="lg" className="-ml-3" />
          </div>
          <p className="eyebrow mt-5">{c.origin === 'keep_looking' ? 'Muse found someone' : c.role === 'candidate' ? 'Someone wants to Partner Up' : 'Your Scout request'}</p>
          <h1 className="mt-1 text-3xl sm:text-4xl">{connected ? `You’re connected with ${other.firstName}` : other.firstName}</h1>
          <p className="mt-1 flex items-center justify-center gap-2 text-sm font-medium text-ink-2">
            {[other.age, other.location].filter(Boolean).join(' · ')} {other.isDemoPersona && <DemoTag />}
          </p>
          <p className="mt-3 text-sm font-semibold text-ink-2">For: “{c.requestSummary}” · {timeAgo(c.createdAt)}</p>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex items-start gap-4 rounded-2xl bg-scout-surface p-4">
            <ScoreRing score={c.score} size={60} stroke={7} />
            <div className="min-w-0 flex-1">
              <p className="eyebrow mb-2">Why Muse matched you</p>
              <ul className="space-y-1.5">
                {c.reasons.map((r) => (
                  <li key={r.text} className="flex gap-2 text-sm font-medium">
                    <Check className="mt-0.5 size-4 shrink-0 text-sky-ink" aria-hidden /> {r.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {connected && c.contacts ? (
            <div>
              <h2 className="mb-3 text-lg">Reach out to {other.firstName}</h2>
              <ContactList contacts={c.contacts} />
            </div>
          ) : c.status === 'declined' ? (
            <p className="rounded-2xl bg-ink/[0.04] p-4 text-sm font-semibold text-ink-2">This connection is closed. No contact info was shared.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm font-semibold">
                <Status label="You" done={c.youAccepted} />
                <Status label={other.firstName} done={c.theyAccepted} />
              </div>
              <p className="flex items-start gap-2 text-sm text-ink-2">
                <Lock className="mt-0.5 size-4 shrink-0" aria-hidden /> Contact info unlocks only when both of you say yes.
              </p>
              {needsMyAnswer && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="scout" size="lg" loading={busy === 'yes'} disabled={busy !== null} onClick={() => void answer(true)}>
                    Partner Up
                  </Button>
                  <Button variant="ghost" size="lg" loading={busy === 'no'} disabled={busy !== null} onClick={() => void answer(false)}>
                    Not for me
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </motion.article>
    </div>
  );
}

function Status({ label, done }: { label: string; done: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-2xl p-3 ${done ? 'bg-good-soft text-good' : 'bg-ink/[0.04] text-ink-2'}`}>
      {done ? <Check className="size-4" aria-hidden /> : <Clock className="size-4" aria-hidden />}
      {label}: {done ? 'said yes' : 'deciding'}
    </div>
  );
}
