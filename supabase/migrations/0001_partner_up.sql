-- Partner Up AI — schema, indexes and Row Level Security.
--
-- Access model
--   • The API server uses the service role (bypasses RLS) and performs its own
--     authorization checks for every request.
--   • RLS below is defence in depth: if anyone queries with the public anon
--     key + a user JWT, they can only ever see their own rows, the partnerships
--     they are part of, and contacts a partner explicitly chose to share.
--   • One-sided Partner Up requests are NEVER readable by their target.

-- gen_random_uuid() is built into Postgres 13+ (Supabase runs 15+).

-- ─── Profiles ──────────────────────────────────────────────────────────────

create table public.profiles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references auth.users (id) on delete cascade,
  display_name     text not null check (char_length(display_name) between 1 and 60),
  age              int check (age is null or age between 13 and 120),
  pronouns         text check (pronouns is null or char_length(pronouns) <= 30),
  community        text check (community is null or char_length(community) <= 80),
  city             text check (city is null or char_length(city) <= 80),
  bio              text not null default '' check (char_length(bio) <= 600),
  interests        text[] not null default '{}',
  skills           text[] not null default '{}',
  languages        jsonb not null default '[]'::jsonb,
  availability     text[] not null default '{}',
  group_sizes      text[] not null default '{}',
  setting          text not null default 'either' check (setting in ('online', 'in_person', 'either')),
  visibility       jsonb not null default '{"age": true, "community": true, "pronouns": true}'::jsonb,
  avatar_hue       int not null default 20 check (avatar_hue between 0 and 359),
  is_demo_persona  boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Real people always have a login; only seeded demo personas may not.
  constraint profiles_owner check (user_id is not null or is_demo_persona)
);

-- Helper: the caller's profile id (null for anon).
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where user_id = auth.uid()
$$;

revoke all on function public.current_profile_id() from public;
grant execute on function public.current_profile_id() to authenticated;

-- ─── Mode profiles (survey answers per mode) ───────────────────────────────

create table public.mode_profiles (
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  mode         text not null check (mode in ('connect', 'learn', 'explore')),
  looking_for  text not null default '' check (char_length(looking_for) <= 280),
  seeks        text[] not null default '{}',
  offers       text[] not null default '{}',
  details      jsonb not null,
  active       boolean not null default true,
  updated_at   timestamptz not null default now(),
  primary key (profile_id, mode)
);
create index mode_profiles_active_idx on public.mode_profiles (mode) where active;

-- ─── Partner DNA (cached AI summary of voluntarily shared info) ────────────

create table public.partner_dna (
  profile_id  uuid primary key references public.profiles (id) on delete cascade,
  headline    text not null,
  summary     text not null,
  sections    jsonb not null default '[]'::jsonb,
  source      text not null check (source in ('ai', 'local')),
  updated_at  timestamptz not null default now()
);

-- ─── Contact methods (revealed only after mutual Partner Up) ───────────────

create table public.contact_methods (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  kind            text not null check (kind in ('email', 'instagram', 'discord', 'discord_invite', 'phone', 'other')),
  value           text not null check (char_length(value) between 1 and 200),
  share_on_match  boolean not null default false,
  created_at      timestamptz not null default now()
);
create index contact_methods_profile_idx on public.contact_methods (profile_id);

-- ─── Intents (natural-language requests, for transparency & improvement) ───

create table public.intents (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  mode        text not null check (mode in ('connect', 'learn', 'explore')),
  raw_text    text not null check (char_length(raw_text) <= 600),
  parsed      jsonb not null,
  created_at  timestamptz not null default now()
);
create index intents_profile_idx on public.intents (profile_id, created_at desc);

-- ─── Partner Up requests (private, one-sided until mutual) ─────────────────

