import { motion } from 'framer-motion';
import { Check, Clock, Handshake } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MatchCard as MatchCardData, Mode } from '../../../shared/types';
import { MODE_THEMES } from '../../lib/modes';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { ScoreRing } from '../ui/ScoreRing';
import { ReasonList } from './ReasonList';

interface MatchCardProps {
  card: MatchCardData;
  mode: Mode;
  rank: number;
  featured?: boolean;
  onPartnerUp: () => void;
  busy?: boolean;
  detailState?: unknown;
}

export function PersonaBadge() {
  return (
    <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase" title="Fictional demo profile">
      Demo profile
    </span>
  );
}

export function MatchCard({ card, mode, rank, featured, onPartnerUp, busy, detailState }: MatchCardProps) {
  const { profile, match } = card;
  const theme = MODE_THEMES[mode];
  const first = profile.displayName.split(' ')[0];
  const context = [profile.community, profile.city].filter(Boolean).join(' · ');
  const detailHref = `/app/match/${profile.id}?mode=${mode}`;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * rank, duration: 0.35 }}
      className={`card relative flex flex-col overflow-hidden ${featured ? 'p-5 sm:p-6' : 'p-4 sm:p-5'}`}
      aria-labelledby={`match-${profile.id}`}
    >
      {featured && rank === 0 && (
        <span className="absolute top-0 right-0 rounded-bl-2xl bg-ink px-3 py-1 text-xs font-semibold text-white">Strongest match</span>
      )}
      <div className="flex items-start gap-4">
        <Avatar name={profile.displayName} hue={profile.avatarHue} size={featured ? 'lg' : 'md'} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={`match-${profile.id}`} className={`font-bold ${featured ? 'text-xl' : 'text-lg'}`}>
              {profile.displayName}
            </h3>
            {profile.isDemoPersona && <PersonaBadge />}
          </div>
          {context && <p className="truncate text-sm text-muted">{context}</p>}
          <p className={`mt-1 text-sm font-semibold ${theme.text}`}>{card.headline}</p>
        </div>
        <ScoreRing score={match.score} size={featured ? 76 : 60} stroke={featured ? 8 : 7} />
      </div>

      {card.highlights.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {card.highlights.map((t) => (
            <Chip key={t.id} emoji={t.emoji} size="sm" tone={mode}>
              {t.label}
            </Chip>
          ))}
        </div>
      )}

      {featured && match.reasons.length > 1 && (
        <div className="mt-4 rounded-2xl bg-canvas p-4">
          <p className="eyebrow mb-3">Why you match</p>
          <ReasonList reasons={match.reasons.slice(0, 3)} compact />
        </div>
      )}
      {!featured && match.reasons[1] && <p className="mt-3 text-sm text-ink-soft">{match.reasons[1].title}</p>}
      {match.caveats[0] && featured && <p className="mt-3 text-xs text-muted">Worth knowing: {match.caveats[0]}</p>}

      <div className="mt-5 flex gap-2">
        <Link
          to={detailHref}
          state={detailState}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-line-strong bg-white px-4 text-sm font-semibold text-ink hover:border-ink/30"
        >
          View match
        </Link>
        {card.status === 'mutual' ? (
          <span className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-good-soft px-4 text-sm font-semibold text-good">
            <Check className="size-4" aria-hidden /> Partners
          </span>
        ) : card.status === 'pending' ? (
          <span className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-cream px-4 text-sm font-semibold text-ink-soft">
            <Clock className="size-4" aria-hidden /> Sent privately
          </span>
        ) : (
          <Button variant="brand" className="flex-1" onClick={onPartnerUp} loading={busy} icon={!busy && <Handshake className="size-4" aria-hidden />} aria-label={`Partner Up with ${first}`}>
            Partner Up
          </Button>
        )}
      </div>
    </motion.article>
  );
}
