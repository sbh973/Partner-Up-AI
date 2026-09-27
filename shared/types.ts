// Shared API contract between the React client and the Node server.
// Partner Up has exactly two systems:
//   • Mutual — you know WHO. Private, mutual-only reveal. No AI.
//   • Scout  — you know WHAT. Muse understands you (Partner DNA) and finds people.

export const TIME_SLOTS = ['mornings', 'afternoons', 'evenings', 'late_nights', 'weekdays', 'weekends'] as const;
export type TimeSlot = (typeof TIME_SLOTS)[number];

export const GENDERS = ['woman', 'man', 'nonbinary', 'self_describe', 'prefer_not'] as const;
export type Gender = (typeof GENDERS)[number];

export type AiSource = 'muse' | 'offline';

export interface ConceptTag {
  id: string;
  label: string;
}

// ─── Account / profile ─────────────────────────────────────────────────────

export interface MyProfile {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  age: number;
  phone: string | null;
  instagram: string | null;
  avatarHue: number;
  taken: boolean;
}

export interface ProfileSetupInput {
  firstName: string;
  lastName: string;
  gender: Gender;
  age: number;
  phone: string | null;
  instagram: string | null;
}

export interface ContactUpdateInput {
  phone: string | null;
  instagram: string | null;
}

export interface DemoAccount {
  key: string;
  name: string;
}

export interface MeResponse {
  email: string;
  profile: MyProfile | null;
  dna: PartnerDNA | null;
  isDemoAccount: boolean;
  unreadNotifications: number;
}

export interface AppConfig {
  museConfigured: boolean;
  demoMode: boolean;
  demoAccounts: DemoAccount[];
  mutual: { requestLimit: number; windowDays: number; requestTtlDays: number; endAfterHours: number; minAge: number };
}

// ─── Partner DNA (Scout) ───────────────────────────────────────────────────

export const DNA_LIST_FIELDS = ['interests', 'skills', 'learning', 'goals', 'needs', 'offers', 'preferences', 'languages', 'availability'] as const;
export type DnaListField = (typeof DNA_LIST_FIELDS)[number];

export interface PartnerDNA {
  about: string;
  interests: string[];
  skills: string[];
  learning: string[];
  goals: string[];
  needs: string[];
  offers: string[];
  location: string | null;
  availability: TimeSlot[];
  preferences: string[];
  languages: string[];
  lastSource: AiSource | 'manual' | null;
  updatedAt: string;
}

/** A visible change Muse proposes or applied to Partner DNA — never silent. */
export interface DnaPatch {
  interests?: string[];
  skills?: string[];
  learning?: string[];
  goals?: string[];
  needs?: string[];
  offers?: string[];
  preferences?: string[];
  languages?: string[];
  availability?: TimeSlot[];
  location?: string | null;
}

export interface DnaExtractResponse {
  added: DnaPatch;
  dna: PartnerDNA;
  reply: string;
  source: AiSource;
}

// ─── Mutual (no AI) ────────────────────────────────────────────────────────

export interface MutualPerson {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  avatarHue: number;
  taken: boolean;
  alreadyRequested: boolean;
}

export interface MutualSearchResponse {
  query: { firstName: string; lastName: string };
  results: MutualPerson[];
  /** Nobody by that name yet — you may save a private request for when they join. */
  canSaveForJoin: boolean;
}

export type MutualRequestStatus = 'active' | 'waiting' | 'matched' | 'expired' | 'ended' | 'withdrawn';

export interface MutualSentRequest {
  id: string;
  targetName: string;
  avatarHue: number | null;
  status: MutualRequestStatus;
  createdAt: string;
  expiresAt: string;
}

export interface MutualMatchView {
  id: string;
  partner: { firstName: string; lastName: string; age: number; avatarHue: number };
  contacts: { phone: string | null; instagram: string | null };
  myContacts: { phone: string | null; instagram: string | null };
  matchedAt: string;
  canEndAt: string;
  canEnd: boolean;
}

export interface MutualOverview {
  pulse: { searchesThisMonth: number; privatelyChoseYou: number };
  limits: { used: number; limit: number; remaining: number; windowDays: number; requestTtlDays: number };
  active: MutualSentRequest[];
  history: MutualSentRequest[];
  match: MutualMatchView | null;
  taken: boolean;
}

export interface MutualPartnerUpResponse {
  status: 'sent' | 'mutual' | 'saved_for_join';
  matchId: string | null;
}

// ─── Scout (Muse) ──────────────────────────────────────────────────────────

export const SCOUT_LENSES = ['connect', 'learn', 'explore'] as const;
export type ScoutLens = (typeof SCOUT_LENSES)[number];

export interface ScoutIntent {
  summary: string;
  category: string;
  lens: ScoutLens;
  neededSkills: string[];
  interests: string[];
  learningNeeds: string[];
  offers: string[];
  location: string | null;
  context: string | null;
  /** Number of OTHER people wanted (a 4-person team = 3). */
  groupSize: number | null;
  availability: TimeSlot[];
  languages: string[];
}

export interface IntentTags {
  category: ConceptTag;
  neededSkills: ConceptTag[];
  interests: ConceptTag[];
  learningNeeds: ConceptTag[];
}

export interface ScoutPerson {
  id: string;
  firstName: string;
  age: number | null;
  location: string | null;
  avatarHue: number;
  isDemoPersona: boolean;
  roles: string[];
}

export interface ScoutReason {
  kind: 'need' | 'shared' | 'intent' | 'availability' | 'location' | 'learning' | 'language';
  text: string;
}

export interface ScoutCandidate {
  person: ScoutPerson;
  score: number;
  reasons: ScoutReason[];
  caveats: string[];
  theyAreLookingFor: string | null;
  connectionStatus: ScoutConnectionStatus | null;
}

export interface GroupMemberView {
  person: ScoutPerson;
  isYou: boolean;
  contributes: string[];
}

export interface ScoutGroup {
  members: GroupMemberView[];
  score: number;
  explanation: string;
  summary: string;
  covered: ConceptTag[];
  missing: ConceptTag[];
  source: AiSource;
}

export interface ScoutSearchResponse {
  requestId: string;
  intent: ScoutIntent;
  intentTags: IntentTags;
  kind: 'people' | 'group' | 'keep_looking';
  message: string;
  people: ScoutCandidate[];
  group: ScoutGroup | null;
  dnaUpdate: DnaPatch | null;
  /** Where the language understanding came from. Scores are always computed by our engine. */
  source: AiSource;
}

export type ScoutConnectionStatus = 'suggested' | 'pending' | 'connected' | 'declined';

export interface ScoutConnectionView {
  id: string;
  role: 'requester' | 'candidate';
  status: ScoutConnectionStatus;
  origin: 'search' | 'keep_looking';
  other: ScoutPerson;
  score: number;
  reasons: ScoutReason[];
  requestId: string;
  requestSummary: string;
  youAccepted: boolean;
  theyAccepted: boolean;
  contacts: { phone: string | null; instagram: string | null } | null;
  groupKey: string | null;
  createdAt: string;
}

export interface ScoutRequestView {
  id: string;
  summary: string;
  rawText: string;
  lens: ScoutLens;
  watching: boolean;
  createdAt: string;
  connections: number;
}

export interface ScoutOverview {
  requests: ScoutRequestView[];
  connections: ScoutConnectionView[];
}

// ─── Notifications ─────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  system: 'mutual' | 'scout' | 'account';
  type: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
