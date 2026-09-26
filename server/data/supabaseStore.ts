import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AppNotification,
  ConnectionBridge,
  ContactKind,
  ContactMethod,
  FeedbackValue,
  GroupSize,
  LanguageSkill,
  MatchResult,
  Mode,
  ModeDetails,
  ModeProfile,
  NotificationType,
  PartnerDNA,
  PartnerIntent,
  Profile,
  ProfileInput,
  ProfileVisibility,
  Setting,
  TimeSlot,
} from '../../shared/types';
import { config } from '../config';
import { DEMO_PROFILE_ID, SEEDED_INCOMING_REQUESTS, SEEDED_PARTNERSHIPS } from './seed';
import type { Candidate } from '../matching/recommend';
import {
  orderPair,
  type DataStore,
  type MatchRecord,
  type NewNotification,
  type PartnerRequestRecord,
  type RequestStatusRecord,
  type StudyGroupRecord,
} from './store';

// Server-side store using the service-role key. The service role bypasses
// RLS, so every method here is only reachable through the API service layer,
// which performs the authorization checks. RLS (supabase/migrations) is the
// second line of defence for any direct client access with the anon key.

interface ProfileRow {
  id: string;
  user_id: string | null;
  display_name: string;
  age: number | null;
  pronouns: string | null;
  community: string | null;
  city: string | null;
  bio: string;
  interests: string[];
  skills: string[];
  languages: LanguageSkill[];
  availability: TimeSlot[];
  group_sizes: GroupSize[];
  setting: Setting;
  visibility: ProfileVisibility;
  avatar_hue: number;
  is_demo_persona: boolean;
  created_at: string;
  updated_at: string;
}

interface ModeProfileRow {
  profile_id: string;
  mode: Mode;
  looking_for: string;
  seeks: string[];
  offers: string[];
  details: ModeDetails;
  active: boolean;
  updated_at: string;
}

interface RequestRow {
  id: string;
  requester_id: string;
  target_id: string;
  mode: Mode;
  score: number;
  intent_text: string | null;
  status: RequestStatusRecord;
  created_at: string;
  expires_at: string;
}

interface MatchRow {
  id: string;
  user_a: string;
  user_b: string;
  mode: Mode;
  compatibility_score: number;
  explanation: MatchResult | null;
  bridges: Record<string, ConnectionBridge> | null;
  matched_at: string;
  active: boolean;
  ended_by: string | null;
}

