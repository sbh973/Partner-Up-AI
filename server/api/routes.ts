import type { AppConfig } from '../../shared/types';
import { deleteAccount, getMe, setupProfile, updateContacts, updateDna } from '../account/service';
import { museStatus } from '../ai/service';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, demoSignIn, destroySession, signIn, signUp, type AuthUser } from '../auth';
import { config } from '../config';
import { db } from '../db';
import { ApiError } from '../http/errors';
import { rateLimit } from '../http/rateLimit';
import { authedRoute, parseBody, publicRoute, type RequestContext } from '../http/router';
import * as mutual from '../mutual/service';
import { listNotifications, markAllRead } from '../notify';
import * as scout from '../scout/service';
import { resetDemo } from '../seed/seed';
import { PEOPLE } from '../seed/people';
import {
  ContactSchema,
  CredentialsSchema,
  DnaExtractSchema,
  DnaPatchSchema,
  DnaSchema,
  IdSchema,
  MutualSearchSchema,
  MutualTargetSchema,
  ProfileSetupSchema,
  ScoutPartnerUpSchema,
  ScoutRespondSchema,
  ScoutSearchSchema,
} from './schemas';

let registered = false;

function startSession(ctx: RequestContext, token: string) {
  ctx.setCookie(SESSION_COOKIE, token, { maxAgeSeconds: SESSION_MAX_AGE_SECONDS });
  return { ok: true };
}

function requireDemo(user: AuthUser) {
  if (!config.demoMode || !user.isDemoAccount) throw new ApiError(403, 'forbidden', 'Only demo accounts can do that.');
}

