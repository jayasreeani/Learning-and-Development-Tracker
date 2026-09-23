# Learning & Development Tracker

A team roster, training plan, training request and growth-report app, built
with Next.js 16 and Supabase (Postgres + Auth + Realtime + Row Level
Security), deployed on Vercel.

This replaces the earlier Claude Artifact version of this app. The main
reason to move here: teammates without a Claude account can now get a real
account with real edit access, via email + password sign-in — access is
enforced by the database itself (Row Level Security), not just hidden in the
UI.

## How roles work

- The **first person to sign up becomes the owner** automatically.
- Everyone who signs up after that starts as a **Team member**.
- The owner promotes people to **Manager** from the in-app **Permissions**
  page (owner-only).
- Owners and managers can add/edit/delete roster entries, trainings, training
  plans, and can change a request's status.
- Team members can view everything and can raise a training request (it
  always starts as **Pending**); only a manager can move it to **Scheduled**
  or **Completed**.
- These rules are enforced by Postgres Row Level Security policies
  (`supabase/schema.sql`), so they hold even if someone calls the database
  directly — not just when they click through this app's UI.

## 1. Set up Supabase (free tier is plenty)

1. Go to [supabase.com](https://supabase.com) and sign in (GitHub sign-in is
   fastest), then **New project**. Pick any name/region and a database
   password (you won't need the password day-to-day — Supabase manages it).
2. Wait for the project to finish provisioning (~2 minutes).
3. Open **SQL Editor** in the left sidebar → **New query**, paste in the
   entire contents of [`supabase/schema.sql`](./supabase/schema.sql) from
   this repo, and click **Run**. This creates all the tables, the
   first-signup-becomes-owner trigger, and the Row Level Security policies.
4. **Turn off "Confirm email"** so people can sign in immediately after
   signing up (optional, but recommended for an internal team tool):
   **Authentication → Providers → Email** → toggle **Confirm email** off.
   (If you leave it on, new users get a confirmation email before they can
   sign in — also fine, just an extra step.)
5. Open **Project Settings → API**. You'll need two values from this page in
   the next step:
   - **Project URL**
   - **anon public** key (NOT the `service_role` key — never expose that one
     to the browser)

## 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in the two values from
step 1.5:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

## 3. Run it locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account (the
first account becomes the owner), and add your team.

## 4. Deploy to Vercel

1. Push this project to a GitHub repository.
2. In [Vercel](https://vercel.com), **Add New… → Project**, import that
   repository.
3. When prompted for environment variables, add the same two from step 2
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — set them
   for Production, Preview and Development.
4. Deploy. Vercel will give you a `*.vercel.app` URL (you can attach a custom
   domain later under Project Settings → Domains).
5. Share that URL with your team — anyone who signs up gets a real account
   with real (database-enforced) access, no Claude license required.

## Project structure

```
supabase/schema.sql        Database schema, trigger, and RLS policies — run once in Supabase's SQL editor
src/lib/supabase/          Browser + server Supabase clients, and the session-refresh helper used by proxy.ts
src/proxy.ts               Next.js 16's route protection file (the renamed "middleware") — redirects signed-out visitors to /login
src/lib/hooks/             useTable() (live-synced table reads) and ViewerProvider (current user + role)
src/lib/reports.ts         Period-bucketing helpers for the Reports page
src/app/login/             Email + password sign in / sign up
src/app/(app)/roster/      Team roster (CRUD)
src/app/(app)/learning/    Trainings attended + skills upgraded (CRUD)
src/app/(app)/plans/       Scheduled training plans (CRUD)
src/app/(app)/requests/    Training requests — Pending → Scheduled → Completed
src/app/(app)/reports/     Per-member growth report, chart + table view, Excel export
src/app/(app)/permissions/ Owner-only role management
```

## Notes

- **xlsx (SheetJS)** is used client-side to build the Excel export on the
  Reports page. `npm audit` flags it for two known advisories with no fix
  currently available (prototype pollution / ReDoS). Both only matter when
  *parsing* untrusted spreadsheet files — this app only *writes* `.xlsx`
  files it generates itself, so the risk here is low. Worth re-checking
  `npm audit` occasionally in case a patched version ships.
- **Realtime**: the schema enables Postgres replication for every table, so
  changes made by one signed-in teammate show up live for everyone else
  without a page refresh (`src/lib/hooks/useTable.ts`).
- This is Next.js **16**, which renamed `middleware.ts` to `proxy.ts` — see
  `src/proxy.ts`.
