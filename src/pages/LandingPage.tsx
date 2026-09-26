import { motion } from 'framer-motion';
import { ArrowRight, Lock, Play, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Mode } from '../../shared/types';
import { PartnerPrompt } from '../components/ai/PartnerPrompt';
import { Logo, LogoMark } from '../components/brand/Logo';
import { ModeCard } from '../components/modes/ModeCard';
import { Avatar } from '../components/ui/Avatar';
import { Button, ButtonLink } from '../components/ui/Button';
import { ScoreRing } from '../components/ui/ScoreRing';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../lib/auth';
import { MODE_ORDER } from '../lib/modes';
import { setPendingPrompt } from '../lib/session';

const STEPS = [
  { title: 'Tell us about yourself', body: 'A short, mode-specific survey — or just describe yourself in a sentence.' },
  { title: 'Tell us who you need', body: '“Someone to study chem with at night.” Plain words are enough.' },
  { title: 'AI understands your intent', body: 'Partner AI works out what you need, what you offer, and what matters.' },
  { title: 'Discover mutual matches', body: 'People who need what you offer — and offer what you need — with the why.' },
  { title: 'Partner Up when it’s mutual', body: 'Your choice stays private. Contact info unlocks only if you both say yes.' },
];

const FORMULA = [
  { label: 'Partner DNA', q: 'Who am I?' },
  { label: 'Partner Intent', q: 'Who do I need?' },
  { label: 'Mutual Value', q: 'What can we offer each other?' },
  { label: 'Mutual Consent', q: 'Do we both want to connect?' },
];

function HeroPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotate: 1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ delay: 0.2, duration: 0.6 }}
      className="relative mx-auto w-full max-w-sm"
      aria-hidden
    >
      <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-sun/40 via-[#ffb38a]/30 to-rose/30 blur-2xl" />
      <div className="card relative p-5">
        <div className="flex items-center gap-3">
          <Avatar name="Maya Chen" hue={350} size="lg" />
          <div className="flex-1">
            <p className="font-display text-lg font-bold">Maya Chen</p>
            <p className="text-sm text-muted">Georgia Tech · Atlanta</p>
            <p className="text-sm font-semibold text-learn">📚 Mutual learning match</p>
          </div>
          <ScoreRing score={95} size={70} stroke={7} />
        </div>
        <div className="mt-4 space-y-2.5 rounded-2xl bg-canvas p-4 text-sm">
          <p>
            <span aria-hidden>🧪</span> <strong>Maya can help you</strong> with Chemistry
          </p>
          <p>
            <span aria-hidden>📈</span> <strong>You can help Maya</strong> with Calculus
          </p>
          <p>
            <span aria-hidden>🌙</span> Both usually free <strong>at night</strong>
          </p>
        </div>
        <div className="brand-gradient mt-4 flex h-11 items-center justify-center rounded-2xl font-semibold text-ink">Partner Up 🤝</div>
      </div>
      <div className="card absolute -bottom-6 -left-6 hidden animate-float items-center gap-2 px-3 py-2 text-sm font-semibold sm:flex">
        <Lock className="size-4 text-rose" /> Only revealed if it’s mutual
      </div>
    </motion.div>
  );
}

