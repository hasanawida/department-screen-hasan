-- תמונת מצב של מבנה מסד הנתונים בייצור — נובמבר 2026
--
-- נבנה מתוך המסד החי (טבלאות, אילוצים, אינדקסים, מדיניות RLS, פונקציות וטריגרים) ומשמש כתיעוד
-- ולהקמת סביבת בדיקות מקומית. ⚠ לא להריץ על המסד החי.
-- הקבצים 001/002 בתיקייה הזו הם מהגרסה הראשונה של המערכת ולא משקפים את המבנה היום;
-- 010–015 הם העדכונים שהורצו מאז, ו-016/017 מחכים להרצה (ראו ההערות בראש כל קובץ).
-- הערה: בסביבה מקומית בלי Supabase צריך קודם ליצור את התפקידים anon / authenticated / service_role
-- ואת הפונקציה auth.role().

-- ───── tables ─────
create table if not exists public.activities (
  id uuid not null default gen_random_uuid(),
  department_id uuid not null,
  title text not null,
  description text,
  start_time text not null,
  end_time text,
  location text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  activity_date date,
  instructor_name text,
  participants text,
  image_url text,
  category text,
  day_of_week text,
  is_recurring boolean default false,
  source text not null default 'manual'::text,
  external_uid text,
  skip_dates date[] not null default '{}'::date[],
  parent_id uuid
);

