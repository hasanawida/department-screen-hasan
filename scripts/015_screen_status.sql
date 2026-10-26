-- ─────────────────────────────────────────────────────────────
-- 015 — מצב המסכים: כל טלוויזיה מדווחת כל דקה שהיא דולקת ומה פתוח בה,
--       ואפשר לרענן אותה מרחוק מעמודי "מסכי מחלקות" ו"מסכי התמצאות".
-- להריץ פעם אחת ב-Supabase: SQL Editor ← New query ← להדביק ← Run. בטוח להריץ שוב.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.screen_devices (
  id text primary key,                          -- מכשיר + סוג המסך + מחלקה
  device_id text not null,                      -- מזהה קבוע של המכשיר (נשמר בדפדפן שלו)
  kind text not null check (kind in ('department', 'orientation', 'physio')),
  department_id uuid references public.departments(id) on delete cascade,
  label text,                                   -- שם שנותנים בניהול, למשל "טלוויזיה ליד חדר האוכל"
  path text,                                    -- הכתובת שפתוחה במכשיר
  info jsonb not null default '{}'::jsonb,      -- גודל מסך, מערכת, דפדפן
  session_id text,                              -- הטעינה הנוכחית של הדף
  first_seen timestamptz not null default now(),
  loaded_at timestamptz not null default now(), -- מתי הדף נטען (לפי שעון השרת)
  last_seen timestamptz not null default now(), -- הדיווח האחרון
  reload_requested_at timestamptz               -- "רענון" מהניהול
);
create index if not exists screen_devices_department_idx on public.screen_devices (department_id);

-- הרשאות: כמו שאר הטבלאות במערכת (המסכים עובדים עם המפתח הציבורי)
alter table public.screen_devices enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'screen_devices' and policyname = 'screen_devices_all') then
    create policy screen_devices_all on public.screen_devices for all using (true) with check (true);
  end if;
end $$;
grant select, insert, update, delete on public.screen_devices to anon, authenticated;

-- דיווח מהמסך. השעה נלקחת מהשרת ולא מהשעון של הטלוויזיה.
-- מחזיר reload = true אם ביקשו רענון אחרי שהדף נטען, ואת זמן הבקשה האחרונה.
create or replace function public.screen_ping(
  p_id text,
  p_device text,
  p_kind text,
  p_department uuid,
  p_path text,
  p_info jsonb,
  p_session text
) returns jsonb
language plpgsql
as $$
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
    -- טעינה חדשה של הדף (אחרי רענון, הפסקת חשמל...) — מתחילים לספור ממנה
    loaded_at     = case when s.session_id is distinct from excluded.session_id then now() else s.loaded_at end,
    session_id    = excluded.session_id
  returning * into r;

  return jsonb_build_object(
    'reload', r.reload_requested_at is not null and r.reload_requested_at > r.loaded_at,
    'requested', r.reload_requested_at
  );
end;
$$;

-- "רענון" מהניהול, לפי שעון השרת
create or replace function public.screen_reload(p_ids text[])
returns void
language sql
as $$
  update public.screen_devices set reload_requested_at = now() where id = any(p_ids);
$$;

grant execute on function public.screen_ping(text, text, text, uuid, text, jsonb, text) to anon, authenticated;
grant execute on function public.screen_reload(text[]) to anon, authenticated;

-- עדכון מיידי בעמודי הניהול, ורענון מיידי במסך
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.screen_devices'; exception when others then null; end;
end $$;
