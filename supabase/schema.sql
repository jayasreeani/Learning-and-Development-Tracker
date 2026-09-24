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
  role text not null default 'member' check (role in ('owner', 'manager', 'lead', 'member')),
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

-- Self-healing fallback: guarantees the signed-in user has a profiles row,
-- creating one on the spot if the trigger above didn't run for them (for
-- example, an account created before this trigger existed, or a signup that
-- raced the trigger). The app calls this once per session on load instead of
-- trusting the trigger alone. Same first-signup-becomes-owner rule applies.
create or replace function public.ensure_current_profile()
returns public.profiles
language plpgsql
security definer set search_path = public
as $$
declare
  result public.profiles;
  is_first boolean;
begin
  select * into result from public.profiles where id = auth.uid();
  if result.id is not null then
    return result;
  end if;

  select not exists (select 1 from public.profiles) into is_first;

  insert into public.profiles (id, name, email, role)
  select
    auth.uid(),
    coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
    coalesce(u.email, ''),
    case when is_first then 'owner' else 'member' end
  from auth.users u
  where u.id = auth.uid()
  returning * into result;

  return result;
end;
$$;

grant execute on function public.ensure_current_profile() to authenticated;

-- ============================================================================
-- 2. DATA TABLES
-- ============================================================================

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null default '',
  designation text not null default '',
  role_type text not null default '',
  project_role text not null default 'Member',
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
  created_by uuid references auth.users(id),
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

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  member_name text not null,
  email text,
  token text not null unique,
  project text,
  project_role text not null default 'Member',
  created_by uuid references auth.users(id),
  used_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
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

-- members: read and write for anyone signed in (self-service roster management)
drop policy if exists "members read" on public.members;
create policy "members read" on public.members for select using (auth.role() = 'authenticated');
drop policy if exists "members write" on public.members;
create policy "members write" on public.members for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- trainings / skill_events: read for anyone signed in; ANYONE signed in can
-- log a training they attended or a skill they picked up (self-service
-- learning log — matches how the team actually uses this page); editing or
-- removing an existing entry stays manager/owner-only.
drop policy if exists "trainings read" on public.trainings;
create policy "trainings read" on public.trainings for select using (auth.role() = 'authenticated');
drop policy if exists "trainings write" on public.trainings;
drop policy if exists "trainings insert" on public.trainings;
create policy "trainings insert" on public.trainings for insert
  with check (auth.role() = 'authenticated');
drop policy if exists "trainings manage" on public.trainings;
create policy "trainings manage" on public.trainings for update
  using (public.can_manage()) with check (public.can_manage());
drop policy if exists "trainings delete" on public.trainings;
create policy "trainings delete" on public.trainings for delete
  using (public.can_manage());

drop policy if exists "plans read" on public.training_plans;
create policy "plans read" on public.training_plans for select using (auth.role() = 'authenticated');
drop policy if exists "plans write" on public.training_plans;
drop policy if exists "plans insert" on public.training_plans;
create policy "plans insert" on public.training_plans for insert
  with check (auth.role() = 'authenticated');
drop policy if exists "plans manage" on public.training_plans;
drop policy if exists "plans update" on public.training_plans;
create policy "plans update" on public.training_plans for update
  using (public.can_manage() or auth.uid() = created_by)
  with check (public.can_manage() or auth.uid() = created_by);
drop policy if exists "plans delete" on public.training_plans;
create policy "plans delete" on public.training_plans for delete
  using (public.can_manage() or auth.uid() = created_by);

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

-- skill_events: same self-service model as trainings above.
drop policy if exists "skill events read" on public.skill_events;
create policy "skill events read" on public.skill_events for select using (auth.role() = 'authenticated');
drop policy if exists "skill events write" on public.skill_events;
drop policy if exists "skill events insert" on public.skill_events;
create policy "skill events insert" on public.skill_events for insert
  with check (auth.role() = 'authenticated');
drop policy if exists "skill events manage" on public.skill_events;
create policy "skill events manage" on public.skill_events for update
  using (public.can_manage()) with check (public.can_manage());
drop policy if exists "skill events delete" on public.skill_events;
create policy "skill events delete" on public.skill_events for delete
  using (public.can_manage());

-- invites: authenticated users can inspect, create, and manage invites
alter table public.invites enable row level security;
drop policy if exists "invites select authenticated" on public.invites;
create policy "invites select authenticated" on public.invites for select
  using (auth.role() = 'authenticated');
drop policy if exists "invites insert authenticated" on public.invites;
create policy "invites insert authenticated" on public.invites for insert
  with check (auth.role() = 'authenticated');
drop policy if exists "invites update authenticated" on public.invites;
create policy "invites update authenticated" on public.invites for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "invites delete authenticated" on public.invites;
create policy "invites delete authenticated" on public.invites for delete
  using (auth.role() = 'authenticated');

-- ============================================================================
-- 5. INVITATION RPC FUNCTIONS
-- ============================================================================

create or replace function public.get_invite_by_token(p_token text)
returns table (
  id uuid,
  member_id uuid,
  member_name text,
  email text,
  token text,
  project text,
  project_role text,
  used_at timestamptz,
  expires_at timestamptz,
  is_valid boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    i.id,
    i.member_id,
    i.member_name,
    i.email,
    i.token,
    i.project,
    i.project_role,
    i.used_at,
    i.expires_at,
    (i.used_at is null and i.expires_at > now()) as is_valid
  from public.invites i
  where i.token = p_token
  limit 1;
end;
$$;

grant execute on function public.get_invite_by_token(text) to anon, authenticated;

create or replace function public.complete_invite_signup(
  p_token text,
  p_user_id uuid,
  p_email text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invites%rowtype;
  v_app_role text;
begin
  select * into v_invite
  from public.invites
  where token = p_token;

  if not found then
    return json_build_object('success', false, 'error', 'Invite token not found.');
  end if;

  if v_invite.used_at is not null then
    return json_build_object('success', false, 'error', 'This invite link has already been used.');
  end if;

  if v_invite.expires_at <= now() then
    return json_build_object('success', false, 'error', 'This invite link has expired. Please contact your manager.');
  end if;

  if v_invite.project_role = 'Manager' then
    v_app_role := 'manager';
  elsif v_invite.project_role = 'Lead' then
    v_app_role := 'lead';
  else
    v_app_role := 'member';
  end if;

  update public.members
  set user_id = p_user_id,
      email = coalesce(nullif(p_email, ''), email),
      updated_at = now()
  where id = v_invite.member_id;

  update public.invites
  set used_at = now()
  where id = v_invite.id;

  insert into public.profiles (id, name, email, role, created_at)
  values (p_user_id, v_invite.member_name, p_email, v_app_role, now())
  on conflict (id) do update
  set name = excluded.name,
      email = excluded.email,
      role = excluded.role;

  return json_build_object(
    'success', true,
    'member_name', v_invite.member_name,
    'project', v_invite.project,
    'project_role', v_invite.project_role,
    'role', v_app_role
  );
end;
$$;

grant execute on function public.complete_invite_signup(text, uuid, text) to anon, authenticated;

-- ============================================================================
-- 6. REALTIME
--    Turn on realtime replication so the app gets live updates, matching the
--    original artifact's live-sync behavior.
-- ============================================================================

alter publication supabase_realtime add table public.members;
alter publication supabase_realtime add table public.trainings;
alter publication supabase_realtime add table public.training_plans;
alter publication supabase_realtime add table public.training_requests;
alter publication supabase_realtime add table public.skill_events;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.invites;
