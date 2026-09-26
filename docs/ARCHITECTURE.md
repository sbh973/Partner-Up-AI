# Partner Up AI: architecture

## System

```
React (Vite SPA) ──HTTPS──▶ /api (Node, same origin)
                              ├─ http/router    auth · validation (Zod) · rate limits · safe errors
                              ├─ services/      profiles · matching · groups (authorization lives here)
                              ├─ matching/      deterministic, intent-aware engine
                              ├─ semantic/      concept ontology + graded similarity
                              ├─ ai/            Partner AI: provider abstraction + deterministic fallbacks
                              └─ data/          DataStore → MemoryStore (demo) | SupabaseStore (Postgres + RLS)
                                                          Anthropic Claude (server-side only)
```

- **Dev:** `npm run dev` mounts the API inside Vite (`vite.config.ts` → `server/app.ts`).
- **Prod:** `npm run build && npm start` bundles `server/prod.ts`, which serves `dist/` and `/api`.
- The browser never holds an AI key or the Supabase service key. `/api/config` exposes only the public anon key (in Supabase mode).

## Folder map

```
shared/            types.ts (the API contract), labels.ts
server/
  ai/              provider.ts (schemas + interface) · anthropic.ts · service.ts · heuristics.ts · templates.ts
  api/             routes.ts · schemas.ts (input validation)
  data/            store.ts (interface) · memoryStore.ts · supabaseStore.ts · seed.ts · mappers.ts
  http/            router.ts · errors.ts · rateLimit.ts
  matching/        side.ts · engine.ts · weights.ts · availability.ts · recommend.ts · groups.ts
  semantic/        ontology.ts · similarity.ts
  services/        profiles.ts · matching.ts · groups.ts
  auth.ts · config.ts · app.ts · prod.ts
src/
  components/      ui · ai · match · dna · partnership · profile · modes · layout · brand
  features/survey  adaptive survey state + mode questions
  lib/             api · auth · me · modes · session · useLoad · usePartnerUp
  pages/           Landing · Auth · Home · Onboarding · Discover · MatchDetail · Partnership · Matches · Groups · Profile
supabase/migrations/0001_partner_up.sql
scripts/seed-supabase.ts
tests/             matching.test.ts · api.test.ts
```

## Matching algorithm

Each person becomes a **Side** for a mode: *who they are* (profile) + *what they want now* (the mode survey, overridden by a live natural-language intent) + *what they offer*. Everything is canonicalised to ontology concept ids.

**Semantic similarity** `sim(a, b)` ∈ [0, 1] is graded as follows:

| Relationship | Similarity |
|---|---|
| Identical | 1.00 |
| Parent/child (Chemistry ⊃ Organic chem) | 0.85 |
| Explicitly related (Photography ~ Art) | 0.75 |
| Siblings (Valorant ~ CS2) | 0.55 |
| Cousins | 0.40 |
| Same category | optional small credit |

- `coverage(wanted, pool)` = mean over wanted of the best `sim` found in pool.
- `softOverlap(A, B)` = greedy one-to-one pairing of the strongest matches, saturating at 3 shared items.

**Mutual intent** is always two-sided:

```
aWants = coverage(A.seeks, B.offers ∪ B.interests ∪ B.roleTags ∪ …)
bWants = coverage(B.seeks, A.offers ∪ A.interests ∪ A.roleTags ∪ …)
mutual = √(aWants · bWants)     // geometric mean: both must benefit
```

**Dimensions and weights (per mode):**

| Connect | | Learn | | Explore | |
|---|---|---|---|---|---|
| Shared interests | 30% | Complementary strengths `(aGets+bGets)/2` | 35% | Location relevance `city · (0.6 + 0.4·roleFit)` | 25% |
| Mutual intent | 25% | Mutual learning value `√(aGets·bGets)` | 25% | Mutual intent | 25% |
| Availability | 20% | Availability | 15% | Shared interests | 20% |
| Social fit (group size, setting) | 15% | Learning-style fit | 15% | Availability | 15% |
| Location & context | 10% | Shared courses & context | 10% | Language compatibility | 15% |

