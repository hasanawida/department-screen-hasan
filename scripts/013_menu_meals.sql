-- ─────────────────────────────────────────────────────────────
-- 013 — תפריט: השכמה, ארוחת עשר, ארוחת ארבע והערות לשבוע (כמו בתפריט של הדיאטנית)
-- להריץ פעם אחת ב-Supabase: SQL Editor ← New query ← להדביק ← Run. בטוח להריץ שוב.
-- ─────────────────────────────────────────────────────────────

alter table public.weekly_menus drop constraint if exists weekly_menus_meal_check;
alter table public.weekly_menus add constraint weekly_menus_meal_check
  check (meal in ('wake', 'breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner', 'notes'));
