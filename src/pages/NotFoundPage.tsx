import { Compass } from 'lucide-react';
import { Logo } from '../components/brand/Logo';
import { ButtonLink } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-20 text-center">
        <span className="grad-brand flex size-16 items-center justify-center rounded-3xl">
          <Compass className="size-7" aria-hidden />
        </span>
        <h1 className="mt-6 text-4xl sm:text-5xl">This page wandered off</h1>
        <p className="mt-3 max-w-md text-ink-2">The link may be old, or the page may have moved.</p>
        <ButtonLink to="/" className="mt-8">
          Back to Partner Up
        </ButtonLink>
      </main>
    </div>
  );
}