create table public.partner_requests (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles (id) on delete cascade,
  target_id     uuid not null references public.profiles (id) on delete cascade,
  mode          text not null check (mode in ('connect', 'learn', 'explore')),
  score         int not null check (score between 0 and 100),
  intent_text   text check (intent_text is null or char_length(intent_text) <= 300),
  status        text not null default 'pending' check (status in ('pending', 'matched', 'withdrawn', 'expired')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '30 days',
  constraint partner_requests_not_self check (requester_id <> target_id)
);
create unique index partner_requests_one_open_idx
  on public.partner_requests (requester_id, target_id, mode)
  where status in ('pending', 'matched');
create index partner_requests_target_idx on public.partner_requests (target_id, status);

-- ─── Matches (mutual partnerships) ─────────────────────────────────────────

create table public.matches (
  id                   uuid primary key default gen_random_uuid(),
  user_a               uuid not null references public.profiles (id) on delete cascade,
  user_b               uuid not null references public.profiles (id) on delete cascade,
  mode                 text not null check (mode in ('connect', 'learn', 'explore')),
  compatibility_score  int not null check (compatibility_score between 0 and 100),
  explanation          jsonb,
  bridges              jsonb not null default '{}'::jsonb,
  matched_at           timestamptz not null default now(),
  active               boolean not null default true,
  ended_by             uuid references public.profiles (id) on delete set null,
  constraint matches_ordered check (user_a < user_b)
);
create unique index matches_one_active_idx on public.matches (user_a, user_b, mode) where active;
create index matches_user_a_idx on public.matches (user_a);
create index matches_user_b_idx on public.matches (user_b);

-- ─── Feedback on recommendations ───────────────────────────────────────────

create table public.match_feedback (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  target_id   uuid not null references public.profiles (id) on delete cascade,
  mode        text not null check (mode in ('connect', 'learn', 'explore')),
  value       text not null check (value in ('good', 'not_for_me')),
  created_at  timestamptz not null default now(),
  unique (profile_id, target_id, mode)
);

-- ─── Study groups (LEARN) ──────────────────────────────────────────────────

create table public.study_groups (
  id               uuid primary key default gen_random_uuid(),
  creator_id       uuid not null references public.profiles (id) on delete cascade,
  subjects         text[] not null default '{}',
  complementarity  int not null default 0 check (complementarity between 0 and 100),
  created_at       timestamptz not null default now()
);

create table public.study_group_members (
  group_id    uuid not null references public.study_groups (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  role        text not null default 'member' check (role in ('creator', 'member')),
  primary key (group_id, profile_id)
);
create index study_group_members_profile_idx on public.study_group_members (profile_id);

-- ─── Notifications ─────────────────────────────────────────────────────────

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  type        text not null check (type in ('mutual_match', 'interest', 'request_expired', 'group_formed')),
  title       text not null,
  body        text not null,
  link        text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index notifications_profile_idx on public.notifications (profile_id, created_at desc);

-- ─── Row Level Security ────────────────────────────────────────────────────

alter table public.profiles            enable row level security;
alter table public.mode_profiles       enable row level security;
alter table public.partner_dna         enable row level security;
alter table public.contact_methods     enable row level security;
alter table public.intents             enable row level security;
alter table public.partner_requests    enable row level security;
alter table public.matches             enable row level security;
alter table public.match_feedback      enable row level security;
alter table public.study_groups        enable row level security;
alter table public.study_group_members enable row level security;
alter table public.notifications       enable row level security;

-- Profiles: you manage your own. Other people's profiles are served only by
-- the API as a reduced public view (see server/data/mappers.ts toPublicProfile).
create policy profiles_select_own on public.profiles for select to authenticated using (user_id = auth.uid());
create policy profiles_insert_own on public.profiles for insert to authenticated with check (user_id = auth.uid() and not is_demo_persona);
create policy profiles_update_own on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and not is_demo_persona);
create policy profiles_delete_own on public.profiles for delete to authenticated using (user_id = auth.uid());

-- Owner-only tables.
create policy mode_profiles_own on public.mode_profiles for all to authenticated
  using (profile_id = public.current_profile_id()) with check (profile_id = public.current_profile_id());
create policy partner_dna_own on public.partner_dna for all to authenticated
  using (profile_id = public.current_profile_id()) with check (profile_id = public.current_profile_id());
create policy intents_own on public.intents for all to authenticated
  using (profile_id = public.current_profile_id()) with check (profile_id = public.current_profile_id());
create policy match_feedback_own on public.match_feedback for all to authenticated
  using (profile_id = public.current_profile_id()) with check (profile_id = public.current_profile_id());
create policy notifications_own_select on public.notifications for select to authenticated
  using (profile_id = public.current_profile_id());
create policy notifications_own_update on public.notifications for update to authenticated
  using (profile_id = public.current_profile_id()) with check (profile_id = public.current_profile_id());

-- Contacts: owner has full control; a partner in an ACTIVE mutual match may
-- read only the methods the owner opted to share.
create policy contact_methods_own on public.contact_methods for all to authenticated
  using (profile_id = public.current_profile_id()) with check (profile_id = public.current_profile_id());
create policy contact_methods_partner_read on public.contact_methods for select to authenticated
  using (
    share_on_match
    and exists (
      select 1 from public.matches m
      where m.active
        and (
          (m.user_a = contact_methods.profile_id and m.user_b = public.current_profile_id())
          or (m.user_b = contact_methods.profile_id and m.user_a = public.current_profile_id())
        )
    )
  );

-- Partner Up requests: ONLY the requester can see or manage them. There is
-- deliberately no policy that lets the target read a request.
create policy partner_requests_requester_select on public.partner_requests for select to authenticated
  using (requester_id = public.current_profile_id());
create policy partner_requests_requester_insert on public.partner_requests for insert to authenticated
  with check (requester_id = public.current_profile_id() and status = 'pending');
create policy partner_requests_requester_withdraw on public.partner_requests for update to authenticated
  using (requester_id = public.current_profile_id())
  with check (requester_id = public.current_profile_id() and status in ('pending', 'withdrawn'));

-- Matches: visible only to the two people in them; either may end it.
create policy matches_participants_select on public.matches for select to authenticated
  using (public.current_profile_id() in (user_a, user_b));
create policy matches_participants_end on public.matches for update to authenticated
  using (public.current_profile_id() in (user_a, user_b))
  with check (public.current_profile_id() in (user_a, user_b));

-- Study groups: creator and members can see them. Membership checks go
-- through a SECURITY DEFINER helper so the two policies don't recurse.
create or replace function public.is_study_group_participant(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.study_groups s
    where s.id = target_group and s.creator_id = public.current_profile_id()
  ) or exists (
    select 1 from public.study_group_members m
    where m.group_id = target_group and m.profile_id = public.current_profile_id()
  )
$$;
revoke all on function public.is_study_group_participant(uuid) from public;
grant execute on function public.is_study_group_participant(uuid) to authenticated;

create policy study_groups_select on public.study_groups for select to authenticated
  using (public.is_study_group_participant(study_groups.id));
create policy study_groups_insert on public.study_groups for insert to authenticated
  with check (creator_id = public.current_profile_id());
create policy study_group_members_select on public.study_group_members for select to authenticated
  using (public.is_study_group_participant(study_group_members.group_id));

-- ─── Column-level hardening ────────────────────────────────────────────────
-- Where users may update a row, restrict WHICH columns: nobody can rewrite a
-- match score, un-end someone else's decision, or edit a request's target.
revoke update on public.matches from authenticated;
grant update (active, ended_by) on public.matches to authenticated;
revoke update on public.partner_requests from authenticated;
grant update (status) on public.partner_requests to authenticated;
revoke update on public.notifications from authenticated;
grant update (read) on public.notifications to authenticated;
revoke update on public.profiles from authenticated;
grant update (
  display_name, age, pronouns, community, city, bio, interests, skills, languages,
  availability, group_sizes, setting, visibility, updated_at
) on public.profiles to authenticated;
