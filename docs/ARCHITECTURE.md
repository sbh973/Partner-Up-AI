# Partner Up — architecture

## System

```
React (Vite SPA) ──same-origin HTTPS──▶ /api (Node)
                                          ├─ http/       router · cookies · CSRF header · rate limits · safe errors
                                          ├─ api/        routes + Zod input schemas
                                          ├─ auth.ts     scrypt passwords · HMAC'd session tokens
                                          ├─ account/    profile setup (identity locked) · contacts · delete
                                          ├─ mutual/     requests · matches · pulse          ← NO AI (lint-enforced)
                                          ├─ scout/      Partner DNA · engine · groups · Keep Looking
                                          ├─ semantic/   concept ontology + graded similarity
                                          ├─ ai/         AIProvider → MuseProvider | offline fallback
                                          └─ db.ts       Prisma → SQLite
                                                              │
                                                              └──▶ Muse Responses API (server-side only)
```

- **Dev:** `npm run dev` mounts the API inside Vite (`vite.config.ts` → `server/app.ts`), so one process is the whole app.
- **Prod:** `npm run build && npm start` bundles `server/prod.ts`, which serves `dist/` and `/api`.
- **Secrets:** env vars are read only on the server (`server/config.ts`). `GET /api/config` exposes only booleans and demo account names.

## Data model (`prisma/schema.prisma`)

| Model | Purpose |
|---|---|
| `User`, `Session`, `Profile` | Account, cookie sessions (token HMAC only), locked identity plus contacts |
| `MutualRequest` | One-sided secret choice. `targetId` is null while "waiting for them to join". Statuses: `active`, `waiting`, `matched`, `expired`, `ended`, `withdrawn` |
| `MutualSearch` | Feeds the anonymous Partner Pulse counts (deduplicated per searcher/target/day) |
| `MutualMatch` | Created atomically when a request becomes reciprocal. Sets both users `taken`; `earliestEndAt` = +24h |
| `PartnerDNA` | Scout profile (JSON list columns) with `lastSource` = `muse`, `offline` or `manual` |
| `ScoutRequest` | A parsed request (intent JSON, lens); `watching` = Keep Looking |
| `ScoutConnection` | Requester ↔ candidate: score, explanation, per-side acceptance, and status (`suggested`, `pending`, `connected`, `declined`) |
| `Notification` | Inbox for both systems. Mutual messages never name a one-sided sender |

## Mutual flow

```
partnerUp(A → B)
  ├─ B taken? → 409          limit (5 / 30 days) reached? → 409
  ├─ B → A active?  ── yes ─▶ transaction: create MutualMatch, mark both matched + taken, notify both
  └─ no ─▶ store secret request (expires in 30 days)
```

Requests expire lazily on read. `onProfileCreated` attaches "waiting" requests to a newly joined user and notifies the sender that they joined, never whether they chose back.

## Scout flow

```
text ──▶ Muse.parseGroupIntent ──(timeout/error)──▶ offline parser
             │
             ▼ ScoutIntent {lens, category, neededSkills, interests, location, groupSize, availability}
  about-me facts → visible DnaPatch (with Undo)
             │
             ▼
  engine.scoreCandidate(me, intent, them)   ← deterministic; weights per lens; gates
             │
     groupSize > 1 ? assembleGroup (greedy) : top people ≥ 55
             │                                   │ none
             ▼                                   ▼
  Muse writes explanation from computed facts   Keep Looking (watching = true)
                                                 └─ matchWatchersAgainst(newUser) → notify both at ≥ 65
```

### Semantic similarity

Terms are canonicalised to ontology concept ids (`server/semantic/ontology.ts`). `sim(a, b)` is graded:

| Relationship | Similarity |
|---|---|
| Identical | 1.00 |
| Ancestor/descendant (Programming ⊃ JavaScript ⊃ React) | 0.85, −0.1 per level (min 0.6) |
| Explicitly related | 0.75 |
| Siblings | 0.55 |
| Cousins | 0.40 |

Unknown terms fall back to token overlap. Muse's `analyzeSemanticSimilarity` is used only when neither term is in the ontology.

### Locations

`server/scout/location.ts` resolves campuses and cities (KSU ⊂ Kennesaw ⊂ metro Atlanta; Georgia Tech, Emory, GSU, …). A match in the same place scores highest, then the same city, then the same metro area.

### Groups

Groups are assembled greedily from the top 15 candidates scoring 40 or more. The value of a group is `0.5·mean fit + 0.3·coverage + 0.2·shared timing`. Coverage depends on the lens:

- Connect and Learn: how well the group covers the requested skills.
- Explore: how much the members actually want to go out and explore.

## AI provider (`server/ai`)

- `provider.ts`: Zod schemas plus the `AIProvider` interface.
- `muse.ts`: the `callMuse()` adapter. POST `{base}/responses` with `text.format: json_object`, `reasoning.effort: minimal` and `store: false`; the response is read from `output[].content[].output_text`.
- `service.ts`: `attempt()` wraps each call with a timeout, a small cache and a fallback. Logs record the reason only, never the key or user text.
- `offline.ts`: the deterministic parser used whenever Muse is unavailable.

## Testing

- `tests/app.test.ts`: the real API against a throwaway SQLite database, with the offline provider. Covers auth, CSRF, the identity lock, the Mutual demo, save-for-join, limits, DNA extraction, all Scout demos, groups, Keep Looking, consent and privacy.
- `tests/muse.test.ts`: `MuseProvider` against a mock Responses server. Checks the request shape, validation and fallbacks.