const toProfile = (r: ProfileRow): Profile => ({
  id: r.id,
  displayName: r.display_name,
  age: r.age,
  pronouns: r.pronouns,
  community: r.community,
  city: r.city,
  bio: r.bio,
  interests: r.interests ?? [],
  skills: r.skills ?? [],
  languages: r.languages ?? [],
  availability: r.availability ?? [],
  groupSizes: r.group_sizes ?? [],
  setting: r.setting,
  visibility: r.visibility ?? { age: true, community: true, pronouns: true },
  avatarHue: r.avatar_hue,
  isDemoPersona: r.is_demo_persona,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

function fromProfileInput(input: Partial<ProfileInput>): Partial<ProfileRow> {
  const row: Partial<ProfileRow> = {};
  if (input.displayName !== undefined) row.display_name = input.displayName;
  if (input.age !== undefined) row.age = input.age;
  if (input.pronouns !== undefined) row.pronouns = input.pronouns;
  if (input.community !== undefined) row.community = input.community;
  if (input.city !== undefined) row.city = input.city;
  if (input.bio !== undefined) row.bio = input.bio;
  if (input.interests !== undefined) row.interests = input.interests;
  if (input.skills !== undefined) row.skills = input.skills;
  if (input.languages !== undefined) row.languages = input.languages;
  if (input.availability !== undefined) row.availability = input.availability;
  if (input.groupSizes !== undefined) row.group_sizes = input.groupSizes;
  if (input.setting !== undefined) row.setting = input.setting;
  if (input.visibility !== undefined) row.visibility = input.visibility;
  return row;
}

const toModeProfile = (r: ModeProfileRow): ModeProfile => ({
  profileId: r.profile_id,
  mode: r.mode,
  lookingFor: r.looking_for,
  seeks: r.seeks ?? [],
  offers: r.offers ?? [],
  details: r.details,
  active: r.active,
  updatedAt: r.updated_at,
});

const toRequest = (r: RequestRow): PartnerRequestRecord => ({
  id: r.id,
  requesterId: r.requester_id,
  targetId: r.target_id,
  mode: r.mode,
  score: r.score,
  intentText: r.intent_text,
  status: r.status,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
});

const toMatch = (r: MatchRow): MatchRecord => ({
  id: r.id,
  userA: r.user_a,
  userB: r.user_b,
  mode: r.mode,
  score: r.compatibility_score,
  explanation: r.explanation,
  bridges: r.bridges ?? {},
  matchedAt: r.matched_at,
  active: r.active,
  endedBy: r.ended_by,
});

type DbResult<T> = { data: T | null; error: { message: string } | null };

/** Rows expected: throws on error or missing data. */
function check<T>(result: DbResult<T>): T {
  if (result.error) throw new Error(`Database error: ${result.error.message}`);
  if (result.data === null) throw new Error('Database error: no data returned');
  return result.data;
}

/** Zero-or-one row. */
function checkMaybe<T>(result: DbResult<T>): T | null {
  if (result.error) throw new Error(`Database error: ${result.error.message}`);
  return result.data;
}

/** Writes that return no rows. */
function checkOk(result: { error: { message: string } | null }): void {
  if (result.error) throw new Error(`Database error: ${result.error.message}`);
}

let adminClient: SupabaseClient | null = null;
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    if (!config.supabaseUrl || !config.supabaseServiceRoleKey) throw new Error('Supabase is not configured');
    adminClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

export class SupabaseStore implements DataStore {
  readonly kind = 'supabase' as const;

  private get sb(): SupabaseClient {
    return getSupabaseAdmin();
  }

  async getProfileByUserId(userId: string) {
    const row = checkMaybe(await this.sb.from('profiles').select('*').eq('user_id', userId).maybeSingle<ProfileRow>());
    return row ? toProfile(row) : null;
  }

  async getProfile(id: string) {
    const row = checkMaybe(await this.sb.from('profiles').select('*').eq('id', id).maybeSingle<ProfileRow>());
    return row ? toProfile(row) : null;
  }

  async getProfiles(ids: string[]) {
    if (ids.length === 0) return [];
    const rows = check(await this.sb.from('profiles').select('*').in('id', ids).returns<ProfileRow[]>());
    return rows.map(toProfile);
  }

  async createProfile(userId: string, input: ProfileInput) {
    const row = check(
      await this.sb
        .from('profiles')
        .insert({ ...fromProfileInput(input), user_id: userId, avatar_hue: Math.floor(Math.random() * 360) })
        .select('*')
        .single<ProfileRow>(),
    );
    return toProfile(row);
  }

  async updateProfile(id: string, input: Partial<ProfileInput>) {
    const row = check(
      await this.sb
        .from('profiles')
        .update({ ...fromProfileInput(input), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single<ProfileRow>(),
    );
    return toProfile(row);
  }

  async deleteProfile(id: string) {
    const row = checkMaybe(await this.sb.from('profiles').select('user_id').eq('id', id).maybeSingle<{ user_id: string | null }>());
    // Every child table references profiles(id) ON DELETE CASCADE.
    checkOk(await this.sb.from('profiles').delete().eq('id', id));
    if (row?.user_id) {
      const { error } = await this.sb.auth.admin.deleteUser(row.user_id);
      if (error) throw new Error(`Could not delete auth user: ${error.message}`);
    }
  }

  async listModeProfiles(profileId: string) {
    const rows = check(await this.sb.from('mode_profiles').select('*').eq('profile_id', profileId).returns<ModeProfileRow[]>());
    return rows.map(toModeProfile);
  }

  async upsertModeProfile(mp: ModeProfile) {
    const row = check(
      await this.sb
        .from('mode_profiles')
        .upsert(
          {
            profile_id: mp.profileId,
            mode: mp.mode,
            looking_for: mp.lookingFor,
            seeks: mp.seeks,
            offers: mp.offers,
            details: mp.details,
            active: mp.active,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'profile_id,mode' },
        )
        .select('*')
        .single<ModeProfileRow>(),
    );
    return toModeProfile(row);
  }

  async listActiveCandidates(mode: Mode): Promise<Candidate[]> {
    const rows = check(
      await this.sb
        .from('mode_profiles')
        .select('*, profile:profiles!inner(*)')
        .eq('mode', mode)
        .eq('active', true)
        .limit(500)
        .returns<Array<ModeProfileRow & { profile: ProfileRow }>>(),
    );
    return rows.map((r) => ({ profile: toProfile(r.profile), modeProfile: toModeProfile(r) }));
  }

  async getDna(profileId: string) {
    const row = checkMaybe(
      await this.sb
        .from('partner_dna')
        .select('*')
        .eq('profile_id', profileId)
        .maybeSingle<{ profile_id: string; headline: string; summary: string; sections: PartnerDNA['sections']; source: PartnerDNA['source']; updated_at: string }>(),
    );
    return row
      ? { profileId: row.profile_id, headline: row.headline, summary: row.summary, sections: row.sections, source: row.source, updatedAt: row.updated_at }
      : null;
  }

  async saveDna(dna: PartnerDNA) {
    checkOk(
      await this.sb.from('partner_dna').upsert(
        {
          profile_id: dna.profileId,
          headline: dna.headline,
          summary: dna.summary,
          sections: dna.sections,
          source: dna.source,
          updated_at: dna.updatedAt,
        },
        { onConflict: 'profile_id' },
      ),
    );
  }

  async listContacts(profileId: string) {
    const rows = check(
      await this.sb
        .from('contact_methods')
        .select('kind, value, share_on_match')
        .eq('profile_id', profileId)
        .order('created_at')
        .returns<Array<{ kind: ContactKind; value: string; share_on_match: boolean }>>(),
    );
    return rows.map((r) => ({ kind: r.kind, value: r.value, shareOnMatch: r.share_on_match }));
  }

  async replaceContacts(profileId: string, contacts: ContactMethod[]) {
    checkOk(await this.sb.from('contact_methods').delete().eq('profile_id', profileId));
    if (contacts.length === 0) return;
    checkOk(
      await this.sb
        .from('contact_methods')
        .insert(contacts.map((c) => ({ profile_id: profileId, kind: c.kind, value: c.value, share_on_match: c.shareOnMatch }))),
    );
  }

  async findOpenRequest(requesterId: string, targetId: string, mode: Mode) {
    const row = checkMaybe(
      await this.sb
        .from('partner_requests')
        .select('*')
        .eq('requester_id', requesterId)
        .eq('target_id', targetId)
        .eq('mode', mode)
        .in('status', ['pending', 'matched'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<RequestRow>(),
    );
    return row ? toRequest(row) : null;
  }

  async createRequest(r: Omit<PartnerRequestRecord, 'id'>) {
    const row = check(
      await this.sb
        .from('partner_requests')
        .insert({
          requester_id: r.requesterId,
          target_id: r.targetId,
          mode: r.mode,
          score: r.score,
          intent_text: r.intentText,
          status: r.status,
          created_at: r.createdAt,
          expires_at: r.expiresAt,
        })
        .select('*')
        .single<RequestRow>(),
    );
    return toRequest(row);
  }

  async updateRequestStatus(id: string, status: RequestStatusRecord) {
    checkOk(await this.sb.from('partner_requests').update({ status }).eq('id', id));
  }

  async listRequestsFrom(requesterId: string) {
    const rows = check(
      await this.sb.from('partner_requests').select('*').eq('requester_id', requesterId).order('created_at', { ascending: false }).returns<RequestRow[]>(),
    );
    return rows.map(toRequest);
  }

  async listPendingTo(targetId: string) {
    const rows = check(
      await this.sb.from('partner_requests').select('*').eq('target_id', targetId).eq('status', 'pending').returns<RequestRow[]>(),
    );
    return rows.map(toRequest);
  }

  async createMatch(m: Omit<MatchRecord, 'id'>) {
    const [userA, userB] = orderPair(m.userA, m.userB);
    const row = check(
      await this.sb
        .from('matches')
        .insert({
          user_a: userA,
          user_b: userB,
          mode: m.mode,
          compatibility_score: m.score,
          explanation: m.explanation,
          bridges: m.bridges,
          matched_at: m.matchedAt,
          active: m.active,
          ended_by: m.endedBy,
        })
        .select('*')
        .single<MatchRow>(),
    );
    return toMatch(row);
  }

  async getMatch(id: string) {
    const row = checkMaybe(await this.sb.from('matches').select('*').eq('id', id).maybeSingle<MatchRow>());
    return row ? toMatch(row) : null;
  }

  async findActiveMatch(a: string, b: string, mode: Mode) {
    const [userA, userB] = orderPair(a, b);
    const row = checkMaybe(
      await this.sb
        .from('matches')
        .select('*')
        .eq('user_a', userA)
        .eq('user_b', userB)
        .eq('mode', mode)
        .eq('active', true)
        .maybeSingle<MatchRow>(),
    );
    return row ? toMatch(row) : null;
  }

  async listMatchesFor(profileId: string) {
    const rows = check(
      await this.sb
        .from('matches')
        .select('*')
        .or(`user_a.eq.${profileId},user_b.eq.${profileId}`)
        .order('matched_at', { ascending: false })
        .returns<MatchRow[]>(),
    );
    return rows.map(toMatch);
  }

  async updateMatch(id: string, patch: Partial<Pick<MatchRecord, 'active' | 'endedBy' | 'bridges'>>) {
    const row: Record<string, unknown> = {};
    if (patch.active !== undefined) row.active = patch.active;
    if (patch.endedBy !== undefined) row.ended_by = patch.endedBy;
    if (patch.bridges !== undefined) row.bridges = patch.bridges;
    checkOk(await this.sb.from('matches').update(row).eq('id', id));
  }

  async saveIntent(profileId: string, mode: Mode, rawText: string, parsed: PartnerIntent) {
    checkOk(await this.sb.from('intents').insert({ profile_id: profileId, mode, raw_text: rawText, parsed }));
  }

  async saveFeedback(profileId: string, targetId: string, mode: Mode, value: FeedbackValue) {
    checkOk(
      await this.sb
        .from('match_feedback')
        .upsert({ profile_id: profileId, target_id: targetId, mode, value, created_at: new Date().toISOString() }, { onConflict: 'profile_id,target_id,mode' }),
    );
  }

  async saveStudyGroup(group: Omit<StudyGroupRecord, 'id' | 'createdAt'>) {
    const row = check(
      await this.sb
        .from('study_groups')
        .insert({ creator_id: group.creatorId, subjects: group.subjects, complementarity: group.complementarity })
        .select('id, created_at')
        .single<{ id: string; created_at: string }>(),
    );
    checkOk(
      await this.sb
        .from('study_group_members')
        .insert(group.memberIds.map((profileId) => ({ group_id: row.id, profile_id: profileId, role: profileId === group.creatorId ? 'creator' : 'member' }))),
    );
    return { ...group, id: row.id, createdAt: row.created_at };
  }

  async addNotification(n: NewNotification) {
    checkOk(await this.sb.from('notifications').insert({ profile_id: n.profileId, type: n.type, title: n.title, body: n.body, link: n.link }));
  }

  async listNotifications(profileId: string): Promise<AppNotification[]> {
    const rows = check(
      await this.sb
        .from('notifications')
        .select('id, type, title, body, link, read, created_at')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(30)
        .returns<Array<{ id: string; type: NotificationType; title: string; body: string; link: string | null; read: boolean; created_at: string }>>(),
    );
    return rows.map((r) => ({ id: r.id, type: r.type, title: r.title, body: r.body, link: r.link, read: r.read, createdAt: r.created_at }));
  }

  async markNotificationsRead(profileId: string) {
    checkOk(await this.sb.from('notifications').update({ read: true }).eq('profile_id', profileId).eq('read', false));
  }

  async resetDemoState(profileId: string) {
    checkOk(await this.sb.from('partner_requests').delete().or(`requester_id.eq.${profileId},target_id.eq.${profileId}`));
    checkOk(await this.sb.from('matches').delete().or(`user_a.eq.${profileId},user_b.eq.${profileId}`));
    checkOk(await this.sb.from('notifications').delete().eq('profile_id', profileId));
    checkOk(await this.sb.from('study_groups').delete().eq('creator_id', profileId));
    if (profileId !== DEMO_PROFILE_ID) return;
    // Restore the demo account's starting interactions (same as the seed script).
    for (const r of SEEDED_INCOMING_REQUESTS) {
      checkOk(await this.sb.from('partner_requests').insert({ requester_id: r.from, target_id: profileId, mode: r.mode, score: r.score }));
    }
    for (const m of SEEDED_PARTNERSHIPS) {
      const [userA, userB] = orderPair(profileId, m.with);
      checkOk(
        await this.sb.from('matches').insert({
          user_a: userA,
          user_b: userB,
          mode: m.mode,
          compatibility_score: m.score,
          matched_at: new Date(Date.now() - m.daysAgo * 86_400_000).toISOString(),
        }),
      );
    }
  }
}
