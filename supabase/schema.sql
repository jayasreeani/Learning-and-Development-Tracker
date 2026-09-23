-- Learning & Development Tracker — Supabase schema
-- Run this once in your Supabase project's SQL Editor (Database > SQL Editor > New query).
-- Safe to re-run: it drops and recreates policies, but will NOT drop your data tables if they
-- already exist with data (the CREATE TABLE IF NOT EXISTS guards below protect that).

-- ============================================================================
-- 1. PROFILES — one row per signed-up user, tracks their role in the app.
--    The FIRST person to sign up automatically becomes "owner". Everyone
--    after that defaults to "member" until an owner/manager promotes them
--    from the in-app Permissions page.
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  role text not null default 'member' check (role in ('owner', 'manager', 'member')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  is_first boolean;
begin
  select not exists (select 1 from public.profiles) into is_first;
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    case when is_first then 'owner' else 'member' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 2. DATA TABLES
-- ============================================================================

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  designation text not null default '',
  role_type text not null default '',
  projects text[] not null default '{}',
  experience_level text not null default '',
  allocation_pct numeric,
  reporting_manager text not null default '',
  joining_date date,
  prior_experience_years numeric,
  employment_type text not null default '',
  skills text[] not null default '{}',
  certifications text not null default '',
  performance_rating text not null default '',
  career_note text not null default '',
  email text not null default '',
  phone text not null default '',
  location text not null default '',
  timezone text not null default '',
  availability_status text not null default '',
  attendance_rating text not null default '',
  attendance_note text not null default '',
  attitude_note text not null default '',
  notes jsonb not null default '[]',
  is_example boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trainings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete cascade,
  member_name text not null default '',
  title text not null default '',
  type text not null default '',
  platform text not null default '',
  date_completed date,
  notes text not null default '',
  is_example boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete cascade,
  member_name text not null default '',
  topic text not null default '',
  purpose text not null default '',
  schedule timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.training_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete cascade,
  member_name text not null default '',
  topic text not null default '',
  reason text not null default '',
  status text not null default 'Pending' check (status in ('Pending', 'Scheduled', 'Completed')),
  requested_by uuid references auth.users(id),
  is_example boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.skill_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete cascade,
  member_name text not null default '',
  skill text not null default '',
  event_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 3. ROLE HELPER
-- ============================================================================

create or replace function public.current_role()
returns text
language sql
security definer set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.can_manage()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) in ('owner', 'manager'), false);
$$;

-- ============================================================================
-- 4. ROW LEVEL SECURITY
--    Real enforcement this time: a "member" role is blocked from writing to
--    the roster/learning/plans tables at the DATABASE level, not just hidden
--    in the UI. Every signed-in user can read everything.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.trainings enable row level security;
alter table public.training_plans enable row level security;
alter table public.training_requests enable row level security;
alter table public.skill_events enable row level security;

-- profiles: everyone signed in can read all profiles (for name lookups on the
-- Permissions page); you can update your own name; only an owner can change
-- someone else's role.
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "profiles update own name" on public.profiles;
create policy "profiles update own name" on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists "profiles owner manages roles" on public.profiles;
create policy "profiles owner manages roles" on public.profiles for update
  using ((select role from public.profiles where id = auth.uid()) = 'owner');

-- members / trainings / training_plans: read for anyone signed in, write only
-- for manager/owner.
drop policy if exists "members read" on public.members;
create policy "members read" on public.members for select using (auth.role() = 'authenticated');
drop policy if exists "members write" on public.members;
create policy "members write" on public.members for all
  using (public.can_manage()) with check (public.can_manage());

drop policy if exists "trainings read" on public.trainings;
create policy "trainings read" on public.trainings for select using (auth.role() = 'authenticated');
drop policy if exists "trainings write" on public.trainings;
create policy "trainings write" on public.trainings for all
  using (public.can_manage()) with check (public.can_manage());

drop policy if exists "plans read" on public.training_plans;
create policy "plans read" on public.training_plans for select using (auth.role() = 'authenticated');
drop policy if exists "plans write" on public.training_plans;
create policy "plans write" on public.training_plans for all
  using (public.can_manage()) with check (public.can_manage());

-- training_requests: read for anyone signed in; ANYONE signed in can INSERT
-- (raise a request, always starting Pending); only manager/owner can UPDATE
-- (change status / edit) or DELETE.
drop policy if exists "requests read" on public.training_requests;
create policy "requests read" on public.training_requests for select using (auth.role() = 'authenticated');
drop policy if exists "requests insert" on public.training_requests;
create policy "requests insert" on public.training_requests for insert
  with check (auth.role() = 'authenticated' and status = 'Pending');
drop policy if exists "requests manage" on public.training_requests;
create policy "requests manage" on public.training_requests for update
  using (public.can_manage()) with check (public.can_manage());
drop policy if exists "requests delete" on public.training_requests;
create policy "requests delete" on public.training_requests for delete
  using (public.can_manage());

-- skill_events: read for anyone signed in, write only manager/owner (skills
-- are edited from the roster/learning views, which are manager-only anyway).
drop policy if exists "skill events read" on public.skill_events;
create policy "skill events read" on public.skill_events for select using (auth.role() = 'authenticated');
drop policy if exists "skill events write" on public.skill_events;
create policy "skill events write" on public.skill_events for all
  using (public.can_manage()) with check (public.can_manage());

-- ============================================================================
-- 5. REALTIME
--    Turn on realtime replication so the app gets live updates, matching the
--    original artifact's live-sync behavior.
-- ============================================================================

alter publication supabase_realtime add table public.members;
alter publication supabase_realtime add table public.trainings;
alter publication supabase_realtime add table public.training_plans;
alter publication supabase_realtime add table public.training_requests;
alter publication supabase_realtime add table public.skill_events;
alter publication supabase_realtime add table public.profiles;