create table if not exists public.activity_attendance (
  id uuid not null default gen_random_uuid(),
  activity_id uuid,
  activity_title text,
  occurrence_date date not null,
  resident_id uuid,
  resident_name text not null,
  department_id uuid,
  marked_by text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.activity_participants (
  id uuid not null default gen_random_uuid(),
  activity_id uuid,
  resident_id uuid,
  created_at timestamp with time zone default now(),
  personal_activity_notes text
);

create table if not exists public.admins (
  email text not null,
  created_at timestamp with time zone default now(),
  created_by text
);

create table if not exists public.announcements (
  id uuid not null default gen_random_uuid(),
  department_id uuid not null,
  title text not null,
  content text not null,
  priority text default 'normal'::text,
  is_active boolean default true,
  start_date date default CURRENT_DATE,
  end_date date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  text text
);

create table if not exists public.annual_topics (
  id uuid not null default gen_random_uuid(),
  week_start date not null,
  title text not null default ''::text,
  description text,
  image_url text,
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.calendar_sources (
  id uuid not null default gen_random_uuid(),
  label text not null default ''::text,
  ics_url text not null,
  department_id uuid,
  is_active boolean not null default true,
  last_synced_at timestamp with time zone,
  last_status text,
  last_count integer,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.department_media (
  id uuid not null default gen_random_uuid(),
  department_id uuid,
  media_url text not null,
  media_type text,
  display_order integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists public.departments (
  id uuid not null default gen_random_uuid(),
  name text not null,
  code text not null,
  color text not null default '#3B82F6'::text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  view_token text,
  name_ar text,
  name_ru text,
  name_en text,
  orientation_settings jsonb default '{"languages": ["he", "ar", "ru", "en"], "show_menu": true, "show_staff": true, "show_anchors": true, "show_calming": true, "show_weather": true, "show_hebrew_date": true, "show_announcement": true, "lang_interval_seconds": 20}'::jsonb,
  emergency_message text,
  emergency_active boolean default false,
  force_refresh boolean default false,
  emergency_orientation boolean default false,
  emergency_display boolean default false,
  orientation_color text,
  emergency_bg_color text,
  emergency_text_color text,
  emergency_translations jsonb,
  emergency_languages text[],
  emergency_speak boolean default false
);

create table if not exists public.instructors (
  id uuid not null default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  view_token text
);

create table if not exists public.physio_appointments (
  id uuid not null default gen_random_uuid(),
  appt_date date not null,
  start_time time without time zone not null,
  resident_name text not null,
  resident_id uuid,
  department_id uuid,
  note text,
  created_at timestamp with time zone not null default now(),
  end_time time without time zone,
  attended boolean
);

create table if not exists public.residents (
  id uuid not null default gen_random_uuid(),
  name text not null,
  department_id uuid,
  room_number text,
  phone text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  personal_activity text,
  group_activity text,
  leisure_activity text
);

create table if not exists public.screen_devices (
  id text not null,
  device_id text not null,
  kind text not null,
  department_id uuid,
  label text,
  path text,
  info jsonb not null default '{}'::jsonb,
  session_id text,
  first_seen timestamp with time zone not null default now(),
  loaded_at timestamp with time zone not null default now(),
  last_seen timestamp with time zone not null default now(),
  reload_requested_at timestamp with time zone
);

create table if not exists public.screen_settings (
  id uuid not null default gen_random_uuid(),
  department_id uuid not null,
  welcome_message text default 'ברוכים הבאים'::text,
  show_date boolean default true,
  show_time boolean default true,
  transition_interval integer default 10,
  theme text default 'light'::text,
  logo_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  display_mode text default 'daily'::text,
  media_url text,
  media_type text,
  media_display_seconds integer default 20,
  display_settings jsonb default '{"show_daily": true, "show_media": true, "show_ticker": true, "show_weekly": true, "show_announcements": true, "view_interval_seconds": 20}'::jsonb
);

create table if not exists public.staff_links (
  id uuid not null default gen_random_uuid(),
  role text not null,
  token uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now()
);

create table if not exists public.ticker_messages (
  id uuid not null default gen_random_uuid(),
  department_id uuid,
  message text not null,
  is_global boolean default false,
  is_active boolean default true,
  display_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  text text
);

create table if not exists public.voice_reminders (
  id uuid not null default gen_random_uuid(),
  department_id uuid,
  title text,
  messages jsonb default '{}'::jsonb,
  scheduled_time time without time zone not null,
  days_of_week text[] default '{}'::text[],
  repetitions integer default 1,
  languages text[] default ARRAY['he'::text],
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  play_on text[] default ARRAY['display'::text, 'orientation'::text]
);

create table if not exists public.weekly_menus (
  id uuid not null default gen_random_uuid(),
  week_start date not null,
  day_index smallint not null,
  meal text not null,
  items text not null default ''::text,
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.weekly_topics (
  id uuid not null default gen_random_uuid(),
  department_id uuid not null,
  title text not null,
  description text,
  week_start date not null,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  image_url text
);

-- ───── constraints ─────
do $$ begin if not exists (select 1 from pg_constraint where conname = 'activities_pkey' and conrelid = 'public.activities'::regclass) then alter table public.activities add constraint activities_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'activity_attendance_pkey' and conrelid = 'public.activity_attendance'::regclass) then alter table public.activity_attendance add constraint activity_attendance_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'activity_participants_pkey' and conrelid = 'public.activity_participants'::regclass) then alter table public.activity_participants add constraint activity_participants_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'admins_pkey' and conrelid = 'public.admins'::regclass) then alter table public.admins add constraint admins_pkey PRIMARY KEY (email); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'announcements_pkey' and conrelid = 'public.announcements'::regclass) then alter table public.announcements add constraint announcements_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'annual_topics_pkey' and conrelid = 'public.annual_topics'::regclass) then alter table public.annual_topics add constraint annual_topics_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'calendar_sources_pkey' and conrelid = 'public.calendar_sources'::regclass) then alter table public.calendar_sources add constraint calendar_sources_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'department_media_pkey' and conrelid = 'public.department_media'::regclass) then alter table public.department_media add constraint department_media_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'departments_pkey' and conrelid = 'public.departments'::regclass) then alter table public.departments add constraint departments_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'instructors_pkey' and conrelid = 'public.instructors'::regclass) then alter table public.instructors add constraint instructors_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'physio_appointments_pkey' and conrelid = 'public.physio_appointments'::regclass) then alter table public.physio_appointments add constraint physio_appointments_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'residents_pkey' and conrelid = 'public.residents'::regclass) then alter table public.residents add constraint residents_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'screen_devices_pkey' and conrelid = 'public.screen_devices'::regclass) then alter table public.screen_devices add constraint screen_devices_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'screen_settings_pkey' and conrelid = 'public.screen_settings'::regclass) then alter table public.screen_settings add constraint screen_settings_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'staff_links_pkey' and conrelid = 'public.staff_links'::regclass) then alter table public.staff_links add constraint staff_links_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'ticker_messages_pkey' and conrelid = 'public.ticker_messages'::regclass) then alter table public.ticker_messages add constraint ticker_messages_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'voice_reminders_pkey' and conrelid = 'public.voice_reminders'::regclass) then alter table public.voice_reminders add constraint voice_reminders_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'weekly_menus_pkey' and conrelid = 'public.weekly_menus'::regclass) then alter table public.weekly_menus add constraint weekly_menus_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'weekly_topics_pkey' and conrelid = 'public.weekly_topics'::regclass) then alter table public.weekly_topics add constraint weekly_topics_pkey PRIMARY KEY (id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'activity_attendance_activity_id_occurrence_date_resident_id_key' and conrelid = 'public.activity_attendance'::regclass) then alter table public.activity_attendance add constraint activity_attendance_activity_id_occurrence_date_resident_id_key UNIQUE (activity_id, occurrence_date, resident_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'activity_participants_activity_id_resident_id_key' and conrelid = 'public.activity_participants'::regclass) then alter table public.activity_participants add constraint activity_participants_activity_id_resident_id_key UNIQUE (activity_id, resident_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'annual_topics_week_start_key' and conrelid = 'public.annual_topics'::regclass) then alter table public.annual_topics add constraint annual_topics_week_start_key UNIQUE (week_start); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'departments_code_key' and conrelid = 'public.departments'::regclass) then alter table public.departments add constraint departments_code_key UNIQUE (code); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'departments_view_token_key' and conrelid = 'public.departments'::regclass) then alter table public.departments add constraint departments_view_token_key UNIQUE (view_token); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'instructors_name_key' and conrelid = 'public.instructors'::regclass) then alter table public.instructors add constraint instructors_name_key UNIQUE (name); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'instructors_name_unique' and conrelid = 'public.instructors'::regclass) then alter table public.instructors add constraint instructors_name_unique UNIQUE (name); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'instructors_view_token_key' and conrelid = 'public.instructors'::regclass) then alter table public.instructors add constraint instructors_view_token_key UNIQUE (view_token); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'screen_settings_department_id_key' and conrelid = 'public.screen_settings'::regclass) then alter table public.screen_settings add constraint screen_settings_department_id_key UNIQUE (department_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'staff_links_role_key' and conrelid = 'public.staff_links'::regclass) then alter table public.staff_links add constraint staff_links_role_key UNIQUE (role); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'weekly_menus_week_start_day_index_meal_key' and conrelid = 'public.weekly_menus'::regclass) then alter table public.weekly_menus add constraint weekly_menus_week_start_day_index_meal_key UNIQUE (week_start, day_index, meal); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'department_media_media_type_check' and conrelid = 'public.department_media'::regclass) then alter table public.department_media add constraint department_media_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'pdf'::text]))); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'screen_devices_kind_check' and conrelid = 'public.screen_devices'::regclass) then alter table public.screen_devices add constraint screen_devices_kind_check CHECK ((kind = ANY (ARRAY['department'::text, 'orientation'::text, 'physio'::text]))); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'screen_settings_display_mode_check' and conrelid = 'public.screen_settings'::regclass) then alter table public.screen_settings add constraint screen_settings_display_mode_check CHECK ((display_mode = ANY (ARRAY['daily'::text, 'weekly'::text, 'media'::text]))); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'screen_settings_media_type_check' and conrelid = 'public.screen_settings'::regclass) then alter table public.screen_settings add constraint screen_settings_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'pdf'::text]))); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'staff_links_role_check' and conrelid = 'public.staff_links'::regclass) then alter table public.staff_links add constraint staff_links_role_check CHECK ((role = ANY (ARRAY['dietitian'::text, 'physio'::text]))); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'weekly_menus_day_index_check' and conrelid = 'public.weekly_menus'::regclass) then alter table public.weekly_menus add constraint weekly_menus_day_index_check CHECK (((day_index >= 0) AND (day_index <= 6))); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'weekly_menus_meal_check' and conrelid = 'public.weekly_menus'::regclass) then alter table public.weekly_menus add constraint weekly_menus_meal_check CHECK ((meal = ANY (ARRAY['wake'::text, 'breakfast'::text, 'snack_am'::text, 'lunch'::text, 'snack_pm'::text, 'dinner'::text, 'notes'::text]))); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'activities_department_id_fkey' and conrelid = 'public.activities'::regclass) then alter table public.activities add constraint activities_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'activities_parent_id_fkey' and conrelid = 'public.activities'::regclass) then alter table public.activities add constraint activities_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.activities(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'activity_attendance_activity_id_fkey' and conrelid = 'public.activity_attendance'::regclass) then alter table public.activity_attendance add constraint activity_attendance_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'activity_attendance_department_id_fkey' and conrelid = 'public.activity_attendance'::regclass) then alter table public.activity_attendance add constraint activity_attendance_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'activity_attendance_resident_id_fkey' and conrelid = 'public.activity_attendance'::regclass) then alter table public.activity_attendance add constraint activity_attendance_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'activity_participants_activity_id_fkey' and conrelid = 'public.activity_participants'::regclass) then alter table public.activity_participants add constraint activity_participants_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'activity_participants_resident_id_fkey' and conrelid = 'public.activity_participants'::regclass) then alter table public.activity_participants add constraint activity_participants_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'announcements_department_id_fkey' and conrelid = 'public.announcements'::regclass) then alter table public.announcements add constraint announcements_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'calendar_sources_department_id_fkey' and conrelid = 'public.calendar_sources'::regclass) then alter table public.calendar_sources add constraint calendar_sources_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'department_media_department_id_fkey' and conrelid = 'public.department_media'::regclass) then alter table public.department_media add constraint department_media_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'physio_appointments_department_id_fkey' and conrelid = 'public.physio_appointments'::regclass) then alter table public.physio_appointments add constraint physio_appointments_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'physio_appointments_resident_id_fkey' and conrelid = 'public.physio_appointments'::regclass) then alter table public.physio_appointments add constraint physio_appointments_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'residents_department_id_fkey' and conrelid = 'public.residents'::regclass) then alter table public.residents add constraint residents_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id); end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'screen_devices_department_id_fkey' and conrelid = 'public.screen_devices'::regclass) then alter table public.screen_devices add constraint screen_devices_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'screen_settings_department_id_fkey' and conrelid = 'public.screen_settings'::regclass) then alter table public.screen_settings add constraint screen_settings_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'ticker_messages_department_id_fkey' and conrelid = 'public.ticker_messages'::regclass) then alter table public.ticker_messages add constraint ticker_messages_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'voice_reminders_department_id_fkey' and conrelid = 'public.voice_reminders'::regclass) then alter table public.voice_reminders add constraint voice_reminders_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname = 'weekly_topics_department_id_fkey' and conrelid = 'public.weekly_topics'::regclass) then alter table public.weekly_topics add constraint weekly_topics_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE; end if; end $$;