The Learn formulas use `aGets = coverage(A.needs, B.strengths)` and `bGets = coverage(B.needs, A.strengths)`.

```
score = round(100 · Σ weight_d · score_d)        clamped to 1–99
```

If a hard requirement isn't met (e.g. Explore in a city the other person isn't in), the score is multiplied by 0.5 and a caveat is shown. Availability is directional when you asked for a time ("at night" means: are *they* free then?), and it uses an overlap coefficient otherwise.

**Reasons** are generated from the same computation and must be literally true: "Both love Music" appears only when both listed music, or one listed a kind of music. Merely related interests are labelled "Related interests: …".

**Group complementarity** (Learn) is built greedily, adding the member that maximises:

```
0.45 · subject coverage + 0.30 · reciprocity (everyone gives & gets)
+ 0.15 · shared availability + 0.10 · balance of contributions
```

**Find missing partner** picks the strongest candidate in the weakest subject, with the group objective as the tiebreak.

## AI request/response schemas (`server/ai/provider.ts`)

| Function | Input | Output (Zod, structured output) | Fallback |
|---|---|---|---|
| `parsePartnerIntent` | user text + mode hint | `{mode, summary, seeks[], offers[], interests[], availability[], groupPreference, groupSizeMax, setting, location, role, languagesSpoken[], languagesLearning[], followUps[≤2]}` | `heuristics.parseIntentLocally` |
| `draftProfileFromText` | text + mode | profile fields + mode answers | `heuristics.draftProfileLocally` |
| `generatePartnerDNA` | deterministic DNA sections | `{headline, summary}` | archetype + template |
| `generateMatchNarrative` | engine reasons/caveats/offers | `{summary, ideas[3]}` | `templates.fallbackNarrative` |
| `generateConnectionBridge` | shared tags, exchange | `{starters[≤3], firstStep}` | `templates.fallbackBridge` |

Model output is canonicalised through the ontology and validated. It never contains or changes a score. Results are cached (LRU), and DNA is persisted.

## Database (Supabase)

The tables are `profiles`, `mode_profiles`, `partner_dna`, `contact_methods`, `intents`, `partner_requests`, `matches`, `match_feedback`, `study_groups`, `study_group_members` and `notifications`. They use UUID keys, cascade deletes and targeted indexes (e.g. a unique open request per pair/mode, and a unique active match per pair/mode).

**RLS** was validated against real Postgres (PGlite) with 17 checks:

- You see only your own profile, answers, DNA, intents, feedback and notifications.
- **Partner requests are readable only by the requester.** No policy lets the target read them.
- Matches are visible only to their two participants. Participants may only update `active`/`ended_by` (column grants).
- Contact methods are visible to their owner and, *only while an active mutual match exists*, to the partner for methods with `share_on_match`.
- Study-group visibility goes through a `SECURITY DEFINER` helper, which avoids policy recursion.
- Users can't flip `is_demo_persona` or `user_id`, because profile updates are column-restricted.

## Environment variables

| Variable | Scope | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | server | Enables Claude (optional) |
| `ANTHROPIC_MODEL` | server | Default `claude-opus-5` |
| `AI_TIMEOUT_MS` | server | Falls back to local understanding after this (default 9000) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | server → browser via `/api/config` | Supabase mode |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Supabase mode |
| `DEMO_EMAIL`, `DEMO_PASSWORD` | server only | One-click demo in Supabase mode |
| `PORT` | server | Prod server port |
| `PERSIST_DEMO_DATA` | server | `false` disables writing `.data/demo-db.json` |

## Known limits and risks

- **Demo mode** keeps data in one process (persisted to `.data/`). Use Supabase mode for multi-instance or serverless hosting.
- The rate limiter is in-memory. Swap in Redis/Upstash for production.
- The ontology covers the demo domains well. Unknown terms fall back to token overlap. Embeddings can be added behind `similarity.ts` without touching the engine.
- Supabase mode is typechecked and its SQL/RLS is validated in Postgres, but it has not been run against a live Supabase project in this repo.
