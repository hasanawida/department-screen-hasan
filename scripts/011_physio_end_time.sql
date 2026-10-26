-- ─────────────────────────────────────────────────────────────
-- 011 — פיזיותרפיה: שעת סיום לטיפול (משעה עד שעה)
-- להריץ פעם אחת ב-Supabase: SQL Editor ← New query ← להדביק ← Run
-- ─────────────────────────────────────────────────────────────

alter table public.physio_appointments add column if not exists end_time time;
