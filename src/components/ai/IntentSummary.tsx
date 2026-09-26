import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import type { IntentTags, PartnerIntent } from '../../../shared/types';
import { ROLE_LABELS, TIME_SLOT_LABELS } from '../../../shared/labels';
import { MODE_THEMES } from '../../lib/modes';
import { Chip } from '../ui/Chip';

interface IntentSummaryProps {
  intent: PartnerIntent;
  tags: IntentTags;
  onAnswer?: (answer: string) => void;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-4">
      <span className="w-28 shrink-0 pt-1.5 text-xs font-semibold tracking-wide text-muted uppercase">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/** "Here's what Partner AI understood" — makes the AI's interpretation visible and correctable. */
export function IntentSummary({ intent, tags, onAnswer }: IntentSummaryProps) {
  const theme = MODE_THEMES[intent.mode];
  const [answer, setAnswer] = useState('');
  const hasTimes = intent.availability.length > 0;
  const times = intent.availability.includes('late_nights')
    ? ['At night', ...intent.availability.filter((s) => s !== 'late_nights' && s !== 'evenings').map((s) => TIME_SLOT_LABELS[s])]
    : intent.availability.map((s) => TIME_SLOT_LABELS[s]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (answer.trim() && onAnswer) onAnswer(answer.trim());
  };

  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5 sm:p-6" aria-labelledby="understood">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="understood" className="flex items-center gap-2 text-lg font-bold">
          <Brain className="size-5 text-rose" aria-hidden />
          Partner AI understood
        </h2>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${theme.soft} ${theme.text}`}>
          {theme.emoji} {theme.name}
        </span>
      </div>
      <p className="mt-2 text-lg font-semibold text-ink-soft">“{intent.summary}”</p>
      <div className="mt-4 space-y-3">
        {tags.seeks.length > 0 && (
          <Row label={intent.mode === 'learn' ? 'Needs help with' : 'Looking for'}>
            {tags.seeks.map((t) => (
              <Chip key={t.id} emoji={t.emoji} tone={intent.mode}>
                {t.label}
              </Chip>
            ))}
          </Row>
        )}
        {tags.offers.length > 0 && (
          <Row label="You offer">
            {tags.offers.map((t) => (
              <Chip key={t.id} emoji={t.emoji} tone="good">
                {t.label}
              </Chip>
            ))}
          </Row>
        )}
        {tags.interests.length > 0 && (
          <Row label="Shared domain">
            {tags.interests.map((t) => (
              <Chip key={t.id} emoji={t.emoji}>
                {t.label}
              </Chip>
            ))}
          </Row>
        )}
        {(hasTimes || intent.location || intent.role) && (
          <Row label="Context">
            {times.map((t) => (
              <Chip key={t} emoji="🕐">
                {t}
              </Chip>
            ))}
            {intent.location && (
              <Chip emoji="📍">{intent.location}</Chip>
            )}
            {intent.role && <Chip emoji="🧭">{ROLE_LABELS[intent.role]}</Chip>}
          </Row>
        )}
      </div>
      {intent.followUps.length > 0 && onAnswer && (
        <form onSubmit={submit} className="mt-5 rounded-2xl bg-cream p-4">
          <p className="text-sm font-semibold text-ink">{intent.followUps[0]}</p>
          {intent.followUps[1] && <p className="mt-1 text-sm text-ink-soft">{intent.followUps[1]}</p>}
          <div className="mt-3 flex gap-2">
            <label className="sr-only" htmlFor="followup">
              Your answer
            </label>
            <input
              id="followup"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-line-strong bg-white px-3 py-2 text-sm focus:border-rose/60 focus:outline-none"
              placeholder="A few words is enough"
              maxLength={200}
            />
            <button type="submit" className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white">
              Refine
            </button>
          </div>
        </form>
      )}
      <p className="mt-4 text-xs text-muted">
        {intent.source === 'ai' ? 'Understood by Partner AI.' : 'Understood by Partner AI’s built-in language understanding (offline mode).'} Scores are computed by our
        matching engine, not guessed by AI.
      </p>
    </motion.section>
  );
}
