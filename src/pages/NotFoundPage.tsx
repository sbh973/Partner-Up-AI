import { Logo } from '../components/brand/Logo';
import { ButtonLink } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <h1 className="text-4xl font-bold">We couldn’t find that page.</h1>
      <p className="max-w-md text-ink-soft">But we can probably find you the right person. Let’s go back.</p>
      <ButtonLink to="/" variant="brand" size="lg">
        Back to Partner Up
      </ButtonLink>
    </div>
  );
}
