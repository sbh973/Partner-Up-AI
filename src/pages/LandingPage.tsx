import { motion } from 'framer-motion';
import { ArrowRight, EyeOff, HeartHandshake, Lock, Radar, Sparkles, UsersRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo, LogoMark, MuseBadge } from '../components/brand/Logo';
import { Button, ButtonLink } from '../components/ui/Button';
import { useSession } from '../lib/session';

const fade = (delay = 0) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } });

function ModeCard({ system, delay }: { system: 'mutual' | 'scout'; delay: number }) {
  const navigate = useNavigate();
  const { status } = useSession();
  const mutual = system === 'mutual';
  const go = () => navigate(status === 'signed_in' ? `/app/${system}` : `/auth?next=${encodeURIComponent(`/app/${system}`)}`);
  return (
    <motion.article
      {...fade(delay)}
      whileHover={{ y: -6 }}
      className={`relative flex min-h-[26rem] flex-col overflow-hidden rounded-[2rem] p-7 shadow-soft sm:p-9 ${mutual ? 'grad-mutual' : 'grad-scout'}`}
    >
      <div className="absolute -right-16 -bottom-16 size-64 rounded-full bg-white/30 blur-2xl" aria-hidden />
      <span className="relative flex size-12 items-center justify-center rounded-2xl bg-white/70 text-ink">
        {mutual ? <HeartHandshake className="size-6" aria-hidden /> : <Radar className="size-6" aria-hidden />}
      </span>
      <h2 className="relative mt-6 text-5xl sm:text-6xl">{mutual ? 'Mutual' : 'Scout'}</h2>
      <p className="relative mt-2 text-xl font-extrabold tracking-tight">
        You know <span className="rounded-md bg-white/70 px-1.5">{mutual ? 'WHO' : 'WHAT'}</span>.
      </p>
      <p className="relative mt-4 max-w-md text-lg leading-relaxed font-medium text-ink-2">
        {mutual
          ? 'Make the move without making it awkward. Your feelings stay private unless they’re mutual.'
          : 'Tell me who you need. Muse finds the people who fit. If they’re not here yet, Muse keeps looking.'}
      </p>
      <ul className="relative mt-6 space-y-2 text-sm font-semibold text-ink-2">
        {(mutual
          ? [
              [EyeOff, 'Nobody ever sees who chose them'],
              [Lock, 'Contact info unlocks only when it’s mutual'],
            ]
          : [
              [Sparkles, 'Muse understands what you need'],
              [UsersRound, 'People or whole groups — both must say yes'],
            ]
        ).map(([Icon, text]) => {
          const I = Icon as typeof Lock;
          return (
            <li key={text as string} className="flex items-center gap-2">
              <I className="size-4 shrink-0" aria-hidden /> {text as string}
            </li>
          );
        })}
      </ul>
      <div className="relative mt-auto pt-8">
        <Button variant="primary" size="lg" onClick={go} icon={<ArrowRight className="size-5" aria-hidden />}>
          {mutual ? 'Try Mutual' : 'Ask Muse'}
        </Button>
      </div>
    </motion.article>
  );
}

const FRAMEWORK = [
  ['You know WHO', 'Mutual'],
  ['You know WHAT', 'Scout'],
  ['Muse understands', 'Partner DNA'],
  ['If no one fits', 'Muse keeps looking'],
  ['When both sides align', 'Partner Up'],
];

