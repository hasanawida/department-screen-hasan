-- ─────────────────────────────────────────────────────────────
-- 010 — תפריט שבועי, פיזיותרפיה, ייבוא מיומן Outlook
-- להריץ פעם אחת ב-Supabase: SQL Editor ← New query ← להדביק ← Run
-- בטוח להריץ שוב (IF NOT EXISTS בכל מקום)
-- ─────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- 1) פעילויות: מאיפה הגיעה הפעילות (ידני / יומן) ומזהה האירוע ביומן
alter table public.activities add column if not exists source text not null default 'manual';
alter table public.activities add column if not exists external_uid text;
create index if not exists activities_external_uid_idx on public.activities (department_id, external_uid);

-- 2) יומני Outlook (קישור ICS) — לכל מחלקה, או יומן אחד משותף (department_id ריק = לפי שם המחלקה באירוע)
create table if not exists public.calendar_sources (
  id uuid primary key default gen_random_uuid(),
  label text not null default '',
  ics_url text not null,
  department_id uuid references public.departments(id) on delete cascade,
  is_active boolean not null default true,
  last_synced_at timestamptz,
  last_status text,
  last_count integer,
  created_at timestamptz not null default now()
);

-- 3) תפריט שבועי (הדיאטנית): שבוע × יום × ארוחה
create table if not exists public.weekly_menus (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,                -- יום ראשון של השבוע
  day_index smallint not null check (day_index between 0 and 6),
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner')),
  items text not null default '',          -- שורה לכל מנה
  updated_at timestamptz not null default now(),
  unique (week_start, day_index, meal)
);

-- 4) פיזיותרפיה: מי מוזמן ומתי
create table if not exists public.physio_appointments (
  id uuid primary key default gen_random_uuid(),
  appt_date date not null,
  start_time time not null,
  resident_name text not null,
  resident_id uuid references public.residents(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists physio_appointments_date_idx on public.physio_appointments (appt_date, start_time);

-- 5) קישורים אישיים לצוות (בלי סיסמה) — דיאטנית ופיזיותרפיה
create table if not exists public.staff_links (
  id uuid primary key default gen_random_uuid(),
  role text not null unique check (role in ('dietitian', 'physio')),
  token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);
insert into public.staff_links (role) values ('dietitian') on conflict (role) do nothing;
insert into public.staff_links (role) values ('physio') on conflict (role) do nothing;

-- הרשאות: כמו שאר הטבלאות במערכת (המסכים והעורכים עובדים עם המפתח הציבורי)
alter table public.calendar_sources enable row level security;
alter table public.weekly_menus enable row level security;
alter table public.physio_appointments enable row level security;
alter table public.staff_links enable row level security;

do $$
declare t text;
begin
  foreach t in array array['calendar_sources', 'weekly_menus', 'physio_appointments', 'staff_links'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_all') then
      execute format('create policy %I on public.%I for all using (true) with check (true)', t || '_all', t);
    end if;
  end loop;
end $$;

-- לרענון מיידי של המסכים כשמשהו משתנה
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.weekly_menus'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.physio_appointments'; exception when others then null; end;
end $$;
