import { LogOut, RefreshCw, RotateCcw, Trash2, Wand2 } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GROUP_SIZES, SETTINGS, TIME_SLOTS, type ContactMethod, type GroupSize, type ProfileInput, type Setting, type TimeSlot } from '../../shared/types';
import { GROUP_SIZE_LABELS, SETTING_LABELS, TIME_SLOT_LABELS } from '../../shared/labels';
import { PartnerDnaCard } from '../components/dna/PartnerDnaCard';
import { ContactsEditor } from '../components/profile/ContactsEditor';
import { LanguagesEditor } from '../components/profile/LanguagesEditor';
import { Button } from '../components/ui/Button';
import { ChoiceChips } from '../components/ui/ChoiceChips';
import { PageLoader } from '../components/ui/Feedback';
import { TextAreaField, TextField } from '../components/ui/Field';
import { TagInput } from '../components/ui/TagInput';
import { useToast } from '../components/ui/Toast';
import { initialSurvey } from '../features/survey/surveyState';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useMe } from '../lib/me';
import { MODE_ORDER, MODE_THEMES } from '../lib/modes';
import { saveLastDiscover } from '../lib/session';

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="card space-y-5 p-5 sm:p-6">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export function ProfilePage() {
  const { me, setMe, refresh } = useMe();
  const { signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileInput | null>(() => (me ? initialSurvey(me, 'connect').profile : null));
  const [contacts, setContacts] = useState<ContactMethod[]>(me?.contacts ?? []);
  const [busy, setBusy] = useState<null | 'profile' | 'contacts' | 'dna' | 'reset' | 'delete'>(null);
  const [confirmDelete, setConfirmDelete] = useState('');

  if (!me?.profile || !profile) return <PageLoader />;

  const set = (patch: Partial<ProfileInput>) => setProfile((p) => (p ? { ...p, ...patch } : p));

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile.displayName.trim()) return toast('Your first name can’t be empty.', 'error');
    setBusy('profile');
    try {
      setMe(await api.saveProfile(profile));
      toast('Profile saved — your Partner DNA is updated.', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  const saveContacts = async () => {
    setBusy('contacts');
    try {
      setMe(await api.saveContacts(contacts.filter((c) => c.value.trim())));
      toast('Contact preferences saved.', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  const regenerate = async () => {
    setBusy('dna');
    try {
      setMe(await api.regenerateDna());
      toast('Partner DNA refreshed.', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  const resetDemo = async () => {
    setBusy('reset');
    try {
      await api.resetDemo();
      saveLastDiscover(null);
      const fresh = await refresh();
      if (fresh) {
        setProfile(initialSurvey(fresh, 'connect').profile);
        setContacts(fresh.contacts);
      }
      toast('Demo reset — ready for a fresh run.', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  const deleteAccount = async () => {
    setBusy('delete');
    try {
      await api.deleteAccount();
      saveLastDiscover(null);
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      toast(errorMessage(err), 'error');
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">Your profile</h1>
        <p className="mt-1 text-ink-soft">You control what Partner AI knows about you — and what others can see.</p>
      </div>

      {me.dna && (
        <div className="space-y-3">
          <PartnerDnaCard dna={me.dna} name={me.profile.displayName} editable={false} />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => void regenerate()} loading={busy === 'dna'} icon={busy !== 'dna' && <Wand2 className="size-4" aria-hidden />}>
              Rewrite my DNA summary
            </Button>
            <p className="text-xs text-muted">Something wrong? Edit the fields below — your DNA updates from them.</p>
          </div>
        </div>
      )}

      <Card title="Modes" subtitle="Your answers for each kind of partner.">
        <ul className="grid gap-3 sm:grid-cols-3">
          {MODE_ORDER.map((mode) => {
            const t = MODE_THEMES[mode];
            const has = me.modeProfiles.some((m) => m.mode === mode);
            return (
              <li key={mode}>
                <Link to={`/app/start/${mode}`} className={`flex items-center justify-between rounded-2xl border p-4 transition hover:shadow-soft ${has ? `${t.border} ${t.soft}` : 'border-dashed border-line-strong bg-white'}`}>
                  <span className="font-semibold">
                    <span aria-hidden>{t.emoji}</span> {t.name}
                  </span>
                  <span className={`text-sm font-semibold ${has ? t.text : 'text-muted'}`}>{has ? 'Edit' : 'Set up'}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>

      <form onSubmit={saveProfile} className="space-y-6">
        <Card title="About you">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="First name" value={profile.displayName} onChange={(e) => set({ displayName: e.target.value })} maxLength={60} required />
            <TextField label="Age" type="number" min={13} max={120} value={profile.age ?? ''} onChange={(e) => set({ age: e.target.value ? Number(e.target.value) : null })} optional />
            <TextField label="University, company or community" value={profile.community ?? ''} onChange={(e) => set({ community: e.target.value || null })} maxLength={80} optional />
            <TextField label="City" value={profile.city ?? ''} onChange={(e) => set({ city: e.target.value || null })} maxLength={80} optional />
            <TextField label="Pronouns" value={profile.pronouns ?? ''} onChange={(e) => set({ pronouns: e.target.value || null })} maxLength={30} optional />
          </div>
          <TextAreaField label="Bio" value={profile.bio} onChange={(e) => set({ bio: e.target.value })} maxLength={600} optional />
          <TagInput label="Interests" value={profile.interests} onChange={(interests) => set({ interests })} />
          <TagInput label="Skills" value={profile.skills} onChange={(skills) => set({ skills })} optional />
          <LanguagesEditor value={profile.languages} onChange={(languages) => set({ languages })} />
          <ChoiceChips<TimeSlot> label="Usually free" options={TIME_SLOTS.map((v) => ({ value: v, label: TIME_SLOT_LABELS[v] }))} value={profile.availability} onChange={(availability) => set({ availability })} />
          <ChoiceChips<GroupSize> label="Prefer" options={GROUP_SIZES.map((v) => ({ value: v, label: GROUP_SIZE_LABELS[v] }))} value={profile.groupSizes} onChange={(groupSizes) => set({ groupSizes })} />
          <ChoiceChips<Setting> label="Setting" single options={SETTINGS.map((v) => ({ value: v, label: SETTING_LABELS[v] }))} value={[profile.setting]} onChange={([setting]) => setting && set({ setting })} />
        </Card>

        <Card title="Privacy" subtitle="Choose what potential partners can see on your card.">
          <div className="space-y-3">
            {(['age', 'community', 'pronouns'] as const).map((key) => (
              <label key={key} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white px-4 py-3">
                <span className="text-sm font-medium">Show my {key === 'community' ? 'university / community' : key}</span>
                <input
                  type="checkbox"
                  checked={profile.visibility[key]}
                  onChange={(e) => set({ visibility: { ...profile.visibility, [key]: e.target.checked } })}
                  className="size-5 accent-[#ff4d8d]"
                />
              </label>
            ))}
            <p className="text-xs text-muted">Your email is never shown. Contact methods are only revealed after a mutual Partner Up.</p>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="lg" loading={busy === 'profile'}>
            Save profile
          </Button>
        </div>
      </form>

      <Card title="How mutual partners can reach you">
        <ContactsEditor value={contacts} onChange={setContacts} />
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => void saveContacts()} loading={busy === 'contacts'}>
            Save contacts
          </Button>
        </div>
      </Card>

      <Card title="Account" subtitle={me.email ? `Signed in as ${me.email}` : undefined}>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => void signOut().then(() => navigate('/'))} icon={<LogOut className="size-4" aria-hidden />}>
            Sign out
          </Button>
          {me.isDemoAccount && (
            <Button variant="secondary" onClick={() => void resetDemo()} loading={busy === 'reset'} icon={busy !== 'reset' && <RotateCcw className="size-4" aria-hidden />}>
              Reset demo
            </Button>
          )}
          <Button variant="ghost" onClick={() => void refresh()} icon={<RefreshCw className="size-4" aria-hidden />}>
            Refresh
          </Button>
        </div>
        {!me.isDemoAccount && (
          <div className="rounded-2xl border border-rose/25 bg-blush p-4">
            <p className="font-semibold text-rose-deep">Delete account</p>
            <p className="mt-1 text-sm text-ink-soft">Permanently removes your profile, Partner DNA, requests, partnerships and contact info. This can’t be undone.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <label htmlFor="confirm-delete" className="sr-only">
                Type delete to confirm
              </label>
              <input
                id="confirm-delete"
                value={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.value)}
                placeholder='Type "delete" to confirm'
                className="min-w-0 flex-1 rounded-xl border border-line-strong bg-white px-3 py-2 text-sm focus:border-rose/60 focus:outline-none"
              />
              <Button variant="danger" onClick={() => void deleteAccount()} disabled={confirmDelete.trim().toLowerCase() !== 'delete'} loading={busy === 'delete'} icon={busy !== 'delete' && <Trash2 className="size-4" aria-hidden />}>
                Delete forever
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
