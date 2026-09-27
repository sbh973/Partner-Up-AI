import type { AppNotification } from '../shared/types';
import { db } from './db';

export async function notify(userId: string, system: AppNotification['system'], type: string, message: string, link: string | null = null): Promise<void> {
  await db().notification.create({ data: { userId, system, type, message, link } });
}

export async function listNotifications(userId: string): Promise<AppNotification[]> {
  const rows = await db().notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 40 });
  return rows.map((n) => ({
    id: n.id,
    system: n.system === 'mutual' || n.system === 'scout' ? n.system : 'account',
    type: n.type,
    message: n.message,
    link: n.link,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function markAllRead(userId: string): Promise<void> {
  await db().notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}

export async function unreadCount(userId: string): Promise<number> {
  return db().notification.count({ where: { userId, read: false } });
}
