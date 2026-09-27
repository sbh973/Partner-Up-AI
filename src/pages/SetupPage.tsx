import { ArrowRight, Lock } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { GENDERS, type Gender } from '../../shared/types';
import { GENDER_LABELS } from '../../shared/labels';
import { Logo } from '../components/brand/Logo';
import { PrivacyGate } from '../components/privacy/PrivacyGate';
import { Button } from '../components/ui/Button';
import { ChoiceChips } from '../components/ui/ChoiceChips';
import { TextField } from '../components/ui/Field';
import { api, errorMessage } from '../lib/api';
import { useSession } from '../lib/session';

export function SetupPage() {
  const { me, setMe, config } = useSession();
  const navigate = useNavigate();
  const [gateOpen, setGateOpen] = useState(true);
  const [skippedContacts, setSkippedContacts] = useState(false);
  const [firstName, setFirst] = useState('');
  const [lastName, setLast] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const minAge = config?.mutual.minAge ?? 18;

  if (me?.profile) return <Navigate to="/app" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const ageNum = Number(age);
    if (!firstName.trim() || !lastName.trim()) return setError('Add your first and last name — it’s how people you know find you.');
    if (!gender) return setError('Choose a gender option (you can pick “Prefer not to say”).');
    if (!Number.isInteger(ageNum) || ageNum < minAge) return setError(`Partner Up is for people ${minAge} and older.`);
    setBusy(true);
    try {
      setMe(
        await api.setupProfile({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          gender,
          age: ageNum,
          phone: phone.trim() || null,
          instagram: instagram.trim() || null,
        }),
      );
      navigate('/app', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-canvas">
      {gateOpen && (
        <PrivacyGate
          onContinue={() => setGateOpen(false)}
          onSkip={() => {
            setSkippedContacts(true);
            setGateOpen(false);
          }}
        />
      )}
      <header className="mx-auto flex h-20 max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="mx-auto max-w-xl px-4 pb-16">
        <p className="eyebrow">Set up your profile</p>
        <h1 className="mt-2 text-4xl">Let’s get you in.</h1>
        <p className="mt-2 font-medium text-muted">People who already know you will search by your real first and last name.</p>

        <form onSubmit={submit} className="card mt-8 space-y-5 p-6 sm:p-7" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="First name" value={firstName} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" maxLength={40} required />
            <TextField label="Last name" value={lastName} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" maxLength={40} required />
          </div>
          <ChoiceChips<Gender> label="Gender" single options={GENDERS.map((g) => ({ value: g, label: GENDER_LABELS[g] }))} value={gender ? [gender] : []} onChange={([g]) => g && setGender(g)} />
          <TextField label="Age" type="number" inputMode="numeric" min={minAge} max={120} value={age} onChange={(e) => setAge(e.target.value)} className="sm:max-w-40" required />
          <p className="flex items-start gap-2 rounded-2xl bg-banana-soft px-4 py-3 text-sm font-medium">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden /> Name, gender and age can’t be casually changed later — so a match always knows who you really are.
          </p>
          {skippedContacts && (
            <p className="rounded-2xl bg-ink/[0.04] px-4 py-3 text-sm font-semibold text-ink-2">
              You skipped contact info — that’s fine. Add a phone number or Instagram any time from Account, and it’ll still stay hidden until a connection is confirmed.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(404) 555-0100" hint="Hidden until a confirmed connection." optional />
            <TextField label="Instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@yourhandle" hint="Optional — add later if you prefer." optional />
          </div>
          {error && (
            <p className="rounded-2xl bg-danger-soft px-4 py-2.5 text-sm font-semibold text-danger" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" loading={busy} icon={!busy && <ArrowRight className="size-5" aria-hidden />}>
            Continue
          </Button>
        </form>
      </main>
    </div>
  );
}
