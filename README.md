# Partner Up — AI powered by Muse

**One platform for the people you already know — and the people you need to find.**

Partner Up has two deliberately different systems that share one account:

| | **Mutual** — *You know WHO* | **Scout** — *You know WHAT* |
|---|---|---|
| The problem | You like someone you already know, but saying so first feels risky. | You need a teammate, a roommate, a study group or people to explore with, and you don't know who. |
| How it works | Privately choose someone by their exact name. They're only told if they choose you too. | Tell Muse what you need in plain language. It understands, and Partner Up's engine finds and explains the best fits. |
| AI | **None.** Mutual is pure logic. | **Muse** (Meta) understands language; a deterministic engine scores. |
| Look | Banana → peach | Banana → sky |

---

## Mutual — "Make the move without making it awkward"

1. Sign up with email and password, then set up your profile: first/last name, gender and age (these are **locked** after setup), plus a phone number and/or Instagram.
2. Search by **exact first + last name**. Mutual is not for browsing strangers.
3. Tap **Partner Up**. It's secret: the other person is **never told who sent it**.
4. If they independently Partner Up with you → **IT'S MUTUAL**. Both of you see the other's contact info at the same moment.

**Rules**

- 5 requests per 30 days, and each request expires after 30 days.
- A matched person is **taken** and can't receive new requests.
- A match can only be ended after 24 hours.
- Someone not on Partner Up yet? Save a private request. It's waiting for them when they join, and you're told they joined, never whether they chose you.
- **Partner Pulse** shows anonymous counts only: "you appeared in 6 searches this month", "1 person has privately Partnered Up with you". Never who.

There is **no AI anywhere in Mutual**. An ESLint rule (`no-restricted-imports`) stops `server/mutual` from importing the AI, Scout or semantic code.

## Scout — "Tell Muse what you need"

1. **Meet Muse.** A 3-question chat builds your **Partner DNA**: interests, skills, what you're learning, goals, location, availability and more. Every item Muse adds appears on screen as it's added, and you can edit everything on the Partner DNA page. **Nothing is saved silently.**
2. **Ask in plain language.** For example: "I need a programmer for a sustainability hackathon", "Find me a roommate at KSU next semester", "Find me a group to explore Atlanta this weekend".
3. **Curated results, no swiping.** A few people or one assembled group, each with **"Why Muse matched you"**: grounded reasons and honest caveats.
4. **Consent first.** Tap Partner Up. Contact info unlocks only when **both** people say yes.
5. **Keep Looking.** No strong fit? Muse won't show weak matches. It saves the search and notifies **both people** when someone who fits joins.

Each request picks one of three lenses. Muse chooses the lens; the engine applies these weights.

| Lens | Weights |
|---|---|
| **Connect** (teams, roommates, friends) | interests 35 · goals 25 · availability 20 · social fit 10 · complementary 10 |
| **Learn** (study groups, tutoring, exchange) | strength→weakness coverage 40 · mutual benefit 25 · availability 15 · preferences 10 · academic context 10 |
| **Explore** (cities, newcomers, weekend plans) | location 30 · interests 25 · mutual intent 20 · availability 15 · language 10 |

Hard gates keep results honest:

- For Explore, a person outside the requested place is halved.
- For Connect, someone missing the skill you asked for is scaled down.

People show from a score of 55. Keep Looking only alerts you for a new person at 65 or above.

## How Muse is used (and how it isn't)

Muse is Meta's hosted model (`muse-spark-1.1`), called through its OpenAI-compatible **Responses API**. It is **server-side only** behind an `AIProvider` interface (`server/ai/provider.ts`):

| Method | What Muse does |
|---|---|
| `extractProfile` | Turns "I'm a CS student at KSU who loves hackathons" into Partner DNA fields |
| `parseGroupIntent` | Turns a request into lens, category, needed skills, location, group size and timing |
| `analyzeSemanticSimilarity` | Rates unfamiliar terms (known terms use the built-in concept ontology) |
| `generateGroupExplanation` / `generateGroupSummary` | Writes "why this group works" **from facts the engine computed** |
| `reply` | Muse's short conversational lines |

What Muse never does:

- **Muse never produces scores.** Every number comes from `server/scout/engine.ts`.
- It never sees contact info.
- It never touches Mutual.

Every call has a **5-second timeout and a deterministic fallback**: a rule-based parser, a concept ontology and templated explanations. With no key, an invalid key, or a network failure, the whole app still works. The UI says so quietly ("Using offline matching") and never claims Muse wrote something it didn't.

## Tech stack

