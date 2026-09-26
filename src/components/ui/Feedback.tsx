import { LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted" role="status">
      <LoaderCircle className="size-7 animate-spin text-rose" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}

interface EmptyStateProps {
  emoji?: string;
  title: string;
  body?: string;
  action?: ReactNode;
}

export function EmptyState({ emoji = '🌱', title, body, action }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-3 text-4xl" aria-hidden>
        {emoji}
      </span>
      <h3 className="text-xl font-bold">{title}</h3>
      {body && <p className="mt-2 max-w-md text-muted">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center" role="alert">
      <span className="text-3xl" aria-hidden>
        ☕
      </span>
      <p className="max-w-md text-ink-soft">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="text-sm font-semibold text-rose-deep underline underline-offset-4">
          Try again
        </button>
      )}
    </div>
  );
}
