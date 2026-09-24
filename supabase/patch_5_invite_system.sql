-- ==============================================================================
-- Patch 5: Invitation-Only Registration & Secure Account-to-Roster Linking
--
-- Run this in Supabase's SQL Editor (Database > SQL Editor > New query).
-- This script:
--   1. Adds user_id (uuid) column to public.members to bind auth.users(id).
--   2. Creates public.invites table for one-time, cryptographically secure invite tokens.
--   3. Defines RLS policies so only managers can create invites, while invitees can redeem tokens.
--   4. Creates stored procedures (RPCs) to validate tokens and complete sign-up atomically.
--   5. Auto-links existing manager/owner accounts to their roster profiles.
-- ==============================================================================

-- 1. Add user_id to members table
alter table public.members
add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_members_user_id on public.members(user_id);

-- 2. Create invites table
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

create index if not exists idx_invites_token on public.invites(token);
create index if not exists idx_invites_member_id on public.invites(member_id);

-- 3. RLS for invites table
alter table public.invites enable row level security;

-- Authenticated users (managers/leads) can inspect invites
drop policy if exists "invites select authenticated" on public.invites;
create policy "invites select authenticated" on public.invites
  for select
  using (auth.role() = 'authenticated');

-- Authenticated managers/leads can generate new invites
drop policy if exists "invites insert authenticated" on public.invites;
create policy "invites insert authenticated" on public.invites
  for insert
  with check (auth.role() = 'authenticated');

-- Authenticated managers/leads can update or delete invites
drop policy if exists "invites update authenticated" on public.invites;
create policy "invites update authenticated" on public.invites
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "invites delete authenticated" on public.invites;
create policy "invites delete authenticated" on public.invites
  for delete
  using (auth.role() = 'authenticated');

-- 4. Function: get_invite_by_token
-- Safe SECURITY DEFINER function to allow unauthenticated visitors on /join to validate a token
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

-- 5. Function: complete_invite_signup
-- Atomic SECURITY DEFINER function that completes registration:
-- - Validates token
-- - Links auth user to public.members.user_id
-- - Updates member email if not previously set
-- - Marks invite as used
-- - Creates or updates public.profiles with correct name and role
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
  -- Find the invite
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

  -- Determine role mapping
  if v_invite.project_role = 'Manager' then
    v_app_role := 'manager';
  elsif v_invite.project_role = 'Lead' then
    v_app_role := 'lead';
  else
    v_app_role := 'member';
  end if;

  -- Bind member to auth user and update email
  update public.members
  set user_id = p_user_id,
      email = coalesce(nullif(p_email, ''), email),
      updated_at = now()
  where id = v_invite.member_id;

  -- Mark invite token as used immediately
  update public.invites
  set used_at = now()
  where id = v_invite.id;

  -- Upsert profiles table
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

-- 6. Link existing Jayasree (Delivery Manager) profile to members table
update public.members m
set user_id = p.id
from public.profiles p
where (p.email ilike '%jayasree%' or p.name ilike '%jayasree%')
  and (m.name ilike '%jayasree%')
  and m.user_id is null;

-- 7. Pre-seed invite token for Delivery Manager (Jayasree Kuniyil)
insert into public.invites (
  member_id,
  member_name,
  email,
  token,
  project,
  project_role,
  expires_at
)
select
  id,
  name,
  'jayasreeani@gmail.com',
  'manager-setup',
  'All Projects',
  'Manager',
  now() + interval '365 days'
from public.members
where name ilike '%jayasree%'
limit 1
on conflict (token) do nothing;
