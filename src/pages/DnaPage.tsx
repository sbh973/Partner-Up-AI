import { motion } from 'framer-motion';
import { Dna, MapPin, Save, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { DNA_FIELD_LABELS, TIME_SLOT_LABELS } from '../../shared/labels';
import { TIME_SLOTS, type PartnerDNA } from '../../shared/types';
import { MuseAvatar } from '../components/brand/Logo';
import { ButtonLink, Button } from '../components/ui/Button';
import { ChoiceChips } from '../components/ui/ChoiceChips';
import { TextAreaField, TextField } from '../components/ui/Field';
import { TagInput } from '../components/ui/TagInput';
import { useToast } from '../components/ui/Toast';
import { api, errorMessage } from '../lib/api';
import { timeAgo } from '../lib/format';
import { useSession } from '../lib/session';

type Editable = Omit<PartnerDNA, 'lastSource' | 'updatedAt'>;

const EMPTY: Editable = {
  about: '',
  interests: [],
  skills: [],
  learning: [],
  goals: [],
  needs: [],
  offers: [],
  location: null,
  availability: [],
  preferences: [],
  languages: [],
};

const GROUPS: { title: string; blurb: string; fields: { key: 'interests' | 'skills' | 'learning' | 'goals' | 'needs' | 'offers' | 'preferences' | 'languages'; hint: string; suggestions: string[] }[] }[] = [
  {
    title: 'What you bring',
    blurb: 'Muse uses these to find people who need you.',
    fields: [
      { key: 'skills', hint: 'Things you can do well.', suggestions: ['Programming', 'UI/UX design', 'Public speaking', 'Data science', 'Hardware'] },
      { key: 'offers', hint: 'What you’re happy to help others with.', suggestions: ['Tutoring', 'Code reviews', 'Mentoring', 'Rides'] },
      { key: 'interests', hint: 'What you love talking about or doing.', suggestions: ['Hackathons', 'Robotics', 'Climbing', 'Food', 'Music', 'Photography'] },
    ],
  },
  {
    title: 'What you’re looking for',
    blurb: 'Muse uses these to find people who complement you.',
    fields: [
      { key: 'goals', hint: 'What you want to get done.', suggestions: ['Win a hackathon', 'Start a club', 'Find a roommate', 'Explore Atlanta'] },
      { key: 'needs', hint: 'Skills or help you’re missing.', suggestions: ['Designer', 'Backend developer', 'Study partner'] },
      { key: 'learning', hint: 'What you’re working on learning.', suggestions: ['Calc II', 'React', 'Spanish', 'Machine learning'] },
    ],
  },
  {
    title: 'How you like to work',
    blurb: 'Softer signals — used gently, never as hard filters.',
    fields: [
      { key: 'preferences', hint: 'Style, vibe, living habits.', suggestions: ['Small groups', 'In person', 'Quiet', 'Tidy', 'Night owl', 'Early riser'] },
      { key: 'languages', hint: 'Languages you’re comfortable in.', suggestions: ['English', 'Spanish', 'Hindi', 'Mandarin', 'Korean'] },
    ],
  },
];

function editable(dna: PartnerDNA | null | undefined): Editable {
  if (!dna) return EMPTY;
  const { lastSource: _s, updatedAt: _u, ...rest } = dna;
  return rest;
}

/** "Your Partner DNA — what Muse understands about you." Fully editable; nothing is hidden. */
export function DnaPage() {
  const { me, setMe } = useSession();
  const toast = useToast();
  const [draft, setDraft] = useState<Editable>(() => editable(me?.dna));
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(editable(me?.dna));

  const set = <K extends keyof Editable>(key: K, value: Editable[K]) => setDraft((d) => ({ ...d, [key]: value }));

  async function save() {
    setBusy(true);
    try {
      setMe(await api.dnaSave({ ...draft, location: draft.location?.trim() || null }));
      toast('Partner DNA saved. Muse will use it for your next search.', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  const source = me?.dna?.lastSource;

  return (
    <div className="mx-auto max-w-4xl pb-28">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow flex items-center gap-1.5">
            <Dna className="size-3.5" aria-hidden /> Scout
          </p>
          <h1 className="mt-2 text-4xl sm:text-5xl">Your Partner DNA</h1>
          <p className="mt-2 max-w-xl text-ink-2">What Muse understands about you. Edit anything — Muse never changes it without showing you.</p>
          {me?.dna?.updatedAt && (
            <p className="mt-2 text-xs font-semibold text-muted">
              Last updated {timeAgo(me.dna.updatedAt)}
              {source === 'muse' ? ' from a conversation with Muse' : source === 'offline' ? ' from a conversation (offline matching)' : source === 'manual' ? ' by you' : ''}
            </p>
          )}
        </div>
        <ButtonLink to="/app/scout" variant="secondary" icon={<Sparkles className="size-4" aria-hidden />}>
          Ask Muse
        </ButtonLink>
      </header>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card mt-8 p-6">
        <div className="flex items-start gap-3">
          <MuseAvatar size="sm" />
          <div className="flex-1">
            <TextAreaField label="About you" hint="A sentence or two, in your own words." value={draft.about} onChange={(e) => set('about', e.target.value)} maxLength={600} rows={3} />
          </div>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="relative">
            <TextField label={DNA_FIELD_LABELS.location} hint="Campus or city, e.g. KSU or Atlanta." value={draft.location ?? ''} onChange={(e) => set('location', e.target.value)} maxLength={60} />
            <MapPin className="pointer-events-none absolute top-[2.9rem] right-4 size-4 text-muted" aria-hidden />
          </div>
          <ChoiceChips label={DNA_FIELD_LABELS.availability} options={TIME_SLOTS.map((t) => ({ value: t, label: TIME_SLOT_LABELS[t] }))} value={draft.availability} onChange={(v) => set('availability', v)} />
        </div>
      </motion.section>

      {GROUPS.map((g, gi) => (
        <motion.section key={g.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * (gi + 1) }} className="card mt-5 p-6">
          <h2 className="text-xl">{g.title}</h2>
          <p className="mt-1 text-sm text-muted">{g.blurb}</p>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            {g.fields.map((f) => (
              <TagInput key={f.key} label={DNA_FIELD_LABELS[f.key]} hint={f.hint} value={draft[f.key]} onChange={(v) => set(f.key, v)} suggestions={f.suggestions} max={f.key === 'languages' ? 10 : 12} />
            ))}
          </div>
        </motion.section>
      ))}

      <div className={`fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 transition-all md:bottom-6 ${dirty ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`} aria-hidden={!dirty}>
        <div className="flex items-center gap-3 rounded-full bg-ink p-2 pl-5 text-white shadow-lift">
          <span className="text-sm font-semibold">Unsaved changes</span>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => setDraft(editable(me?.dna))} tabIndex={dirty ? 0 : -1}>
            Discard
          </Button>
          <Button variant="scout" size="sm" loading={busy} icon={<Save className="size-4" aria-hidden />} onClick={() => void save()} tabIndex={dirty ? 0 : -1}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
