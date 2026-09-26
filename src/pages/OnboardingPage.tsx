import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles, Wand2 } from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { GROUP_SIZES, SETTINGS, TIME_SLOTS, type GroupSize, type Mode, type Setting, type TimeSlot } from '../../shared/types';
import { GROUP_SIZE_LABELS, SETTING_LABELS, TIME_SLOT_LABELS } from '../../shared/labels';
import { PartnerDnaCard } from '../components/dna/PartnerDnaCard';
import { ModeCard } from '../components/modes/ModeCard';
import { ContactsEditor } from '../components/profile/ContactsEditor';
import { Button, ButtonLink } from '../components/ui/Button';
import { ChoiceChips } from '../components/ui/ChoiceChips';
import { PageLoader } from '../components/ui/Feedback';
import { TextAreaField, TextField } from '../components/ui/Field';
import { useToast } from '../components/ui/Toast';
import { ModeQuestions } from '../features/survey/ModeQuestions';
import { applyDraft, initialSurvey, toModeInput, validateSurvey, type SurveyState } from '../features/survey/surveyState';
import { api, errorMessage } from '../lib/api';
import { useMe } from '../lib/me';
import { isMode, MODE_ORDER, MODE_THEMES } from '../lib/modes';

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="card space-y-5 p-5 sm:p-7">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function ModePicker() {
  const navigate = useNavigate();
  const { me } = useMe();
  const done = new Set(me?.modeProfiles.map((m) => m.mode));
  return (
    <div className="mx-auto max-w-5xl">
      <p className="eyebrow">Step 1 of 2</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Who are you looking for right now?</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">Pick a mode. Your answers stay specific to it — a great study partner and a great gaming partner aren’t the same person.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {MODE_ORDER.map((mode) => (
          <ModeCard key={mode} mode={mode} onSelect={(m) => navigate(`/app/start/${m}`)} badge={done.has(mode) ? 'Set up' : undefined} />
        ))}
      </div>
    </div>
  );
}

