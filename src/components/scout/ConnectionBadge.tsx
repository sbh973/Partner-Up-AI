import type { ScoutConnectionView } from '../../../shared/types';
import { Chip } from '../ui/Chip';

export function ConnectionBadge({ c }: { c: ScoutConnectionView }) {
  if (c.status === 'connected') return <Chip size="sm" tone="good">Connected</Chip>;
  if (c.status === 'declined') return <Chip size="sm">Closed</Chip>;
  if (!c.youAccepted) return <Chip size="sm" tone="banana">Needs your answer</Chip>;
  return <Chip size="sm" tone="scout">Waiting</Chip>;
}
