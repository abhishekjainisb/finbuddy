# FinBuddy (ISB Finance Club, Co'27)

A practice-first portal built from the *Finance Placement Prep Guide* (Edition 1.1). The loop is **Read, Drill, Prove, Track**.

## What is in the pilot

| Area | Contents |
|---|---|
| Lessons | 111 guide sections across Parts A to F. Each is a stepped lesson with quick checks, plus a full-page view. |
| Drills | 346 hand-written items (multiple choice, multi-select, ordering, sorting) covering all 112 topics, and 47 numeric generators that make fresh problems every time and diagnose the kind of slip. |
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

## Sign-in: Microsoft, Google or an email code, then PGID

1. The student signs in with **Microsoft (ISB account)**, **Google**, or a **6-digit code by email**. All three are free.
2. If the verified email is on the class roster (the ISB address), the PGID links automatically.
3. Otherwise (Google, a personal email) the student types their PGID once and confirms the name.

Guard rails: one PGID per account; a PGID linked by hand is taken back automatically when its owner signs in with their ISB account; 15 PGID lookups per hour per account; roster emails stay on the server and are never sent to the browser. `roster_seed.sql` and `roster_emails.sql` are git-ignored because they are personal data.

## Go live

Run in the Supabase SQL editor, in order: `migrations/0001_init.sql`, `roster_seed.sql`, `migrations/0002_sso_email.sql`, `roster_emails.sql`. Migration 0002 also deletes any old phone sign-in account, which frees its PGID.

**Email codes (free, no Twilio)**
- Authentication, Sign In / Providers: turn **Phone** off; **Email** on.
- Authentication, Emails, **SMTP Settings**: use a club Gmail account with an app password (Google account, Security, 2-Step Verification on, App passwords). Host `smtp.gmail.com`, port `465`, username and sender = the Gmail address, password = the 16-character app password, sender name `FinBuddy`. Gmail allows about 500 emails a day, enough for 200 students because sessions last.
- Authentication, Emails, Templates: paste `supabase/email/code_email.html` into both **Magic link or OTP** and **Confirm sign up**, subject `FinBuddy sign-in code: {{ .Token }}`.
- Authentication, Sign In / Providers, Email: set OTP expiry to 600 seconds.
- Authentication, Rate Limits: raise emails per hour to about 200 for launch day.

**Microsoft (ISB accounts only)**
- portal.azure.com, Microsoft Entra ID, App registrations, New registration: name FinBuddy, "Accounts in any organizational directory", redirect URI (Web) `https://<project>.supabase.co/auth/v1/callback`.
- Certificates & secrets: new client secret, copy the Value. Token configuration: add optional claim `email` to the ID token.
- Supabase, Providers, **Azure**: Application (client) ID, secret, and Azure Tenant URL `https://login.microsoftonline.com/a4dae443-38ab-404a-b331-9d1d337fcf37` (ISB's tenant, so only ISB accounts can sign in).
- If ISB IT blocks consent for new apps, students see "Need admin approval"; the app tells them to use the email code with their ISB address, which links the PGID the same way.

**Google**
- console.cloud.google.com: new project, OAuth consent screen (External, app name FinBuddy), then **Publish app**. Credentials, OAuth client ID, Web application, redirect URI `https://<project>.supabase.co/auth/v1/callback`.
- Supabase, Providers, **Google**: client ID and secret.

**URLs**: Authentication, URL Configuration: Site URL = your Vercel address; Redirect URLs add `https://<your-vercel-address>/**`.

**Vercel**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (publishable key), then redeploy.

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

## Tracks

All seven tracks are live: Investment banking, Corporate finance, Private equity, Venture capital, Consulting or deal advisory, Equity research or markets, and Corporate banking and credit. Each student picks one primary track and, optionally, one adjacent track. Their practice, focus topics, mastery map, readiness checklist and weekly plan gates follow the common core plus those tracks (`src/data/tracks.ts`).

Content: 111 guide sections across Parts A to F, 346 hand-written drills covering all 112 topics, and 47 numeric generators.

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