-- ───── indexes ─────
create index if not exists activities_external_uid_idx ON public.activities USING btree (department_id, external_uid);
create index if not exists activities_parent_idx ON public.activities USING btree (parent_id);
create index if not exists activity_attendance_date_idx ON public.activity_attendance USING btree (occurrence_date);
create index if not exists physio_appointments_date_idx ON public.physio_appointments USING btree (appt_date, start_time);
create index if not exists screen_devices_department_idx ON public.screen_devices USING btree (department_id);

-- ───── functions ─────
create or replace function public.auto_set_view_token() returns trigger
language plpgsql as $function$
begin
  if new.view_token is null or new.view_token = '' then
    new.view_token := gen_random_uuid()::text;
  end if;
  if new.orientation_color is null or new.orientation_color = '' then
    new.orientation_color := coalesce(new.color, '#10B981');
  end if;
  return new;
end;
$function$;

create or replace function public.ensure_instructor_row() returns trigger
language plpgsql security definer as $function$
declare
  trimmed_name text := nullif(trim(new.instructor_name), '');
begin
  if trimmed_name is not null then
    insert into instructors (name, view_token)
    values (trimmed_name, md5(random()::text || clock_timestamp()::text || trimmed_name))
    on conflict (name) do update set view_token = coalesce(instructors.view_token, excluded.view_token);
  end if;
  return new;