export function LandingPage() {
  const { status, signInDemo } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [demoBusy, setDemoBusy] = useState(false);
  const signedIn = status === 'signed_in';

  const goFind = (mode?: Mode) => navigate(mode ? `/app/discover?mode=${mode}` : '/app/discover');

  const startDemo = async () => {
    setDemoBusy(true);
    try {
      await signInDemo();
      navigate('/app');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The demo is unavailable right now.', 'error');
    } finally {
      setDemoBusy(false);
    }
  };

  const onPrompt = (text: string) => {
    setPendingPrompt(text);
    navigate('/app/discover');
  };

  return (
    <div className="overflow-x-clip">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2" aria-label="Account">
          {signedIn ? (
            <ButtonLink to="/app" variant="primary" size="sm">
              Open app
            </ButtonLink>
          ) : (
            <>
              <ButtonLink to="/auth" variant="ghost" size="sm">
                Sign in
              </ButtonLink>
              <Button variant="primary" size="sm" onClick={startDemo} loading={demoBusy} icon={!demoBusy && <Play className="size-3.5" aria-hidden />}>
                Live demo
              </Button>
            </>
          )}
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-6 pb-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-14 lg:pb-24">
          <div>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink-soft shadow-soft">
              <Sparkles className="size-4 text-rose" aria-hidden /> AI that helps humans find the humans they need
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-5 text-5xl leading-[1.02] font-extrabold sm:text-6xl lg:text-7xl"
            >
              Whatever you’re doing, find the <span className="brand-text">right person</span> to do it with.
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              Tell us what you’re looking for. Partner AI finds people who need what you offer — and offer what you need.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-8 flex flex-wrap gap-3">
              <Button variant="brand" size="lg" onClick={() => goFind()} icon={<ArrowRight className="size-5" aria-hidden />}>
                Find My Partner
              </Button>
              <a href="#how" className="inline-flex h-14 items-center rounded-2xl px-6 font-medium text-ink-soft hover:bg-ink/5">
                See how it works
              </a>
            </motion.div>
            <p className="mt-5 flex items-center gap-2 text-sm text-muted">
              <ShieldCheck className="size-4 text-good" aria-hidden /> Your interest stays private unless it’s mutual.
            </p>
          </div>
          <HeroPreview />
        </section>

        {/* Modes */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="modes-title">
          <h2 id="modes-title" className="text-3xl font-bold sm:text-4xl">
            What are you looking for?
          </h2>
          <p className="mt-2 max-w-2xl text-ink-soft">Same AI, different definition of a great match. Compatibility depends on what you want to do together.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {MODE_ORDER.map((mode) => (
              <ModeCard key={mode} mode={mode} onSelect={goFind} />
            ))}
          </div>
          <div className="mt-10">
            <p className="mb-3 font-display text-xl font-bold">✨ Or tell Partner AI what you need…</p>
            <PartnerPrompt onSubmit={onPrompt} />
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-8 px-4 py-16 sm:px-6" aria-labelledby="how-title">
          <h2 id="how-title" className="text-3xl font-bold sm:text-4xl">
            How it works
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="card p-5">
                <span className="brand-gradient flex size-9 items-center justify-center rounded-xl font-display font-bold text-ink">{i + 1}</span>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>

          <div className="card mt-10 p-6 sm:p-8">
            <p className="eyebrow">The Partner Up formula</p>
            <div className="mt-5 grid items-center gap-3 md:grid-cols-[repeat(4,1fr)_auto]">
              {FORMULA.map((f, i) => (
                <div key={f.label} className="flex items-center gap-3 md:block">
                  <div className="flex-1 rounded-2xl bg-canvas p-4">
                    <p className="font-display text-lg font-bold">{f.label}</p>
                    <p className="text-sm text-muted">{f.q}</p>
                  </div>
                  <span className="font-display text-2xl font-bold text-muted md:hidden" aria-hidden>
                    {i < FORMULA.length - 1 ? '+' : '='}
                  </span>
                </div>
              ))}
              <div className="brand-gradient rounded-2xl p-4 text-center font-display text-xl font-extrabold text-ink">Partner Up 🤝</div>
            </div>
          </div>
        </section>

        {/* Philosophy */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-white px-6 py-14 text-center text-ink shadow-soft sm:px-12">
            <div className="brand-gradient absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full opacity-30 blur-3xl" aria-hidden />
            <LogoMark className="relative mx-auto size-12" />
            <h2 className="relative mx-auto mt-6 max-w-3xl text-4xl sm:text-6xl">
              AI shouldn’t replace human connection. It should create more of it.
            </h2>
            <p className="relative mx-auto mt-5 max-w-2xl text-lg text-ink-soft">
              Partner AI understands people, intent, and what each person can offer — explains why a connection makes sense — then gets out of the way.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Button variant="brand" size="lg" onClick={() => goFind()}>
                Find My Partner
              </Button>
              {!signedIn && (
                <Button variant="secondary" size="lg" onClick={startDemo} loading={demoBusy}>
                  Try the live demo
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 pt-4 pb-10 text-sm text-muted sm:flex-row sm:px-6">
        <p className="font-display font-semibold text-ink-soft">AI doesn’t become your friend. It helps you find one.</p>
        <p>
          Built at HackGT 13 · <Link to="/auth" className="underline underline-offset-4">Sign in</Link>
        </p>
      </footer>
    </div>
  );
}
