import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { PartnerDNA } from '../../../shared/types';
import { api, errorMessage } from '../../lib/api';
import { MuseAvatar } from '../brand/Logo';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { MuseThinking } from './MuseThinking';
import { patchItems, type PatchItem } from './patch';
import { SourceNote } from './SourceNote';

const FIRST_QUESTION = 'Hi, I’m Muse. Tell me a little about yourself — what are you into, and what kind of people are you hoping to find?';
const EXAMPLES = [
  'I’m a CS student at KSU. I love hackathons, robotics and climbing.',
  'I’m good at Python and design, still learning React. Free most evenings.',
];

interface Turn {
  from: 'muse' | 'you';
  text: string;
  added?: PatchItem[];
  source?: 'muse' | 'offline';
}

/** Conversational Partner DNA onboarding. Every addition is shown as it happens — nothing is saved silently. */
export function MuseOnboarding({ onDone }: { onDone: (dna: PartnerDNA | null) => void }) {
  const [turns, setTurns] = useState<Turn[]>([{ from: 'muse', text: FIRST_QUESTION }]);
  const [step, setStep] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dna, setDna] = useState<PartnerDNA | null>(null);
  const [done, setDone] = useState(false);
  const finished = done || step >= 3;

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    setTurns((t) => [...t, { from: 'you', text: value }]);
    setText('');
    setBusy(true);
    setError(null);
    try {
      const res = await api.dnaExtract(value, step);
      setDna(res.dna);
      setTurns((t) => [...t, { from: 'muse', text: res.reply, added: patchItems(res.added), source: res.source }]);
      setStep((s) => s + 1);
      if (res.done) setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 text-center">
        <MuseAvatar size="lg" />
        <h1 className="mt-4 text-4xl sm:text-5xl">Meet Muse</h1>
        <p className="mt-2 text-ink-2">Three quick questions to build your Partner DNA. You’ll see exactly what Muse learns — and you can edit it anytime.</p>
        <div className="mt-4 flex justify-center gap-1.5" aria-label={`Step ${Math.min(step + 1, 3)} of 3`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1.5 w-10 rounded-full ${i < step ? 'grad-scout' : 'bg-line-strong'}`} />
          ))}
        </div>
      </div>

      <ol className="space-y-4" aria-live="polite">
        <AnimatePresence initial={false}>
          {turns.map((t, i) => (
            <motion.li key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${t.from === 'you' ? 'justify-end' : ''}`}>
              {t.from === 'muse' && <MuseAvatar size="sm" />}
              <div className={t.from === 'you' ? 'max-w-[85%] rounded-3xl rounded-br-md bg-ink px-5 py-3 font-medium text-white' : 'max-w-[85%]'}>
                {t.from === 'muse' ? (
                  <div className="card rounded-tl-md px-5 py-4">
                    <p className="text-[11px] font-bold tracking-wide text-sky-ink uppercase">Muse</p>
                    <p className="mt-1 font-medium">{t.text}</p>
                    {t.added && t.added.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {t.added.map((a, j) => (
                          <motion.span key={a.field + a.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.06 * j }}>
                            <Chip size="sm" tone="scout" icon={<Plus className="size-3" aria-hidden />}>
                              <span className="text-sky-ink/80">{a.field}:</span> {a.label}
                            </Chip>
                          </motion.span>
                        ))}
                      </div>
                    )}
                    {t.source && (
                      <div className="mt-3">
                        <SourceNote source={t.source} />
                      </div>
                    )}
                  </div>
                ) : (
                  t.text
                )}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
        {busy && (
          <li>
            <MuseThinking steps={['Reading what you shared…', 'Updating your Partner DNA…']} />
          </li>
        )}
      </ol>

      {error && (
        <p className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger" role="alert">
          {error}
        </p>
      )}

      {finished ? (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="scout" size="lg" onClick={() => onDone(dna)}>
            Start scouting
          </Button>
        </div>
      ) : (
        <>
          {step === 0 && !busy && (
            <div className="mt-5 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" onClick={() => setText(ex)} className="min-h-10 rounded-full border border-line bg-white px-4 text-left text-sm font-medium hover:border-sky">
                  {ex}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={send} className="card mt-4 flex items-end gap-2 p-2">
            <label htmlFor="muse-onboard" className="sr-only">
              Your answer
            </label>
            <textarea
              id="muse-onboard"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={2}
              maxLength={1000}
              placeholder="Type your answer…"
              className="min-h-12 flex-1 resize-none bg-transparent px-3 py-2 font-medium outline-none"
            />
            <button type="submit" disabled={!text.trim() || busy} className="grad-scout flex size-12 shrink-0 items-center justify-center rounded-full disabled:opacity-40" aria-label="Send to Muse">
              <ArrowUp className="size-5" aria-hidden />
            </button>
          </form>
          <div className="mt-3 text-center">
            <button type="button" onClick={() => onDone(dna)} className="min-h-10 px-3 text-sm font-semibold text-muted underline underline-offset-4">
              Skip for now
            </button>
          </div>
        </>
      )}
    </div>
  );
}
