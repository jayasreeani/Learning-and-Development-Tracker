-- Patch 4: Training Plans slot conflict tracking & Project-Based Permissions
-- (Gopika Gopan as GoGym Lead, Anuvindha Rajeev as Slavic Lead, Jayasree Kuniyil as Manager)
--
-- Run this in Supabase's SQL Editor (Database > SQL Editor > New query).

-- 1. Add created_by to training_plans to track who scheduled each training
alter table public.training_plans
add column if not exists created_by uuid references auth.users(id);

-- 2. Add project_role to members table to designate Manager, Lead, and Member
alter table public.members
add column if not exists project_role text not null default 'Member';

-- 3. Set the project leads and manager hierarchy:
-- Jayasree Kuniyil -> Overall Delivery Manager across all projects
update public.members
set project_role = 'Manager',
    projects = array['GoGym', 'Slavic']
where name ilike '%Jayasree%';

-- Gopika Gopan -> Lead for GoGym
update public.members
set project_role = 'Lead',
    projects = array['GoGym']
where name ilike '%Gopika%';

-- Anuvindha Rajeev -> Lead for Slavic
update public.members
set project_role = 'Lead',
    projects = array['Slavic']
where name ilike '%Anuvindha%';

-- Rest of the team default to Member
update public.members
set project_role = 'Member'
where name not ilike '%Jayasree%'
  and name not ilike '%Gopika%'
  and name not ilike '%Anuvindha%';

-- 4. Update training_plans RLS:
-- Anyone authenticated can read and schedule (insert) a training plan.
-- Only the creator or a manager/owner can update or delete it.
drop policy if exists "plans read" on public.training_plans;
create policy "plans read" on public.training_plans for select
  using (auth.role() = 'authenticated');

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

-- 5. Expand profiles role check to support 'lead' role if needed
alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('owner', 'manager', 'lead', 'member'));
