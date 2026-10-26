-- ─────────────────────────────────────────────────────────────
-- 014 — פיזיותרפיה: האם הדייר/ת הגיע/ה לטיפול (לדוח הנוכחות)
-- להריץ פעם אחת ב-Supabase: SQL Editor ← New query ← להדביק ← Run. בטוח להריץ שוב.
-- ─────────────────────────────────────────────────────────────

-- true = הגיע/ה, false = לא הגיע/ה, null = עוד לא סומן
alter table public.physio_appointments add column if not exists attended boolean;
