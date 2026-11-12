-- 016 — לפני העלייה לאוויר (נובמבר 2026)
-- מריצים פעם אחת ב-Supabase ← SQL Editor. בטוח להריץ שוב (כל שלב בודק אם כבר בוצע).
-- לא מוחק ולא משנה נתונים, חוץ מאיפוס דגל הרענון בשלב 4.

-- ── 1. שידור חי (Realtime) לטבלאות שעמודי הצוות מאזינים להן ──────────────────────────────
-- העמוד האישי של מפעיל/ה ושל מדריכת התעסוקה מתעדכן לבד כשמשנים רישום של דיירים או כרטיס דייר.
-- עד עכשיו שתי הטבלאות האלה לא שודרו, ולכן העמוד התעדכן רק ברענון.
do $$
declare t text;
begin
  foreach t in array array['activity_participants', 'residents']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ── 2. האחסון של התמונות: רק תמונות ו-PDF, עד 20MB לקובץ ────────────────────────────────
-- עמודי הצוות מעלים תמונות למאגר מהקישור האישי שלהם (למשל תמונת מנה של הדיאטנית).
-- ההגבלה מוודאת שנכנסים אליו רק תמונות ו-PDF, ובגודל סביר.
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['image/*', 'application/pdf']
where id = 'department-media';

-- ── 3. אילוץ כפול על שם המפעיל/ה ─────────────────────────────────────────────────────────
-- יש שני אילוצים זהים (instructors_name_key ו-instructors_name_unique). אחד מספיק.
alter table public.instructors drop constraint if exists instructors_name_unique;

-- ── 4. דגל "רענון מסך" שנשאר דלוק ────────────────────────────────────────────────────────
-- בגרסה הקודמת הדגל יכול היה להישאר דלוק (כשסגרו את הלשונית מיד אחרי שמירה),
-- ואז כל שינוי אחר במחלקה טען מחדש את המסכים שלה. הגרסה החדשה לא משאירה אותו דלוק.
update public.departments set force_refresh = false where force_refresh;

-- בדיקה: מה משודר עכשיו, ומה ההגבלות על האחסון
select 'realtime' as what, string_agg(tablename, ', ' order by tablename) as value
from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public'
union all
select 'storage', 'limit=' || coalesce(file_size_limit::text, 'none') || ' types=' || coalesce(array_to_string(allowed_mime_types, ','), 'any')
from storage.buckets where id = 'department-media';