end;
$function$;

create or replace function public.screen_ping(
  p_id text, p_device text, p_kind text, p_department uuid, p_path text, p_info jsonb, p_session text
) returns jsonb
language plpgsql as $function$
declare
  r public.screen_devices;
begin
  insert into public.screen_devices as s (id, device_id, kind, department_id, path, info, session_id)
  values (p_id, p_device, p_kind, p_department, p_path, coalesce(p_info, '{}'::jsonb), p_session)
  on conflict (id) do update set
    device_id     = excluded.device_id,
    kind          = excluded.kind,
    department_id = excluded.department_id,
    path          = excluded.path,
    info          = excluded.info,
    last_seen     = now(),
    loaded_at     = case when s.session_id is distinct from excluded.session_id then now() else s.loaded_at end,
    session_id    = excluded.session_id
  returning * into r;

  return jsonb_build_object(
    'reload', r.reload_requested_at is not null and r.reload_requested_at > r.loaded_at,
    'requested', r.reload_requested_at
  );
end;
$function$;

create or replace function public.screen_reload(p_ids text[]) returns void
language sql as $function$
  update public.screen_devices set reload_requested_at = now() where id = any(p_ids);
$function$;

drop trigger if exists set_view_token on public.departments;
create trigger set_view_token before insert on public.departments
  for each row execute function public.auto_set_view_token();

