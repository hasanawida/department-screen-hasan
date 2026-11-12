-- 017 — צמצום הרשאות הכתיבה של מי שלא מחובר (שלב 1 של הקשחת האבטחה)
--
-- ⚠ להריץ רק אחרי שהגרסה החדשה של המערכת עלתה ונבדקה. לא חלק מ-016.
--
-- אחרי הקובץ הזה, בלי התחברות אפשר לכתוב רק את מה שעמודי הצוות (בקישור אישי) והטלוויזיות באמת כותבים:
--   תפריט (weekly_menus), פיזיותרפיה (physio_appointments), נוכחות (activity_attendance),
--   דיווח של מסכים (screen_devices), הגדרות מסך (screen_settings — בחירת תמונה למנה),
--   ובמחלקות — רק הגדרות מסך ההתמצאות, תרגום השם ודגל הרענון.
-- כל השאר (פעילויות, נושאים, מחלקות, קישורי צוות) — רק למנהל/ת מחובר/ת.
--
-- הקריאה לא משתנה כאן (המסכים ועמודי הצוות קוראים בלי התחברות). צמצום הקריאה הוא שלב 2, ודורש שינוי בקוד.

begin;

-- פעילויות: קריאה לכולם, כתיבה למחוברים (המדיניות activities_auth_write כבר קיימת)
drop policy if exists "activities_all" on public.activities;
drop policy if exists "activities_public_read" on public.activities;
create policy "activities_public_read" on public.activities for select using (true);

-- נושא שבועי למחלקה: המדיניות לקריאה ולכתיבת מחוברים כבר קיימות
drop policy if exists "weekly_topics_all" on public.weekly_topics;

-- תוכנית שנתית
drop policy if exists "annual_topics_all" on public.annual_topics;
drop policy if exists "annual_topics_public_read" on public.annual_topics;
drop policy if exists "annual_topics_auth_write" on public.annual_topics;
create policy "annual_topics_public_read" on public.annual_topics for select using (true);
create policy "annual_topics_auth_write" on public.annual_topics for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- קישורי הצוות: קריאה (כדי שהקישור ייפתח), החלפת קישור — רק למחוברים
drop policy if exists "staff_links_all" on public.staff_links;
drop policy if exists "staff_links_public_read" on public.staff_links;
drop policy if exists "staff_links_auth_write" on public.staff_links;
create policy "staff_links_public_read" on public.staff_links for select using (true);
create policy "staff_links_auth_write" on public.staff_links for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- טבלאות של יכולות שהוסרו מהמערכת (הודעות, שורה רצה ידנית, יומן Outlook): רק למחוברים
drop policy if exists "announcements_all" on public.announcements;
drop policy if exists "ticker_all" on public.ticker_messages;
drop policy if exists "calendar_sources_all" on public.calendar_sources;
drop policy if exists "calendar_sources_auth" on public.calendar_sources;
create policy "calendar_sources_auth" on public.calendar_sources for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- מחלקות: בלי התחברות אי אפשר להוסיף או למחוק מחלקה, ואפשר לעדכן רק את העמודות של מסך ההתמצאות
revoke insert, delete, update on public.departments from anon;
grant update (orientation_color, orientation_settings, name_ar, name_ru, name_en, force_refresh) on public.departments to anon;

commit;

-- בדיקה: המדיניות על הטבלאות ששונו
select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('activities', 'weekly_topics', 'annual_topics', 'staff_links', 'announcements', 'ticker_messages', 'calendar_sources', 'departments')
order by tablename, policyname;