export function LandingPage() {
  const { status } = useSession();
  const signedIn = status === 'signed_in';
  return (
    <div className="overflow-x-clip bg-canvas">
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
              <ButtonLink to="/auth?tab=signup" variant="primary" size="sm">
                Get Started
              </ButtonLink>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-12 text-center sm:px-6 sm:pt-16">
          <motion.div {...fade(0)} className="flex justify-center">
            <MuseBadge />
          </motion.div>
          <motion.h1 {...fade(0.05)} className="mx-auto mt-6 max-w-4xl text-6xl leading-[0.95] sm:text-8xl">
            Partner Up
          </motion.h1>
          <motion.p {...fade(0.1)} className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed font-medium text-ink-2 sm:text-2xl">
            One platform for the people you <span className="highlight font-bold text-ink">already know</span> — and the people you{' '}
            <span className="highlight font-bold text-ink">need to find</span>.
          </motion.p>
          <motion.div {...fade(0.15)} className="mt-9 flex flex-wrap justify-center gap-3">
            <ButtonLink to={signedIn ? '/app' : '/auth?tab=signup'} variant="primary" size="lg" icon={<ArrowRight className="size-5" aria-hidden />}>
              Get Started
            </ButtonLink>
            <a href="#how" className="inline-flex min-h-14 items-center rounded-full px-6 font-semibold text-ink-2 hover:bg-ink/5">
              How it works
            </a>
          </motion.div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-16 sm:px-6 md:grid-cols-2" aria-label="The two sides of Partner Up">
          <ModeCard system="mutual" delay={0.2} />
          <ModeCard system="scout" delay={0.28} />
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-8 px-4 py-16 sm:px-6">
          <p className="eyebrow text-center">The well-connected friend everyone wishes they had</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-center text-4xl sm:text-5xl">
            Sometimes that friend knows <span className="highlight">“you two like each other.”</span> Sometimes they know{' '}
            <span className="highlight">“I know exactly who you need.”</span>
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <div className="card p-7">
              <p className="inline-flex items-center gap-2 rounded-full bg-peach-soft px-3 py-1 text-sm font-bold text-peach-ink">
                <HeartHandshake className="size-4" aria-hidden /> Mutual · no AI, on purpose
              </p>
              <ol className="mt-5 space-y-4">
                {['Search someone you already know by first + last name.', 'Privately Partner Up. They’re never told who.', 'If they independently choose you too — it’s mutual, and contact info unlocks.'].map((t, i) => (
                  <li key={t} className="flex gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-peach text-sm font-extrabold">{i + 1}</span>
                    <span className="pt-0.5 font-medium">{t}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="card p-7">
              <p className="inline-flex items-center gap-2 rounded-full bg-sky-soft px-3 py-1 text-sm font-bold text-sky-ink">
                <Radar className="size-4" aria-hidden /> Scout · powered by Muse
              </p>
              <ol className="mt-5 space-y-4">
                {['Tell Muse about yourself — it builds your editable Partner DNA.', 'Say what you need: “a roommate at KSU”, “a 4-person hackathon team”.', 'Muse finds people (or keeps looking). Both sides say yes before anyone connects.'].map((t, i) => (
                  <li key={t} className="flex gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky text-sm font-extrabold">{i + 1}</span>
                    <span className="pt-0.5 font-medium">{t}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="card mt-5 p-6 sm:p-8">
            <p className="eyebrow">The Partner Up framework</p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-5">
              {FRAMEWORK.map(([k, v]) => (
                <li key={k} className="rounded-2xl bg-canvas p-4">
                  <p className="text-sm font-semibold text-muted">{k}</p>
                  <p className="mt-1 text-lg font-extrabold tracking-tight">→ {v}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-ink px-6 py-16 text-center sm:px-12">
            <div className="grad-brand absolute -top-32 left-1/2 size-96 -translate-x-1/2 rounded-full opacity-30 blur-3xl" aria-hidden />
            <LogoMark className="relative mx-auto size-12" />
            <h2 className="relative mx-auto mt-6 max-w-3xl text-4xl text-white sm:text-6xl">AI shouldn’t replace human connection. It should help create it.</h2>
            <p className="relative mx-auto mt-5 max-w-2xl text-lg text-white/75">
              Social media helps you keep connections. Partner Up helps create them — and the final connection is always between real people.
            </p>
            <div className="relative mt-8">
              <ButtonLink to={signedIn ? '/app' : '/auth?tab=signup'} variant="scout" size="lg">
                Get Started
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 pt-2 pb-10 text-sm text-muted sm:flex-row sm:px-6">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-ink">Partner Up</span>
          <MuseBadge />
        </div>
        <p>
          Built at HackGT 13 ·{' '}
          <Link to="/auth" className="font-semibold text-ink underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </footer>
    </div>
  );
}
