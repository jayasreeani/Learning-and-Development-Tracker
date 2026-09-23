-- Patch 2: fixes the role-resolution bug (owner/manager controls not
-- showing up) and opens Learning & Development logging to the whole team.
--
-- Safe to run on top of the database you already set up with schema.sql —
-- it only touches the things listed below, so run this instead of
-- re-running the full schema.sql (that file also re-adds tables to the
-- Realtime publication, which errors on a second run).
--
-- Run this once in Supabase's SQL Editor.

-- 1. Self-healing fallback: guarantees your account (and every future
--    signup) has a profiles row, creating one on the spot if the signup
--    trigger didn't run for it. This is what was causing "no option to
--    add/edit/delete" — your account's role wasn't resolving, so every
--    manager-only control in the app silently hid itself.
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

-- 2. Learning & Development: anyone signed in can now log a training they
--    attended or a skill they picked up (self-service), not just managers.
--    Editing or deleting an existing entry stays manager/owner-only.
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

-- 3. One-time fix for your own account specifically. The SQL Editor runs as
--    the database's admin role, not as a logged-in app user, so the
--    function above (which relies on auth.uid()) can't fix your account
--    from here — this does it directly instead. It creates your profile row
--    if it's missing, or fixes it to 'owner' if it exists with the wrong
--    role. Change the email below if you signed up with a different one.
insert into public.profiles (id, name, email, role)
select u.id, coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)), u.email, 'owner'
from auth.users u
where u.email = 'jayasreeani@gmail.com'
on conflict (id) do update set role = 'owner';