export function registerRoutes(): void {
  if (registered) return;
  registered = true;

  // ── Public ───────────────────────────────────────────────────────────────
  publicRoute('GET', '/api/health', async () => ({ ok: true }));

  publicRoute('GET', '/api/config', async (): Promise<AppConfig> => ({
    museConfigured: museStatus().configured,
    demoMode: config.demoMode,
    demoAccounts: config.demoMode
      ? PEOPLE.filter((p) => p.demoAccount).map((p) => ({ key: p.key, name: `${p.firstName} ${p.lastName}` }))
      : [],
    mutual: {
      requestLimit: config.mutualRequestLimit,
      windowDays: config.mutualWindowDays,
      requestTtlDays: config.mutualRequestTtlDays,
      endAfterHours: config.mutualEndAfterHours,
      minAge: config.minAge,
    },
  }));

  publicRoute('POST', '/api/auth/signup', async (ctx) => {
    rateLimit(`auth:${ctx.ip}`, 10);
    const { email, password } = parseBody(CredentialsSchema, ctx.body);
    return startSession(ctx, await signUp(email, password));
  });

  publicRoute('POST', '/api/auth/login', async (ctx) => {
    rateLimit(`auth:${ctx.ip}`, 10);
    const { email, password } = parseBody(CredentialsSchema, ctx.body);
    return startSession(ctx, await signIn(email, password));
  });

  publicRoute('POST', '/api/auth/demo/:key', async (ctx) => {
    rateLimit(`demo:${ctx.ip}`, 30);
    return startSession(ctx, await demoSignIn(parseBody(IdSchema, ctx.params.key)));
  });

  publicRoute('POST', '/api/auth/logout', async (ctx) => {
    await destroySession(ctx.cookies[SESSION_COOKIE]);
    ctx.setCookie(SESSION_COOKIE, '', { maxAgeSeconds: 0 });
    return { ok: true };
  });

  // ── Me / profile ─────────────────────────────────────────────────────────
  authedRoute('GET', '/api/me', async ({ user }) => getMe(user));
  authedRoute('POST', '/api/profile', async ({ user, body }) => setupProfile(user, parseBody(ProfileSetupSchema, body)));
  authedRoute('PUT', '/api/profile/contacts', async ({ user, body }) => updateContacts(user, parseBody(ContactSchema, body)));
  authedRoute('DELETE', '/api/account', async (ctx) => {
    await deleteAccount(ctx.user);
    ctx.setCookie(SESSION_COOKIE, '', { maxAgeSeconds: 0 });
    return { ok: true };
  });

  // ── Mutual (no AI anywhere on these routes) ──────────────────────────────
  authedRoute('GET', '/api/mutual', async ({ user }) => mutual.overview(user.id));
  authedRoute('POST', '/api/mutual/search', async ({ user, body }) => {
    rateLimit(`mutual-search:${user.id}`, 30);
    const { firstName, lastName } = parseBody(MutualSearchSchema, body);
    return mutual.search(user.id, firstName, lastName);
  });
  authedRoute('POST', '/api/mutual/partner-up', async ({ user, body }) => mutual.partnerUp(user.id, parseBody(MutualTargetSchema, body).targetId));
  authedRoute('POST', '/api/mutual/save-for-join', async ({ user, body }) => {
    const { firstName, lastName } = parseBody(MutualSearchSchema, body);
    return mutual.saveForJoin(user.id, firstName, lastName);
  });
  authedRoute('POST', '/api/mutual/requests/:id/withdraw', async ({ user, params }) => mutual.withdraw(user.id, parseBody(IdSchema, params.id)));
  authedRoute('POST', '/api/mutual/matches/:id/end', async ({ user, params }) => mutual.endMatch(user.id, parseBody(IdSchema, params.id)));

  // ── Scout (Muse) ─────────────────────────────────────────────────────────
  authedRoute('GET', '/api/scout', async ({ user }) => scout.overview(user.id));
  authedRoute('PUT', '/api/scout/dna', async ({ user, body }) => updateDna(user, parseBody(DnaSchema, body)));
  authedRoute('POST', '/api/scout/dna/extract', async ({ user, body }) => {
    rateLimit(`muse:${user.id}`, 40);
    const { text, step } = parseBody(DnaExtractSchema, body);
    const result = await scout.extractDna(user.id, text, step);
    await scout.matchWatchersAgainst(user.id);
    return result;
  });
  authedRoute('POST', '/api/scout/dna/undo', async ({ user, body }) => scout.undoDnaPatch(user.id, parseBody(DnaPatchSchema, body)));
  authedRoute('POST', '/api/scout/search', async ({ user, body }) => {
    rateLimit(`muse:${user.id}`, 40);
    return scout.search(user.id, parseBody(ScoutSearchSchema, body).text);
  });
  authedRoute('POST', '/api/scout/partner-up', async ({ user, body }) => {
    const { requestId, candidateIds } = parseBody(ScoutPartnerUpSchema, body);
    return scout.partnerUp(user.id, requestId, candidateIds);
  });
  authedRoute('GET', '/api/scout/connections/:id', async ({ user, params }) => scout.getConnection(user.id, parseBody(IdSchema, params.id)));
  authedRoute('POST', '/api/scout/connections/:id/respond', async ({ user, params, body }) =>
    scout.respond(user.id, parseBody(IdSchema, params.id), parseBody(ScoutRespondSchema, body).accept),
  );
  authedRoute('POST', '/api/scout/requests/:id/stop', async ({ user, params }) => scout.stopRequest(user.id, parseBody(IdSchema, params.id)));

  // ── Notifications ────────────────────────────────────────────────────────
  authedRoute('GET', '/api/notifications', async ({ user }) => ({ notifications: await listNotifications(user.id) }));
  authedRoute('POST', '/api/notifications/read', async ({ user }) => {
    await markAllRead(user.id);
    return { ok: true };
  });

  // ── Demo controls (demo accounts only) ───────────────────────────────────
  authedRoute('POST', '/api/demo/reset', async (ctx) => {
    requireDemo(ctx.user);
    await resetDemo();
    ctx.setCookie(SESSION_COOKIE, '', { maxAgeSeconds: 0 });
    return { ok: true };
  });
  authedRoute('POST', '/api/demo/new-student', async ({ user }) => {
    requireDemo(user);
    // "A new student joins": wake the dormant seeded person and run Keep Looking.
    const dormant = await db().user.findFirst({ where: { dormant: true } });
    if (!dormant) return { joined: false, found: 0 };
    await db().user.update({ where: { id: dormant.id }, data: { dormant: false } });
    const found = await scout.matchWatchersAgainst(dormant.id);
    return { joined: true, found };
  });
}
