# FinBuddy (ISB Finance Club, Co'27)

A practice-first portal built from the *Finance Placement Prep Guide* (Edition 1.1). The loop is **Read, Drill, Prove, Track**.

## What is in the pilot

| Area | Contents |
|---|---|
| Lessons | 51 guide sections (A1.1 to B6.1): Common Core (Part A) and Investment Banking (Part B). Each is a stepped lesson with quick checks, plus a full-page view. |
| Drills | 202 hand-written items (multiple choice, multi-select, ordering, sorting), covering all 51 pilot topics, and 29 numeric generators that make fresh problems every time and diagnose the kind of slip. |
| Question bank | 103 guide interview questions with model answers. Answer aloud against a timer, then grade yourself; grades schedule spaced review (1, 3, 7, 14, 30, 60 days). |
| Sign-in | Phone OTP, then a one-time link to the student's PGID on the class roster. |
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

## Sign-in: phone OTP, then PGID

1. The student enters a mobile number and gets a 6-digit SMS code.
2. On first sign-in they type their PGID. FinBuddy shows the name from the class roster ("Is this you?") and they confirm.
3. That links the phone to the PGID for good. Only linked accounts can save progress or see the leaderboard, and the leaderboard name always comes from the roster.

Guard rails: one PGID per phone and one phone per PGID; a PGID that is already linked never reveals its name; 15 lookups per hour per phone, so nobody can walk the PGID range. The roster holds PGID and name only (no emails, no sections) and is loaded from `supabase/roster_seed.sql`, which is git-ignored because it is personal data.

## Go live (about 30 minutes)

1. **Supabase project**: supabase.com, New project, region Mumbai (ap-south-1).
2. **Database**: SQL Editor, run `supabase/migrations/0001_init.sql`, then run `roster_seed.sql` (420 students). Check with `select count(*) from public.roster;`.
3. **SMS**: Authentication, Sign In / Providers, Phone: enable it and pick **Twilio Verify** (it handles India's DLT rules for you). Paste the Twilio Account SID, Auth Token and Verify Service SID. OTP expiry 300 seconds.
   - To test before Twilio is ready: in the same Phone settings add *Test phone numbers and OTPs* (for example `919876543210=123456`). Those numbers sign in with the fixed code and no SMS is sent.
4. **URL settings**: Authentication, URL Configuration: set Site URL to your Vercel address.
5. **Vercel**: Project, Settings, Environment Variables, add
   - `VITE_SUPABASE_URL` = Project URL (Supabase, Settings, API)
   - `VITE_SUPABASE_ANON_KEY` = the anon public key (never the service role key)
   then Deployments, latest, Redeploy.

Without those two variables the site runs in local mode: no sign-in, progress saved in each browser only.

### Admin (SQL editor)

```sql
-- free a PGID someone linked by mistake
update public.roster set claimed_by = null, claimed_at = null where pgid = '6261xxxx';
-- add a late joiner
insert into public.roster (pgid, name) values ('6261xxxx', 'Full Name');
-- who has linked
select pgid, name, claimed_at from public.roster where claimed_by is not null order by claimed_at desc;
-- how the cohort is doing by topic
select * from public.topic_accuracy order by accuracy;
```

## Scope of this release

Investment banking is the only live track; the other tracks show as coming soon. The Common Core (Part A) stays in because the IB track and the 8-week plan are built on it.

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

Parts C to F (Corporate finance, PE, VC, adjacent roles) plug into the same structure: add lessons, map topics in the tracker, add drills. The engine, plan and tracking need no change.
