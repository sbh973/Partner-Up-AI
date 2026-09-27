import { CloudOff, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted" role="status">
      <LoaderCircle className="size-7 animate-spin text-ink" aria-hidden />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      {icon && <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-banana-soft text-ink">{icon}</span>}
      <h3 className="text-lg">{title}</h3>
      {body && <p className="mt-2 max-w-md text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center" role="alert">
      <CloudOff className="size-7 text-muted" aria-hidden />
      <p className="max-w-md text-ink-2">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="min-h-10 rounded-full px-4 text-sm font-bold underline underline-offset-4">
          Try again
        </button>
      )}
    </div>
  );
}
