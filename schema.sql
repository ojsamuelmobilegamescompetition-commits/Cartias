-- World-class school website: Supabase database foundation
-- Run this in Supabase SQL Editor on a NEW project.
-- Review policies with your school's data-protection lead before production.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'student' check (role in ('super_admin','school_owner','principal','vice_principal','admission_officer','accountant','teacher','librarian','hr_manager','receptionist','student','parent')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.site_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'General',
  body text not null,
  published boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.school_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  location text default '',
  starts_at timestamptz not null,
  published boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.admissions (
  id uuid primary key default gen_random_uuid(),
  applicant_name text not null,
  date_of_birth date,
  applying_for text not null,
  guardian_name text not null,
  email text not null,
  phone text not null,
  message text default '',
  status text not null default 'pending' check (status in ('pending','under_review','approved','rejected','more_information')),
  created_at timestamptz not null default now()
);
create table if not exists public.school_classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  academic_session text,
  class_teacher uuid references public.profiles(id),
  capacity integer,
  created_at timestamptz not null default now()
);
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id),
  admission_number text unique not null,
  full_name text not null,
  date_of_birth date,
  class_id uuid references public.school_classes(id),
  guardian_profile_id uuid references public.profiles(id),
  status text not null default 'active',
  created_at timestamptz not null default now()
);
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class_id uuid references public.school_classes(id),
  teacher_profile_id uuid references public.profiles(id)
);
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  attendance_date date not null,
  status text not null check(status in ('present','absent','late','excused')),
  recorded_by uuid references public.profiles(id),
  unique(student_id,attendance_date)
);
create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  subject_id uuid not null references public.subjects(id),
  academic_session text not null,
  term text not null,
  continuous_assessment numeric(6,2),
  examination_score numeric(6,2),
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.fee_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id),
  amount numeric(12,2) not null check(amount >= 0),
  currency text not null default 'NGN',
  payment_reference text unique,
  status text not null default 'pending' check(status in ('pending','verified','rejected')),
  provider text,
  verified_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  table_name text,
  record_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.has_school_role(allowed_roles text[])
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.active = true and p.role = any(allowed_roles));
$$;
revoke all on function public.has_school_role(text[]) from public;
grant execute on function public.has_school_role(text[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.announcements enable row level security;
alter table public.school_events enable row level security;
alter table public.admissions enable row level security;
alter table public.school_classes enable row level security;
alter table public.students enable row level security;
alter table public.subjects enable row level security;
alter table public.attendance enable row level security;
alter table public.results enable row level security;
alter table public.fee_payments enable row level security;
alter table public.audit_logs enable row level security;

-- Profile: users can read their own profile; authorised leadership can manage profiles.
create policy "profile read self or leadership" on public.profiles for select to authenticated
using (id = auth.uid() or public.has_school_role(array['super_admin','school_owner','principal']));
create policy "leadership manage profiles" on public.profiles for all to authenticated
using (public.has_school_role(array['super_admin','school_owner']))
with check (public.has_school_role(array['super_admin','school_owner']));

-- Publicly readable published content; only leadership can manage.
create policy "public read site settings" on public.site_settings for select to anon, authenticated using (true);
create policy "leadership manage site settings" on public.site_settings for all to authenticated
using (public.has_school_role(array['super_admin','school_owner','principal']))
with check (public.has_school_role(array['super_admin','school_owner','principal']));
create policy "public read published announcements" on public.announcements for select to anon, authenticated using (published = true or public.has_school_role(array['super_admin','school_owner','principal','vice_principal','admission_officer']));
create policy "leadership manage announcements" on public.announcements for all to authenticated
using (public.has_school_role(array['super_admin','school_owner','principal','vice_principal']))
with check (public.has_school_role(array['super_admin','school_owner','principal','vice_principal']));
create policy "public read published events" on public.school_events for select to anon, authenticated using (published = true or public.has_school_role(array['super_admin','school_owner','principal','vice_principal']));
create policy "leadership manage events" on public.school_events for all to authenticated
using (public.has_school_role(array['super_admin','school_owner','principal','vice_principal']))
with check (public.has_school_role(array['super_admin','school_owner','principal','vice_principal']));

-- Admissions can be submitted publicly. Only authorised admissions staff can view/decide.
create policy "public submit admissions" on public.admissions for insert to anon, authenticated
with check (
  status = 'pending'
  and exists (
    select 1 from public.site_settings
    where key = 'admissions_open' and value = 'true'
  )
);
create policy "admissions staff read" on public.admissions for select to authenticated
using (public.has_school_role(array['super_admin','school_owner','principal','vice_principal','admission_officer']));
create policy "admissions staff update" on public.admissions for update to authenticated
using (public.has_school_role(array['super_admin','school_owner','principal','vice_principal','admission_officer']))
with check (public.has_school_role(array['super_admin','school_owner','principal','vice_principal','admission_officer']));
create policy "leadership delete admissions" on public.admissions for delete to authenticated
using (public.has_school_role(array['super_admin','school_owner']));

-- Private academic/financial tables: leadership and relevant staff roles only in this starter foundation.
create policy "school staff read classes" on public.school_classes for select to authenticated using (public.has_school_role(array['super_admin','school_owner','principal','vice_principal','teacher','admission_officer']));
create policy "leadership manage classes" on public.school_classes for all to authenticated using (public.has_school_role(array['super_admin','school_owner','principal'])) with check (public.has_school_role(array['super_admin','school_owner','principal']));
create policy "school staff manage students" on public.students for all to authenticated using (public.has_school_role(array['super_admin','school_owner','principal','vice_principal','admission_officer'])) with check (public.has_school_role(array['super_admin','school_owner','principal','vice_principal','admission_officer']));
create policy "school staff manage subjects" on public.subjects for all to authenticated using (public.has_school_role(array['super_admin','school_owner','principal','vice_principal','teacher'])) with check (public.has_school_role(array['super_admin','school_owner','principal','vice_principal','teacher']));
create policy "school staff manage attendance" on public.attendance for all to authenticated using (public.has_school_role(array['super_admin','school_owner','principal','vice_principal','teacher'])) with check (public.has_school_role(array['super_admin','school_owner','principal','vice_principal','teacher']));
create policy "school staff manage results" on public.results for all to authenticated using (public.has_school_role(array['super_admin','school_owner','principal','vice_principal','teacher'])) with check (public.has_school_role(array['super_admin','school_owner','principal','vice_principal','teacher']));
create policy "finance staff manage payments" on public.fee_payments for all to authenticated using (public.has_school_role(array['super_admin','school_owner','principal','accountant'])) with check (public.has_school_role(array['super_admin','school_owner','principal','accountant']));
create policy "leadership read audit logs" on public.audit_logs for select to authenticated using (public.has_school_role(array['super_admin','school_owner','principal']));
create policy "leadership insert audit logs" on public.audit_logs for insert to authenticated with check (public.has_school_role(array['super_admin','school_owner','principal']));

-- Initial public website content. Edit from admin after setup.
insert into public.site_settings(key,value) values
('school_name','Your School Name'),('tagline','Learn · Lead · Excel'),
('hero_title','Inspiring excellence. Building tomorrow.'),
('hero_text','A supportive learning community where every learner is challenged, encouraged and prepared to make a difference.'),
('welcome_text','We combine strong academic foundations with creativity, character, wellbeing and the confidence to contribute to the world.'),
('phone',''),('email',''),('address',''),('admissions_open','true')
on conflict(key) do nothing;

-- IMPORTANT: create auth users in Supabase Authentication, then create their profile rows
-- from the SQL editor as the project owner. Never allow public signup to choose a privileged role.
-- Example (replace UUID with the user's auth.users id):
-- insert into public.profiles(id,full_name,role) values ('AUTH-USER-UUID','School Owner','school_owner');

-- Explicit browser roles for the public enquiry form and public website reads.
grant select on public.site_settings, public.announcements, public.school_events to anon, authenticated;
grant insert on public.admissions to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
