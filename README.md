# Partner Up AI

**Whatever you're doing, find the right person to do it with.**

> AI doesn't become your friend. It helps you find one.

Partner Up AI is an AI-powered engine for creating **mutually valuable human connections**. You tell it who you need right now, in plain words, and it finds people who need what you offer and offer what you need. It explains why each match makes sense, and it only reveals a connection when both people say yes.

Built at **HackGT 13** for Meta's *Bringing People Closer Together with AI* challenge and the AI/ML track.

---

## Inspiration

Finding people online is easy. Finding the *right* person for what you need *right now* is hard. Today that means browsing hundreds of profiles, posting in huge Discord servers, and messaging strangers with no idea whether the connection helps both of you.

We wanted to change the question from *"Who is available?"* to *"Who would actually benefit from meeting me, and who would I benefit from meeting?"*

## What it does

**Three modes, one engine:**

| Mode | For | What "a great match" means |
|---|---|---|
| 🤝 **Connect** | Friends, gaming squads, niche hobbies, event buddies | Shared interests plus mutual intent (you both want the same kind of connection) |
| 📚 **Learn** | Study pairs, study groups, language exchange | **Complementarity.** You cover their gaps and they cover yours. Nobody is just "the tutor." |
| 🌎 **Explore** | Newcomers, travelers, international students | Place plus mutual intent. The newcomer wants a local, and the local wants to meet newcomers. |

**The flow:** Sign in → pick a mode → short adaptive survey (or *"just tell Partner AI"*) → **Partner DNA** → describe who you need → ranked, explained matches → **Partner Up** (private) → if it's mutual: **It's a partnership 🤝** → shared contacts plus a **Connection Bridge**.

### Signature features

- **Partner DNA**: a concise snapshot of what you shared (interests, strengths, learning needs, languages, social style, availability). It's editable and never a personality verdict.
- **Mutual Intent AI**: the engine checks *both directions*. For example: "You want a local to explore Atlanta with, and Jamal wants to meet international students." Most recommenders only ask "will A like B?"
- **Intent-aware compatibility**: the same two people score differently per mode. Arnav and Alex are a 99% Connect match but a 56% Learn match, and the UI shows why.
- **Similarity ≠ compatibility**: two people who both need help with chemistry look similar, but in Learn they score low, with the caveat *"similar, but neither of you can cover it."*
- **Group complementarity (Learn)**: builds a 3–4 person study group whose members collectively cover the requested subjects. It shows knowledge-coverage bars, a group score and each member's gives/gets, and it can **find the missing partner** for an uncovered subject.
- **Connection Bridge**: after a mutual match, Partner AI surfaces what you already have in common, suggests grounded conversation starters and a safe first step. Then it gets out of the way.
- **Privacy-first mutual consent**: Partner Up requests are private. The other person is never told who chose them. They only see an anonymous count ("2 people privately chose you"). Contact info is revealed only after a mutual match, and only the methods each person opted to share.

## How AI is used

| Where | What the AI does | What it never does |
|---|---|---|
| **Natural-language intent** | Turns *"I'm good at calculus but struggling with chemistry, at night"* into `{mode: learn, offers: [calculus], seeks: [chemistry], availability: [evenings, late_nights]}` using schema-validated structured output | Pick matches or invent scores |
| **Adaptive onboarding** | "Just tell Partner AI": drafts your survey answers from a sentence, and you review them | Save anything without you |
| **Partner DNA** | Writes the headline and one-line summary from your own answers | Infer sensitive traits or diagnose personality |
| **Semantic matching** | A concept ontology maps *ML ≈ AI*, *orgo ⊂ chemistry*, *Valorant ~ CS2* with graded similarity | — |
| **Complementary-need detection** | Deterministic engine compares A's needs with B's strengths **and** B's needs with A's strengths | — |
| **Match explanations** | Rephrases engine-computed facts into a short summary and three grounded "things to do together" | Add facts, mention scores |
| **Connection Bridge** | Grounded conversation starters | Speak as, or impersonate, either person |

**The score is never produced by an LLM.** It's a deterministic, mode-weighted sum of explainable dimensions (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)). The "Why this score?" panel shows every dimension, its value and its weight.

**Works offline too.** Every AI call has a deterministic fallback: a rule-based language parser, templated DNA, grounded explanations and bridges. The demo runs reliably with no API key, and with `ANTHROPIC_API_KEY` set, Claude handles the language understanding and writing.

## Why AI is essential

A filter can match `subject = chemistry`. It can't understand:

> *"I have engineering experience and an idea, but I'm a beginner programmer. I need someone technically stronger who's into sustainability and doesn't mind working with a beginner."*

It can't tell that the person who is *strong* in chemistry and *needs* calculus is a far better partner than the person who also needs chemistry. It also can't tell that *"I love showing newcomers around"* answers *"I just moved here and don't know anyone."* Partner AI understands intent, context, semantic meaning and complementary needs. Then the humans connect.

## Meta challenge: bringing people closer together

Most AI products are trying to replace human interaction. Partner Up uses AI for the opposite purpose: helping people discover meaningful human connections they otherwise may never have found. The AI understands, ranks, explains and suggests a first step, and then it steps back. It never chats as a friend, never impersonates anyone, and never exposes one-sided interest.

