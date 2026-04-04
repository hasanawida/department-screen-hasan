-- Seed data for Department Screen System
-- נתונים לדוגמה

-- Insert departments
INSERT INTO departments (id, name, slug, type) VALUES
  ('11111111-1111-1111-1111-111111111111', 'מחלקת תשושים', 'tshushim', 'frail'),
  ('22222222-2222-2222-2222-222222222222', 'מחלקת תשושי נפש', 'dementia', 'dementia'),
  ('33333333-3333-3333-3333-333333333333', 'מחלקת שיקום', 'rehab', 'rehab')
ON CONFLICT (slug) DO NOTHING;

-- Insert screen settings
INSERT INTO screen_settings (department_id, layout_type, font_scale, show_calendar, show_announcements, show_ticker, idle_message) VALUES
  ('11111111-1111-1111-1111-111111111111', 'default', 1.0, true, true, true, 'ברוכים הבאים ויום נעים'),
  ('22222222-2222-2222-2222-222222222222', 'dementia_simple', 1.15, false, true, false, 'בוקר טוב, אנחנו כאן יחד'),
  ('33333333-3333-3333-3333-333333333333', 'default', 1.0, true, true, true, 'בהצלחה בשיקום')
ON CONFLICT (department_id) DO NOTHING;

-- Insert activities for today
INSERT INTO activities (department_id, title, description, category, location, instructor_name, start_datetime, end_datetime, status, color_tag, display_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'התעמלות בוקר', 'פעילות גופנית קלה לבוקר', 'exercise', 'אולם פעילות', 'מירה', NOW()::date + INTERVAL '9 hours', NOW()::date + INTERVAL '9 hours 45 minutes', 'scheduled', 'green', 0),
  ('11111111-1111-1111-1111-111111111111', 'קפה ועיתון', 'שיחה על אירועי היום', 'social', 'פינת ישיבה', 'צוות בוקר', NOW()::date + INTERVAL '10 hours', NOW()::date + INTERVAL '10 hours 30 minutes', 'scheduled', 'blue', 1),
  ('11111111-1111-1111-1111-111111111111', 'חוג מוזיקה', 'שירה קבוצתית עם כלי נגינה', 'music', 'חדר תרבות', 'דניאל', NOW()::date + INTERVAL '11 hours', NOW()::date + INTERVAL '11 hours 45 minutes', 'scheduled', 'purple', 2),
  ('11111111-1111-1111-1111-111111111111', 'ארוחת צהריים', 'ארוחה חמה בחדר האוכל', 'meal', 'חדר אוכל', 'צוות סיעוד', NOW()::date + INTERVAL '12 hours 30 minutes', NOW()::date + INTERVAL '13 hours 15 minutes', 'scheduled', 'orange', 3),
  ('11111111-1111-1111-1111-111111111111', 'מנוחת צהריים', 'זמן מנוחה', 'free_time', 'חדרים', NULL, NOW()::date + INTERVAL '13 hours 30 minutes', NOW()::date + INTERVAL '15 hours', 'scheduled', 'gray', 4),
  ('11111111-1111-1111-1111-111111111111', 'טיפול בעיסוק', 'פעילות יצירה', 'therapy', 'חדר טיפולים', 'שרה', NOW()::date + INTERVAL '15 hours 30 minutes', NOW()::date + INTERVAL '16 hours 15 minutes', 'scheduled', 'teal', 5),
  ('11111111-1111-1111-1111-111111111111', 'ארוחת ערב', 'ארוחת ערב קלה', 'meal', 'חדר אוכל', 'צוות ערב', NOW()::date + INTERVAL '18 hours', NOW()::date + INTERVAL '18 hours 45 minutes', 'scheduled', 'orange', 6),
  
  ('22222222-2222-2222-2222-222222222222', 'בוקר טוב', 'התכנסות והתעוררות', 'social', 'חדר מרכזי', 'צוות', NOW()::date + INTERVAL '8 hours 30 minutes', NOW()::date + INTERVAL '9 hours', 'scheduled', 'yellow', 0),
  ('22222222-2222-2222-2222-222222222222', 'זיכרון וזהות', 'פעילות קוגניטיבית', 'cognitive', 'חדר פעילות', 'יעל', NOW()::date + INTERVAL '10 hours', NOW()::date + INTERVAL '10 hours 30 minutes', 'scheduled', 'blue', 1),
  ('22222222-2222-2222-2222-222222222222', 'מוזיקה מרגיעה', 'האזנה ושירה', 'music', 'חדר מרכזי', 'דוד', NOW()::date + INTERVAL '11 hours', NOW()::date + INTERVAL '11 hours 30 minutes', 'scheduled', 'purple', 2),
  
  ('33333333-3333-3333-3333-333333333333', 'פיזיותרפיה קבוצתית', 'תרגילי שיקום', 'therapy', 'חדר כושר', 'ד"ר כהן', NOW()::date + INTERVAL '9 hours', NOW()::date + INTERVAL '10 hours', 'scheduled', 'green', 0),
  ('33333333-3333-3333-3333-333333333333', 'ריפוי בעיסוק', 'תרגול יומיומי', 'therapy', 'חדר טיפולים', 'נועה', NOW()::date + INTERVAL '11 hours', NOW()::date + INTERVAL '12 hours', 'scheduled', 'teal', 1);

-- Insert announcements
INSERT INTO announcements (department_id, title, content, priority, start_datetime, end_datetime, is_pinned, is_fullscreen, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'ביקור רופא', 'היום בשעה 14:00 - ד"ר לוי', 'urgent', NOW()::date, NOW()::date + INTERVAL '1 day', true, false, 'active'),
  ('11111111-1111-1111-1111-111111111111', 'שינוי בארוחה', 'ארוחת הצהריים תוגש ב-12:15', 'normal', NOW()::date, NOW()::date + INTERVAL '1 day', false, false, 'active'),
  ('11111111-1111-1111-1111-111111111111', 'מזל טוב!', 'יום הולדת שמח לשרה ולדוד', 'low', NOW()::date, NOW()::date + INTERVAL '1 day', false, false, 'active'),
  (NULL, 'הודעה כללית', 'מחר יום שישי - שעות פעילות מקוצרות', 'high', NOW()::date, NOW()::date + INTERVAL '2 days', true, false, 'active'),
  ('22222222-2222-2222-2222-222222222222', 'תזכורת', 'ביקור משפחות היום אחרי הצהריים', 'normal', NOW()::date, NOW()::date + INTERVAL '1 day', false, false, 'active');

-- Insert ticker messages
INSERT INTO ticker_messages (department_id, message, display_order, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'ברוכים הבאים למחלקת תשושים', 0, true),
  ('11111111-1111-1111-1111-111111111111', 'מזל טוב לחוגגים השבוע', 1, true),
  ('11111111-1111-1111-1111-111111111111', 'יום נעים ובשורות טובות', 2, true),
  ('11111111-1111-1111-1111-111111111111', 'שעות ביקור: 10:00-12:00, 16:00-19:00', 3, true),
  (NULL, 'ברוכים הבאים לבית האבות שלנו', 0, true);
