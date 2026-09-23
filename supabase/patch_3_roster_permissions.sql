-- Patch 3: allow any authenticated user to add, edit, and delete roster members,
-- and guarantee owner role assignment for the admin account.
--
-- Safe to run in Supabase's SQL Editor (Database > SQL Editor > New query).

-- 1. Open up roster management (add/edit/delete) to all authenticated team members:
drop policy if exists "members write" on public.members;
create policy "members write" on public.members for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- 2. Ensure owner account role is set to 'owner'
insert into public.profiles (id, name, email, role)
select u.id, coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)), u.email, 'owner'
from auth.users u
where u.email = 'jayasreeani@gmail.com'
on conflict (id) do update set role = 'owner';
