import { motion } from 'framer-motion';
import { Check, Clock, Sparkles, TriangleAlert, UsersRound } from 'lucide-react';
import type { ScoutConnectionView, ScoutGroup } from '../../../shared/types';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { DemoTag } from './PersonCard';

interface GroupCardProps {
  group: ScoutGroup;
  connections: Map<string, ScoutConnectionView>;
  busy: boolean;
  onPartnerUp: () => void;
}

/** "Your Group" reveal — members, what each contributes, and why it works. */
export function GroupCard({ group, connections, busy, onPartnerUp }: GroupCardProps) {
  const others = group.members.filter((m) => !m.isYou);
  const sent = others.every((m) => connections.has(m.person.id));
  return (
    <motion.article initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 20 }} className="card overflow-hidden">
      <div className="grad-scout flex items-center justify-between px-5 py-4">
        <p className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <UsersRound className="size-5" aria-hidden /> Your Group
        </p>
        <span className="rounded-full bg-white/70 px-3 py-1 text-sm font-extrabold">{group.score}% fit</span>
      </div>
      <div className="p-5">
        <ul className="grid gap-3 sm:grid-cols-2">
          {group.members.map((m, i) => {
            const c = connections.get(m.person.id);
            return (
              <motion.li
                key={m.person.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.08 }}
                className={`flex items-center gap-3 rounded-2xl border p-3 ${m.isYou ? 'border-sky bg-scout-surface' : 'border-line'}`}
              >
                <Avatar name={m.person.firstName} hue={m.person.avatarHue} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-bold">
                    {m.isYou ? 'You' : m.person.firstName} {m.person.isDemoPersona && <DemoTag />}
                  </p>
                  <p className="truncate text-sm font-medium text-ink-2">{m.contributes.length ? m.contributes.join(' / ') : 'Shares the interest'}</p>
                </div>
                {!m.isYou && c && (
                  <span className={`shrink-0 ${c.status === 'connected' ? 'text-good' : 'text-sky-ink'}`} title={c.status === 'connected' ? 'Said yes' : 'Waiting'}>
                    {c.status === 'connected' ? <Check className="size-5" aria-label="Said yes" /> : <Clock className="size-5" aria-label="Waiting" />}
                  </span>
                )}
              </motion.li>
            );
          })}
        </ul>

        <div className="mt-5 rounded-2xl bg-scout-surface p-4">
          <p className="eyebrow mb-1.5 flex items-center gap-1.5">
            <Sparkles className="size-3.5" aria-hidden /> Why this group works
          </p>
          <p className="font-semibold">{group.explanation}</p>
          {group.summary && group.summary !== group.explanation && <p className="mt-2 text-sm text-ink-2">{group.summary}</p>}
        </div>

        {(group.covered.length > 0 || group.missing.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {group.covered.map((t) => (
              <Chip key={t.id} size="sm" tone="good" icon={<Check className="size-3" aria-hidden />}>
                {t.label}
              </Chip>
            ))}
            {group.missing.map((t) => (
              <Chip key={t.id} size="sm" tone="warn" icon={<TriangleAlert className="size-3" aria-hidden />}>
                Missing {t.label}
              </Chip>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {sent ? (
            <p className="text-sm font-semibold text-ink-2">Requests sent. Everyone decides for themselves — contact info unlocks per person once they say yes.</p>
          ) : (
            <>
              <Button variant="scout" onClick={onPartnerUp} loading={busy}>
                Partner Up with the group
              </Button>
              <p className="text-xs text-muted">No one is added to a group without saying yes.</p>
            </>
          )}
        </div>
      </div>
    </motion.article>
  );
}
