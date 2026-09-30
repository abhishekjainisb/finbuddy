# FinBuddy (ISB Finance Club, Co'27)

A practice-first portal built from the *Finance Placement Prep Guide* (Edition 1.1). The loop is **Read, Drill, Prove, Track**.

## What is in the pilot

| Area | Contents |
|---|---|
| Lessons | 51 guide sections (A1.1 to B6.1): Common Core (Part A) and Investment Banking (Part B). Each is a stepped lesson with quick checks, plus a full-page view. |
| Drills | 202 hand-written items (multiple choice, multi-select, ordering, sorting), covering all 51 pilot topics, and 29 numeric generators that make fresh problems every time and diagnose the kind of slip. |
| Question bank | 103 guide interview questions with model answers. Answer aloud against a timer, then grade yourself; grades schedule spaced review (1, 3, 7, 14, 30, 60 days). |
| Tracking | Topic states (Not started, Read, Drilled, Proven, Mastered), weak flags, XP, levels, streaks, daily target, error log, 8-week plan with automatic exit gates, readiness checklist, mock interview rubric, opt-in leaderboard. |
| Library | Formula sheet, 90-term glossary, 97 deep links into the club SharePoint folder (ISB login required; nothing is re-hosted), and the market dashboard with an as-of date and a re-check date on every figure. |

### How a topic moves

- **Read**: every lesson mapped to the topic is finished.
- **Drilled**: at least 3 correct answers and 60% or better on the last 5.
- **Proven**: correct answers on 2 or more days, 80% or better on the last 6, and one mapped bank question graded Good or Easy.
- **Mastered**: correct again 7 or more days after the first correct answer, the last 4 all correct, no open errors.
- **Weak** (a flag, not a state): 2 or more open errors, or under 60% on the last 5.

An error resolves when the same item is answered correctly on two different days after the miss.

### XP

Lesson step 2, lesson finished 15, correct first try 10, generated problem 12, correct on retry 4, bank card graded 3, error resolved 15, evidence task ticked 10, mock logged 25, diagnostic 30, plan gate 60. A streak day needs 20 XP. Levels: Analyst (0), Associate (600), Vice President (1,800), Director (4,000), Managing Director (7,500).

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build in dist/
SINGLE=1 npx vite build   # one self-contained index.html (figures stay in dist/figs)
```

Without Supabase keys the app saves progress in the browser. Inside a claude.ai artifact it saves to the viewer's account and shares an opt-in leaderboard.

## Deploy with Supabase (production)

1. **Create a Supabase project** (region: Mumbai, ap-south-1).
2. **Run the schema**: open SQL Editor, paste `supabase/migrations/0001_init.sql`, run it. It creates the tables, row-level security, the `join_cohort` function and the `leaderboard_public` view, and seeds a pilot cohort code `FC27-PILOT`. Change that code before you share it:
   ```sql
   update public.cohorts set code = 'FC27-XXXX' where code = 'FC27-PILOT';
   ```
3. **Turn on phone login**: Authentication, Providers, Phone. Use **Twilio Verify** as the SMS provider. Indian SMS needs DLT registration for plain Twilio or MessageBird senders; Twilio Verify handles the templates for you. Set OTP expiry to 300 seconds and rate limits to your pilot size.
4. **Set environment variables** on the host:
   - `VITE_SUPABASE_URL` = project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public key (never the service role key)
5. **Host it**
   - *Vercel*: import the repo, framework Vite, build `npm run build`, output `dist`, add the two variables.
   - *Lovable*: import from GitHub, add the two variables under project settings, publish.
   - The app uses hash routes (`#/learn/A1`), so no rewrite rules are needed.
6. **Share** the link and the invite code on the class group. Phone numbers cannot prove ISB membership, so the invite code is the gate; rotate it if it leaks (`update public.cohorts set active = false ...`).

### Why phone OTP plus an invite code

Phone login was the decision for the pilot. It cannot restrict sign-up to ISB, so a first-time user enters the cohort code once. Row-level security refuses every write from a user who is not a cohort member, and the leaderboard view shows only opted-in members of the viewer's own cohort.

### What the club can see

`public.topic_accuracy` (admin SQL only) gives attempts, accuracy and student count per topic, which shows which chapters the cohort struggles with. Individual answers and error logs are readable only by their owner.

## Keeping it current

- **Market figures** live in `src/data/facts.ts`. Each has `asOf`, `verifyBy` and a source. The UI flags any figure past its `verifyBy` date. Update after each RBI policy (next: 7 Oct 2026) and CPI print.
- **Drills** live in `src/drills/core.ts` and `src/drills/ib.ts`; generators in `src/drills/generators.ts`. Every item carries a topic ID from the tracker.
- **Lessons** are generated from the corrected guide PDF (`src/data/lessons.json`). Re-run the extractor when the guide changes.
- House style: no em dashes anywhere in content or UI copy.

## Project map

```
src/
  lib/state.ts        progress model: topic states, XP, streaks, gates, queues
  lib/backend.ts      storage: Supabase, claude.ai artifact, or browser
  lib/store.tsx       app store, saving, toasts, gate awards
  components/         Drill (all item types), Session (rounds), Blocks (guide content), Layout, ui
  pages/              Today, Learn, Lesson, Practice, Bank, Errors, Plan, Progress, Mocks, Library, Board, Profile, Start here, Onboarding, Login
  data/               lessons, units, questions, tracker, glossary, club map, plan, facts, formulas
  drills/             static drills and numeric generators
supabase/migrations/  schema and security
public/figs/          figures from the guide (WebP)
```

## Phase 2

Parts C to F (Corporate finance, PE, VC, adjacent roles) plug into the same structure: add lessons, map topics in the tracker, add drills. The engine, plan and tracking need no change. OK

