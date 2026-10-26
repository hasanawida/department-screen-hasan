-- ─────────────────────────────────────────────────────────────
-- 012 — תוכנית נושאים שנתית, שינוי פעילות לשבוע אחד, נוכחות בפעילויות
-- להריץ פעם אחת ב-Supabase: SQL Editor ← New query ← להדביק ← Run
-- בטוח להריץ שוב (IF NOT EXISTS בכל מקום)
-- ─────────────────────────────────────────────────────────────

-- 1) פעילות קבועה: שבועות שבהם היא לא מתקיימת / הוחלפה (שינוי "רק השבוע")
alter table public.activities add column if not exists skip_dates date[] not null default '{}';
-- העתק של פעילות קבועה לשבוע אחד — מצביע על הפעילות הקבועה
alter table public.activities add column if not exists parent_id uuid references public.activities(id) on delete set null;
create index if not exists activities_parent_idx on public.activities (parent_id);

-- 2) תוכנית נושאים שנתית — נושא לכל שבוע, לכל הבית
create table if not exists public.annual_topics (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,          -- יום ראשון של השבוע
  title text not null default '',
  description text,
  image_url text,
  updated_at timestamptz not null default now()
);

-- 3) נוכחות: מי השתתף בפעילות ביום מסוים
--    ההיסטוריה נשמרת גם אם הפעילות או הדייר נמחקים (נשארים השם והכותרת)
create table if not exists public.activity_attendance (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references public.activities(id) on delete set null,
  activity_title text,
  occurrence_date date not null,
  resident_id uuid references public.residents(id) on delete set null,
  resident_name text not null,
  department_id uuid references public.departments(id) on delete set null,
  marked_by text,
  created_at timestamptz not null default now(),
  unique (activity_id, occurrence_date, resident_id)
);
create index if not exists activity_attendance_date_idx on public.activity_attendance (occurrence_date);

-- הרשאות: כמו שאר הטבלאות במערכת
alter table public.annual_topics enable row level security;
alter table public.activity_attendance enable row level security;

do $$
declare t text;
begin
  foreach t in array array['annual_topics', 'activity_attendance'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_all') then
      execute format('create policy %I on public.%I for all using (true) with check (true)', t || '_all', t);
    end if;
  end loop;
end $$;

-- עדכון מיידי של העמודים כשמסמנים נוכחות או משנים נושא
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.activity_attendance'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.annual_topics'; exception when others then null; end;
end $$;