drop trigger if exists ensure_instructor_on_activity on public.activities;
create trigger ensure_instructor_on_activity after insert or update on public.activities
  for each row execute function public.ensure_instructor_row();

-- ───── rls ─────
alter table public.activities enable row level security;
alter table public.activity_attendance enable row level security;
alter table public.activity_participants enable row level security;
alter table public.admins enable row level security;
alter table public.announcements enable row level security;
alter table public.annual_topics enable row level security;
alter table public.calendar_sources enable row level security;
alter table public.department_media enable row level security;
alter table public.departments enable row level security;
alter table public.instructors enable row level security;
alter table public.physio_appointments enable row level security;
alter table public.residents enable row level security;
alter table public.screen_devices enable row level security;
alter table public.screen_settings enable row level security;
alter table public.staff_links enable row level security;
alter table public.ticker_messages enable row level security;
alter table public.voice_reminders enable row level security;
alter table public.weekly_menus enable row level security;
alter table public.weekly_topics enable row level security;

-- ───── policies ─────
drop policy if exists "activities_all" on public.activities;
create policy "activities_all" on public.activities for all using (true);
drop policy if exists "activities_auth_write" on public.activities;
create policy "activities_auth_write" on public.activities for all using ((auth.role() = 'authenticated'::text)) with check ((auth.role() = 'authenticated'::text));
drop policy if exists "activity_attendance_all" on public.activity_attendance;
create policy "activity_attendance_all" on public.activity_attendance for all using (true) with check (true);
drop policy if exists "activity_participants_auth_write" on public.activity_participants;
create policy "activity_participants_auth_write" on public.activity_participants for all using ((auth.role() = 'authenticated'::text)) with check ((auth.role() = 'authenticated'::text));
drop policy if exists "activity_participants_public_read" on public.activity_participants;
create policy "activity_participants_public_read" on public.activity_participants for select using (true);
drop policy if exists "admins_read_auth" on public.admins;
create policy "admins_read_auth" on public.admins for select using ((auth.role() = 'authenticated'::text));
drop policy if exists "announcements_all" on public.announcements;
create policy "announcements_all" on public.announcements for all using (true);
drop policy if exists "announcements_auth_write" on public.announcements;
create policy "announcements_auth_write" on public.announcements for all using ((auth.role() = 'authenticated'::text)) with check ((auth.role() = 'authenticated'::text));
drop policy if exists "annual_topics_all" on public.annual_topics;
create policy "annual_topics_all" on public.annual_topics for all using (true) with check (true);
drop policy if exists "calendar_sources_all" on public.calendar_sources;
create policy "calendar_sources_all" on public.calendar_sources for all using (true) with check (true);
drop policy if exists "department_media_auth_write" on public.department_media;
create policy "department_media_auth_write" on public.department_media for all using ((auth.role() = 'authenticated'::text)) with check ((auth.role() = 'authenticated'::text));
drop policy if exists "department_media_public_read" on public.department_media;
create policy "department_media_public_read" on public.department_media for select using (true);
drop policy if exists "allow_all_updates" on public.departments;
create policy "allow_all_updates" on public.departments for all using (true) with check (true);
drop policy if exists "departments_all" on public.departments;
create policy "departments_all" on public.departments for all using (true);
drop policy if exists "departments_auth_write" on public.departments;
create policy "departments_auth_write" on public.departments for all using ((auth.role() = 'authenticated'::text)) with check ((auth.role() = 'authenticated'::text));
drop policy if exists "instructors_auth_write" on public.instructors;
create policy "instructors_auth_write" on public.instructors for all using ((auth.role() = 'authenticated'::text)) with check ((auth.role() = 'authenticated'::text));
drop policy if exists "instructors_public_read" on public.instructors;
create policy "instructors_public_read" on public.instructors for select using (true);
drop policy if exists "physio_appointments_all" on public.physio_appointments;
create policy "physio_appointments_all" on public.physio_appointments for all using (true) with check (true);
drop policy if exists "residents_auth_write" on public.residents;
create policy "residents_auth_write" on public.residents for all using ((auth.role() = 'authenticated'::text)) with check ((auth.role() = 'authenticated'::text));
drop policy if exists "residents_public_read" on public.residents;
create policy "residents_public_read" on public.residents for select using (true);
drop policy if exists "screen_devices_all" on public.screen_devices;
create policy "screen_devices_all" on public.screen_devices for all using (true) with check (true);
drop policy if exists "screen_settings_all" on public.screen_settings;
create policy "screen_settings_all" on public.screen_settings for all using (true);
drop policy if exists "screen_settings_auth_write" on public.screen_settings;
create policy "screen_settings_auth_write" on public.screen_settings for all using ((auth.role() = 'authenticated'::text)) with check ((auth.role() = 'authenticated'::text));
drop policy if exists "staff_links_all" on public.staff_links;
create policy "staff_links_all" on public.staff_links for all using (true) with check (true);
drop policy if exists "ticker_all" on public.ticker_messages;
create policy "ticker_all" on public.ticker_messages for all using (true);
drop policy if exists "ticker_auth_write" on public.ticker_messages;
create policy "ticker_auth_write" on public.ticker_messages for all using ((auth.role() = 'authenticated'::text)) with check ((auth.role() = 'authenticated'::text));
drop policy if exists "auth write voice_reminders" on public.voice_reminders;
create policy "auth write voice_reminders" on public.voice_reminders for all using ((auth.role() = 'authenticated'::text));
drop policy if exists "public read voice_reminders" on public.voice_reminders;
create policy "public read voice_reminders" on public.voice_reminders for select using (true);
drop policy if exists "weekly_menus_all" on public.weekly_menus;
create policy "weekly_menus_all" on public.weekly_menus for all using (true) with check (true);
drop policy if exists "weekly_topics_all" on public.weekly_topics;
create policy "weekly_topics_all" on public.weekly_topics for all using (true);
drop policy if exists "weekly_topics_auth_write" on public.weekly_topics;
create policy "weekly_topics_auth_write" on public.weekly_topics for all using ((auth.role() = 'authenticated'::text)) with check ((auth.role() = 'authenticated'::text));
drop policy if exists "weekly_topics_public_read" on public.weekly_topics;
create policy "weekly_topics_public_read" on public.weekly_topics for select using (true);