function Survey({ mode }: { mode: Mode }) {
  const { me, setMe } = useMe();
  const navigate = useNavigate();
  const toast = useToast();
  const theme = MODE_THEMES[mode];
  const isNew = !me?.profile;
  const [state, setState] = useState<SurveyState>(() => initialSurvey(me, mode));
  const [draftText, setDraftText] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const update = (patch: Partial<SurveyState>) => setState((s) => ({ ...s, ...patch }));
  const updateProfile = (patch: Partial<SurveyState['profile']>) => setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));

  const draft = async () => {
    if (draftText.trim().length < 10) return;
    setDrafting(true);
    try {
      const res = await api.profileDraft(draftText.trim(), mode);
      const { next, filled } = applyDraft(state, res, mode);
      setState(next);
      toast(filled ? `Partner AI filled in ${filled} answer${filled === 1 ? '' : 's'} — check them below.` : 'Partner AI didn’t find anything new to add.', 'success');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setDrafting(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validateSurvey(mode, state);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const profile = { ...state.profile, city: state.profile.city || (mode === 'explore' && state.role === 'local' ? state.exploringCity : state.profile.city) };
      await api.saveProfile(profile);
      let latest = await api.saveModeProfile(mode, toModeInput(mode, state));
      const contacts = state.contacts.filter((c) => c.value.trim());
      if (JSON.stringify(contacts) !== JSON.stringify(me?.contacts ?? [])) latest = await api.saveContacts(contacts);
      if (isNew || !me?.modeProfiles.some((m) => m.mode === mode)) latest = await api.regenerateDna();
      setMe(latest);
      setFinished(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (finished && me?.dna && me.profile) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-3xl">
        <p className="eyebrow">You’re all set</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Meet your Partner DNA</h1>
        <p className="mt-2 text-ink-soft">This is how Partner AI understands you. It’s built only from what you told us, and you can edit it anytime.</p>
        <div className="mt-6">
          <PartnerDnaCard dna={me.dna} name={me.profile.displayName} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="brand" size="lg" onClick={() => navigate(`/app/discover?mode=${mode}`)} icon={<Sparkles className="size-5" aria-hidden />}>
            Find my {theme.name} partners
          </Button>
          <ButtonLink to="/app/start" variant="secondary" size="lg">
            Set up another mode
          </ButtonLink>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5" noValidate>
      <Link to="/app/start" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All modes
      </Link>
      <div>
        <p className="eyebrow">Step 2 of 2</p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold sm:text-4xl">
          <span aria-hidden>{theme.emoji}</span> {theme.name}: {theme.tagline}
        </h1>
        <p className="mt-2 text-ink-soft">A few quick questions — about a minute. Only what helps Partner AI find the right people.</p>
      </div>

      <section className={`rounded-3xl border ${theme.border} ${theme.soft} p-5 sm:p-6`}>
        <label htmlFor="nl-draft" className="flex items-center gap-2 font-display text-lg font-bold">
          <Sparkles className={`size-5 ${theme.text}`} aria-hidden /> Just tell Partner AI instead
        </label>
        <p className="mt-1 text-sm text-ink-soft">Describe yourself in a sentence or two. Partner AI fills in the form — you check it.</p>
        <textarea
          id="nl-draft"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          rows={3}
          maxLength={1200}
          className="mt-3 w-full resize-y rounded-2xl border border-white bg-white px-4 py-3 text-[15px] focus:border-rose/60 focus:outline-none focus:ring-4 focus:ring-rose/15"
          placeholder={
            mode === 'learn'
              ? "I'm a freshman studying engineering. I'm struggling with chemistry but pretty good at calculus. I'd like 2 or 3 people to study with at night."
              : mode === 'explore'
                ? "I'm an international student from India who just moved to Atlanta. I love food, photography and music."
                : "I'm a CS student who plays Valorant most nights, follows F1 and likes small Discord groups."
          }
        />
        <Button variant="primary" className="mt-3" onClick={draft} loading={drafting} disabled={draftText.trim().length < 10} icon={!drafting && <Wand2 className="size-4" aria-hidden />}>
          Fill in my answers
        </Button>
      </section>

      <Section title={isNew ? 'About you' : 'The basics'} subtitle="Shown to potential partners. Email is never shown.">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="First name" value={state.profile.displayName} onChange={(e) => updateProfile({ displayName: e.target.value })} maxLength={60} autoComplete="given-name" required />
          <TextField
            label="Age"
            type="number"
            inputMode="numeric"
            min={13}
            max={120}
            value={state.profile.age ?? ''}
            onChange={(e) => updateProfile({ age: e.target.value ? Number(e.target.value) : null })}
            optional
          />
          <TextField label="University, company or community" value={state.profile.community ?? ''} onChange={(e) => updateProfile({ community: e.target.value || null })} maxLength={80} optional />
          <TextField label="City" value={state.profile.city ?? ''} onChange={(e) => updateProfile({ city: e.target.value || null })} maxLength={80} optional />
          <TextField label="Pronouns" value={state.profile.pronouns ?? ''} onChange={(e) => updateProfile({ pronouns: e.target.value || null })} maxLength={30} placeholder="e.g. she/her" optional />
        </div>
        <TextAreaField label="Short bio" value={state.profile.bio} onChange={(e) => updateProfile({ bio: e.target.value })} maxLength={600} rows={3} optional />
      </Section>

      <Section title={`${theme.emoji} ${theme.name} questions`}>
        <ModeQuestions mode={mode} state={state} update={update} updateProfile={updateProfile} />
      </Section>

      <Section title="When & how" subtitle="Helps us find people you can actually meet.">
        <ChoiceChips<TimeSlot>
          label="When are you usually free?"
          options={TIME_SLOTS.map((v) => ({ value: v, label: TIME_SLOT_LABELS[v] }))}
          value={state.profile.availability}
          onChange={(availability) => updateProfile({ availability })}
        />
        <ChoiceChips<GroupSize>
          label="Do you prefer…"
          options={GROUP_SIZES.map((v) => ({ value: v, label: GROUP_SIZE_LABELS[v] }))}
          value={state.profile.groupSizes}
          onChange={(groupSizes) => updateProfile({ groupSizes })}
        />
        <ChoiceChips<Setting>
          label="Online, in person, or either?"
          single
          options={SETTINGS.map((v) => ({ value: v, label: SETTING_LABELS[v] }))}
          value={[state.profile.setting]}
          onChange={([setting]) => setting && updateProfile({ setting })}
        />
      </Section>

      <Section title="After you match" subtitle="How should a mutual partner reach you? Optional — you can add this later.">
        <ContactsEditor value={state.contacts} onChange={(contacts) => update({ contacts })} />
      </Section>

      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl bg-blush px-4 py-3 text-sm font-medium text-rose-deep" role="alert">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      <div className="pointer-events-none sticky bottom-24 z-30 flex justify-end md:bottom-6">
        <Button type="submit" variant="brand" size="lg" className="pointer-events-auto" loading={saving} icon={!saving && <ArrowRight className="size-5" aria-hidden />}>
          {isNew ? 'Create my Partner DNA' : 'Save answers'}
        </Button>
      </div>
    </form>
  );
}

export function OnboardingPage() {
  const params = useParams();
  const { me, loading } = useMe();
  const mode = useMemo(() => (isMode(params.mode) ? params.mode : null), [params.mode]);
  if (loading && !me) return <PageLoader />;
  return mode ? <Survey key={mode} mode={mode} /> : <ModePicker />;
}