- **Client:** React 19, Vite, TypeScript, Tailwind CSS v4, Framer Motion (respects reduced motion), Lucide icons, Manrope.
- **Server:** Node (same origin as the client, no CORS), Zod validation, Prisma + SQLite.
- **AI:** Muse (Meta) via the Responses API, with an offline fallback provider.

**Security**

- Passwords are hashed with scrypt.
- Sessions use HttpOnly SameSite cookies, and the database stores only an HMAC of each token.
- Every write requires a CSRF header.
- Rate limits, input validation and safe error messages.
- One-sided request senders are never exposed, and contact info is never shown before a connection.

## Run it locally

Requires Node 22+.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Put your Muse key in `.env.local` (optional: without one, Scout runs in offline mode). Then:

```bash
npm run dev
```

Open http://localhost:5173. The database is created and seeded with 20+ fictional people on first run.

**Production build:**

```bash
npm run build
```

```bash
npm start
```

Set `SESSION_SECRET` in production.

### Environment variables

See [`.env.example`](.env.example) for the full list with comments. Variable names only; **never commit real values**. Put real keys in `.env.local` (gitignored) locally, and in your host's secret manager (e.g. Vercel → Environment Variables) in production. Nothing is prefixed `VITE_`, so no variable can reach browser code.

| Variable | Purpose |
|---|---|
| `AI_PROVIDER` | `muse` (default) or `offline` |
| `MUSE_API_KEY` | Muse API key (server-only) |
| `MUSE_MODEL` | Default `muse-spark-1.1` |
| `MUSE_BASE_URL` | Default `https://api.meta.ai/v1` |
| `MUSE_REASONING_EFFORT` / `MUSE_TIMEOUT_MS` | Latency controls (default `minimal` / `5000`) |
| `DATABASE_URL` | SQLite file, default `file:./dev.db` |
| `SESSION_SECRET` | Required in production |
| `DEMO_MODE` | Seed demo data and one-click demo accounts (default `true`) |
| `MUTUAL_REQUEST_LIMIT`, `MUTUAL_WINDOW_DAYS`, `MUTUAL_REQUEST_TTL_DAYS`, `MUTUAL_END_AFTER_HOURS`, `MIN_AGE` | Mutual rules |

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Sync the DB schema and start Vite with the API mounted |
| `npm test` | End-to-end API tests (offline provider) plus Muse provider tests against a mock server |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run build` / `npm start` | Production bundle and server |

## Demo script (about 4 minutes)

Sign in with the one-click demo accounts **Arnav** and **Riya**. Use **Account → Reset demo** to start fresh.

1. **Mutual (no AI).**
   - As **Arnav**: Mutual → search "Riya Shah" → Partner Up. Riya is not told.
   - Account → **Switch to Riya Shah**. Partner Pulse shows "1 person has privately Partnered Up with you", with no name.
   - Search "Arnav Desai" → Partner Up → **IT'S MUTUAL**. Contacts appear on both sides.
2. **Scout: meet Muse.**
   - As Arnav, open Scout. Answer Muse's questions and watch Partner DNA chips appear live.
   - Show the Partner DNA page: everything is editable.
3. **Scout: people.** "I need a programmer for a sustainability hackathon."
   - Muse names Alex, with a 95% score and grounded reasons. Partner Up → connected.
4. **Scout: roommate.** "Find me a roommate at KSU next semester." Marcus is at KSU and looking for next semester too.
5. **Scout: group.** "Find me a group to explore Atlanta this weekend." A group card with members, what each is into, and why it works.
6. **Keep Looking.**
   - As Riya: "Find me a robotics teammate at KSU." Muse: nobody fits yet, I'll keep looking.
   - Tap **A new student joins** → "Muse found someone" → Inbox → Tyler → Partner Up → contacts unlock.

## HackGT

- **What it is:** Partner Up turns two kinds of "I wish I could meet…" into safe, low-pressure connections. Mutual is for people you already know; Scout is for people you need to find.
- **How we built it:**
  - React + Vite + Tailwind front end; a Node + Prisma/SQLite API on the same origin.
  - A hand-built concept ontology and a location resolver (KSU ⊂ Kennesaw ⊂ metro Atlanta).
  - A lens-weighted, gated scoring engine and a greedy group assembler.
  - Muse for language understanding and explanations, with a deterministic fallback for every call.
- **Challenges:**
  - Keeping AI useful but never in charge of numbers.
  - Making "no silent saves" and "consent before contacts" true at the data layer, not just in the UI.
  - Keeping a live demo reliable when the network isn't.
- **What we're proud of:** Mutual has literally zero AI. Every Scout score is explainable. Muse degrades gracefully instead of breaking.
- **What's next:** Campus verification, group chats for connected teams, and more places and concepts in the ontology.

All people in the demo data are fictional.
