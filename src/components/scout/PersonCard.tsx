import { motion } from 'framer-motion';
import { Check, Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ScoutCandidate, ScoutConnectionView } from '../../../shared/types';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { ScoreRing } from '../ui/ScoreRing';

interface PersonCardProps {
  candidate: ScoutCandidate;
  index: number;
  connection: ScoutConnectionView | null;
  busy: boolean;
  onPartnerUp: () => void;
  onDismiss: () => void;
}

export function DemoTag() {
  return (
    <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[10px] font-bold tracking-wide text-muted uppercase" title="Fictional demo profile">
      Demo profile
    </span>
  );
}

/** A curated match — not a swipe card. Always shows why. */
export function PersonCard({ candidate, index, connection, busy, onPartnerUp, onDismiss }: PersonCardProps) {
  const p = candidate.person;
  const status = connection?.status ?? candidate.connectionStatus;
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * index }}
      className="card overflow-hidden"
      aria-labelledby={`person-${p.id}`}
    >
      {index === 0 && <div className="grad-scout px-5 py-2 text-xs font-bold tracking-wide uppercase">Muse found someone</div>}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <Avatar name={p.firstName} hue={p.avatarHue} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id={`person-${p.id}`} className="text-2xl">
                {p.firstName}
              </h3>
              {p.isDemoPersona && <DemoTag />}
            </div>
            <p className="flex items-center gap-1 text-sm font-medium text-muted">
              {p.age && <span>{p.age}</span>}
              {p.location && (
                <>
                  <span aria-hidden>·</span>
                  <MapPin className="size-3.5" aria-hidden />
                  {p.location}
                </>
              )}
            </p>
            {p.roles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.roles.map((r) => (
                  <Chip key={r} size="sm" tone="scout">
                    {r}
                  </Chip>
                ))}
              </div>
            )}
          </div>
          <ScoreRing score={candidate.score} size={64} stroke={7} />
        </div>

        <div className="mt-4 rounded-2xl bg-scout-surface p-4">
          <p className="eyebrow mb-2">Why Muse matched you</p>
          <ul className="space-y-1.5">
            {candidate.reasons.map((r) => (
              <li key={r.text} className="flex gap-2 text-sm font-medium">
                <Check className="mt-0.5 size-4 shrink-0 text-sky-ink" aria-hidden />
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
          {candidate.caveats[0] && <p className="mt-2 text-xs font-medium text-muted">Worth knowing: {candidate.caveats[0]}</p>}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {status === 'connected' && connection ? (
            <Link to={`/app/scout/connection/${connection.id}`} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-good-soft px-5 font-bold text-good">
              <Check className="size-4" aria-hidden /> Connected — see contact info
            </Link>
          ) : status === 'pending' || status === 'suggested' ? (
            <span className="inline-flex min-h-12 items-center gap-2 rounded-full bg-sky-soft px-5 font-bold text-sky-ink">
              <Clock className="size-4" aria-hidden /> Waiting for {p.firstName} to say yes
            </span>
          ) : (
            <>
              <Button variant="scout" onClick={onPartnerUp} loading={busy}>
                Partner Up
              </Button>
              <Button variant="ghost" onClick={onDismiss}>
                Not for me
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.article>
  );
}
