import { motion } from 'framer-motion';
import { Bell, ChevronRight, HeartHandshake, Radar, UserRound } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { AppNotification } from '../../shared/types';
import { EmptyState, ErrorNote, PageLoader } from '../components/ui/Feedback';
import { api } from '../lib/api';
import { timeAgo } from '../lib/format';
import { useSession } from '../lib/session';
import { useLoad } from '../lib/useLoad';

const SYSTEM = {
  mutual: { icon: HeartHandshake, label: 'Mutual', tint: 'grad-mutual' },
  scout: { icon: Radar, label: 'Scout', tint: 'grad-scout' },
  account: { icon: UserRound, label: 'Account', tint: 'bg-banana' },
} as const;

export function InboxPage() {
  const { refresh } = useSession();
  const { data, error, reload } = useLoad(() => api.notifications(), []);
  const hasUnread = data?.notifications.some((n) => !n.read) ?? false;

  // Opening the inbox marks everything read (the list keeps showing what was new this visit).
  useEffect(() => {
    if (!hasUnread) return;
    api.markRead().then(
      () => void refresh(),
      () => {},
    );
  }, [hasUnread, refresh]);

  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return <PageLoader />;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-4xl sm:text-5xl">Inbox</h1>
      <p className="mt-2 text-ink-2">Updates from Mutual and Scout. Mutual never tells anyone who sent a request.</p>

      <div className="mt-8">
        {data.notifications.length === 0 ? (
          <EmptyState icon={<Bell className="size-5" aria-hidden />} title="Nothing yet" body="When something happens — a mutual match, a Scout connection, or Muse finding someone — it shows up here." />
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {data.notifications.map((n, i) => (
              <motion.li key={n.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
                <Row n={n} />
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({ n }: { n: AppNotification }) {
  const s = SYSTEM[n.system];
  const body = (
    <div className={`flex items-start gap-3 p-4 ${n.read ? '' : 'bg-banana-soft/60'}`}>
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${s.tint}`}>
        <s.icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold tracking-wide text-muted uppercase">
          {s.label} · {timeAgo(n.createdAt)}
          {!n.read && <span className="ml-2 rounded-full bg-ink px-1.5 py-0.5 text-[10px] text-white">New</span>}
        </p>
        <p className="mt-0.5 font-semibold">{n.message}</p>
      </div>
      {n.link && <ChevronRight className="mt-3 size-4 shrink-0 text-muted" aria-hidden />}
    </div>
  );
  return n.link && n.link.startsWith('/app') ? (
    <Link to={n.link} className="block hover:bg-ink/[0.02]">
      {body}
    </Link>
  ) : (
    body
  );
}