## How we built it

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS v4, Framer Motion, Lucide. Mobile-first and accessible (labels, focus rings, keyboard nav, reduced motion, AA contrast).
- **API:** a small typed Node API (`server/`). In dev it's mounted inside Vite, and in prod the same code is served by `server/prod.ts`. All inputs are validated with Zod.
- **AI:** Anthropic Claude via `@anthropic-ai/sdk`, **server-side only**, behind an `AIProvider` interface (swap models by implementing one method). It uses structured outputs, low effort for latency, server-side refusal fallbacks, and deterministic fallbacks on any error or timeout.
- **Data and auth:** a `DataStore` interface with two implementations:
  - **Demo mode** (default): a seeded in-memory store persisted to `.data/`, with local email/password auth (scrypt).
  - **Supabase mode:** Postgres plus Supabase Auth, with a migration that includes **Row Level Security** (validated against real Postgres in development).
- **Tests:** Vitest covers the matching engine plus end-to-end API tests of all three demo scenarios, privacy and authorization.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173 and click **Live demo**. No keys are needed.

Optional: `cp .env.example .env` and set `ANTHROPIC_API_KEY` to enable Claude.

```bash
npm test
```

```bash
npm run build
```

```bash
npm start
```

`npm test` runs the engine and API tests. `npm run build` typechecks, then builds the SPA and server bundle. `npm start` serves the production build on `PORT` (default 8787).

### Using Supabase (optional)

1. Create a Supabase project. Run `supabase/migrations/0001_partner_up.sql` in the SQL editor.
2. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_EMAIL` and `DEMO_PASSWORD` in `.env`.
3. Seed the demo world:

```bash
npm run seed:supabase
```

The service-role key is read only by the server. The browser receives only the public anon key, via `/api/config`.

## The 2-minute demo

1. **Landing:** hero, the three modes, "Or tell Partner AI…". Click **Live demo**.
2. **Connect:** click the Connect demo scenario (*"I want someone to play Valorant with at night who also likes F1."*).
   - *Partner AI understood:* Connect · Gaming partners · Valorant, F1 · At night.
   - **Alex Rivera: 96%**. Both play Valorant, both follow F1, and *Alex is also looking for people to game with*.
3. **View match:** open the animated score and **Why this score?** (weighted dimensions), then the Mutual Intent panel.
4. **Partner Up:** Alex's demo persona independently evaluates the match from *their* side and accepts. **IT'S A PARTNERSHIP 🤝** appears, then the Connection Bridge (common ground, starters) and Alex's shared contacts.
5. **Learn:** run the Learn scenario. **Maya: 95%**. *Maya can help you with Chemistry, you can help Maya with Calculus* gives a **mutual learning match**. Point out Ethan (needs chemistry too) scoring low: *similarity ≠ compatibility*.
6. **Groups:** build a Calculus/Chemistry/Python group. The coverage bars fill and every member gives and gets.
7. **Explore:** run the Explore scenario. **Jamal: 96%**. A local who wants to meet international students gives mutual intent.
8. Close: *"AI doesn't become your friend. It helps you find one."*

**Reset demo** (Home or Profile) restores the demo account so you can run it again.

Demo personas are clearly labelled **Demo profile**. They're fictional, and they "decide" instantly by scoring the match from their own perspective so the full mutual flow can be shown live.

## Privacy and safety

- One-sided requests are **never** visible to their target, in the API or via RLS.
- Contacts are revealed only in an active mutual match and only if the owner opted in. Ending a partnership hides them and resets consent.
- Discovery responses contain only a reduced public profile (no email, no contacts, no raw embeddings, no "who chose me").
- Profile fields are user-controllable (show/hide age, community, pronouns). Account deletion removes everything.
- Avatars are generated initials, with no photos and no attractiveness ranking.
- AI calls are server-side only, and no secrets are in the client bundle (verified on the build output).
- Inputs are validated and sanitized server-side. AI endpoints are rate-limited. No stack traces are sent to clients.
- Prompts instruct the model to treat user text as data, use only provided facts, never infer sensitive attributes, and never impersonate.

## Challenges

- Making compatibility **explainable and honest**. Early versions said "Both love K-pop" when only one person did, so every "shared" reason is now checked against the concept hierarchy.
- Balancing AI flexibility with **demo reliability**, which is why every AI function has a grounded deterministic fallback.
- Designing consent so that nothing one-sided ever leaks, including through group requests.

## Accomplishments

- A working mutual-consent loop from natural language to explained match to private Partner Up to celebration and Connection Bridge.
- One engine with three genuinely different definitions of "a great match".
- Group complementarity that builds balanced study groups and finds the missing partner.

## What we learned

Similarity-based recommenders get human connection subtly wrong. Mutual benefit is the right objective, and it has to be computed from both sides.

## What's next

More modes (🚀 Build, 🏠 Live, 🎯 Compete, 🎮 Hangout and the original 💗 secret mutual Partner Up for adults), embeddings alongside the ontology, learning from 👍/👎 feedback, Discord group creation for partnerships, and notifications for "someone you searched for just joined."
