import { motion } from 'framer-motion';
import { Search, Sparkles, TriangleAlert, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { GroupMember, MissingPartnerSuggestion, StudyGroupSuggestion, SubjectCoverage } from '../../shared/types';
import { PersonaBadge } from '../components/match/MatchCard';
import { Avatar } from '../components/ui/Avatar';
import { Button, ButtonLink } from '../components/ui/Button';
import { ChoiceChips } from '../components/ui/ChoiceChips';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/Feedback';
import { ScoreRing } from '../components/ui/ScoreRing';
import { TagInput } from '../components/ui/TagInput';
import { useToast } from '../components/ui/Toast';
import { api, errorMessage } from '../lib/api';
import { useMe } from '../lib/me';

function CoverageBars({ coverage }: { coverage: SubjectCoverage[] }) {
  return (
    <ul className="space-y-3">
      {coverage.map((c, i) => {
        const pct = Math.round(c.coverage * 100);
        const strong = c.coverage >= 0.75;
        return (
          <li key={c.subject.id}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold text-ink">
                <span aria-hidden>{c.subject.emoji}</span> {c.subject.label}
              </span>
              <span className="text-xs text-muted">{strong ? `Covered by ${c.coveredBy.join(' & ')}` : 'Gap'}</span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-[#f6eec9]" role="img" aria-label={`${c.subject.label}: ${pct}% covered`}>
              <motion.div
                className={`h-full rounded-full ${strong ? 'brand-gradient' : 'bg-warn/60'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(3, pct)}%` }}
                transition={{ duration: 0.7, delay: 0.07 * i }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function MemberCard({ member }: { member: GroupMember }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <Avatar name={member.profile.displayName} hue={member.profile.avatarHue} />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {member.isYou ? 'You' : member.profile.displayName} {member.profile.isDemoPersona && <PersonaBadge />}
          </p>
          <p className="truncate text-xs text-muted">{member.profile.community}</p>
        </div>
      </div>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-muted uppercase">Strong</span>
          {member.strengths.map((t) => (
            <Chip key={t.id} size="sm" tone="good" emoji={t.emoji}>
              {t.label}
            </Chip>
          ))}
        </div>
        {member.needs.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-muted uppercase">Needs</span>
            {member.needs.map((t) => (
              <Chip key={t.id} size="sm" tone="learn" emoji={t.emoji}>
                {t.label}
              </Chip>
            ))}
          </div>
        )}
        {member.gives.length > 0 && <p className="text-ink-soft">🎁 Gives {member.gives.join(', ')}</p>}
        {member.gets.length > 0 && <p className="text-ink-soft">🌱 Gets {member.gets.join(', ')}</p>}
      </div>
    </div>
  );
}

export function GroupsPage() {
  const { me } = useMe();
  const toast = useToast();
  const learn = me?.modeProfiles.find((m) => m.mode === 'learn');
  const defaults = useMemo(() => {
    const d = learn?.details;
    return d?.kind === 'learn' ? [...d.needs, ...d.strengths].slice(0, 5) : [];
  }, [learn]);
  const [subjects, setSubjects] = useState<string[]>(defaults);
  const [size, setSize] = useState<'3' | '4'>('3');
  const [group, setGroup] = useState<StudyGroupSuggestion | null>(null);
  const [extra, setExtra] = useState<GroupMember[]>([]);
  const [missing, setMissing] = useState<MissingPartnerSuggestion | null>(null);
  const [busy, setBusy] = useState<null | 'build' | 'missing' | 'partner'>(null);

  if (!learn) {
    return (
      <EmptyState
        emoji="📚"
        title="Study groups live in Learn mode"
        body="Tell Partner AI what you’re strong in and what you need help with — then we’ll build a group where everyone covers someone else’s gap."
        action={<ButtonLink to="/app/start/learn" variant="brand">Set up Learn</ButtonLink>}
      />
    );
  }

  const build = async () => {
    setBusy('build');
    setMissing(null);
    setExtra([]);
    try {
      setGroup(await api.buildGroup(subjects.length ? subjects : undefined, Number(size)));
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  const findMissing = async () => {
    if (!group?.missing) return;
    setBusy('missing');
    try {
      const ids = group.members.filter((m) => !m.isYou).map((m) => m.profile.id);
      setMissing(await api.completeGroup(ids, group.subjects.map((s) => s.label), group.missing.subject.label));
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  const addMissing = () => {
    if (!group || !missing?.candidate) return;
    const candidate = missing.candidate;
    setExtra((x) => [...x, candidate]);
    setGroup({
      ...group,
      coverage: group.coverage.map((c) =>
        c.subject.id === missing.subject.id ? { ...c, coverage: missing.coverageAfter, coveredBy: [...c.coveredBy, candidate.profile.displayName.split(' ')[0]] } : c,
      ),
      missing: null,
    });
    setMissing(null);
  };

  const partnerUpAll = async () => {
    if (!group) return;
    setBusy('partner');
    try {
      const ids = [...group.members.filter((m) => !m.isYou), ...extra].map((m) => m.profile.id);
      const { results } = await api.partnerUpGroup(ids, group.subjects.map((s) => s.label));
      const mutual = results.filter((r) => r.status === 'mutual').length;
      const pending = results.length - mutual;
      toast(
        `${mutual ? `${mutual} mutual partnership${mutual === 1 ? '' : 's'}! ` : ''}${pending ? `${pending} request${pending === 1 ? '' : 's'} sent privately.` : ''}`.trim(),
        'success',
      );
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  const members = group ? [...group.members, ...extra] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">Build a study group</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">
          Partner AI finds people whose strengths cover each other’s weaknesses — so everyone contributes, and nobody is just “the tutor.”
        </p>
      </div>

      <section className="card space-y-5 p-5 sm:p-6">
        <TagInput
          label="Subjects the group should cover"
          value={subjects}
          onChange={setSubjects}
          suggestions={['Calculus', 'Chemistry', 'Python', 'Physics', 'Statistics', 'Biology', 'Linear algebra']}
          max={6}
        />
        <ChoiceChips<'3' | '4'>
          label="Group size (including you)"
          single
          options={[
            { value: '3', label: '3 people' },
            { value: '4', label: '4 people' },
          ]}
          value={[size]}
          onChange={([v]) => v && setSize(v)}
        />
        <Button variant="brand" size="lg" onClick={() => void build()} loading={busy === 'build'} disabled={subjects.length === 0} icon={busy !== 'build' && <Sparkles className="size-5" aria-hidden />}>
          Build my study group
        </Button>
      </section>

      {group && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <section className="card grid gap-6 p-5 sm:p-6 md:grid-cols-[auto_1fr] md:items-center">
            <div className="flex flex-col items-center">
              <ScoreRing score={group.complementarity} size={128} stroke={11} />
              <p className="mt-2 text-xs font-bold tracking-[0.14em] text-muted uppercase">Group complementarity</p>
            </div>
            <div>
              <p className="eyebrow flex items-center gap-1.5">
                <UsersRound className="size-3.5" aria-hidden /> AI-built study group
              </p>
              <p className="mt-2 text-lg leading-snug font-semibold">{group.explanation}</p>
              <div className="mt-5">
                <p className="eyebrow mb-3">Knowledge coverage</p>
                <CoverageBars coverage={group.coverage} />
              </div>
            </div>
          </section>

          {group.missing && (
            <section className="flex flex-col gap-3 rounded-3xl border border-warn/30 bg-warn-soft p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2 text-sm text-ink">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
                <span>
                  <strong>Missing strength:</strong> nobody in this group is strong in {group.missing.subject.label} yet.
                </span>
              </p>
              <Button variant="primary" size="sm" onClick={() => void findMissing()} loading={busy === 'missing'} icon={busy !== 'missing' && <Search className="size-4" aria-hidden />}>
                Find missing partner
              </Button>
            </section>
          )}

          {missing && (
            <section className="card p-5">
              {missing.candidate ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <p className="eyebrow">Best fit for {missing.subject.label}</p>
                    <div className="mt-3">
                      <MemberCard member={missing.candidate} />
                    </div>
                  </div>
                  <Button variant="brand" onClick={addMissing}>
                    Add to group
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-ink-soft">No one strong in {missing.subject.label} is looking right now. Try again later or drop the subject.</p>
              )}
            </section>
          )}

          <section aria-labelledby="members-title">
            <h2 id="members-title" className="mb-3 text-xl font-bold">
              Who’s in it
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {members.map((m) => (
                <MemberCard key={m.profile.id} member={m} />
              ))}
            </div>
          </section>

          <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-soft">
              Each person still decides for themselves — groups never skip consent. Mutual partners appear in{' '}
              <Link to="/app/matches" className="font-semibold text-ink underline underline-offset-4">
                Matches
              </Link>
              .
            </p>
            <Button variant="brand" onClick={() => void partnerUpAll()} loading={busy === 'partner'}>
              Partner Up with this group
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
