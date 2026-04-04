# מסך המחלקה 🏥

מערכת תצוגת מידע דיגיטלית למחלקות בית אבות.

## מה זה?

- **מסך תצוגה** — מוצג בטלוויזיה בכל מחלקה: פעילויות יומיות, הודעות, שעון ותאריך
- **ממשק ניהול** — מנהלים מוסיפים/עורכים פעילויות והודעות מכל מקום
- **עדכונים חיים** — שינוי בניהול מתעדכן על המסך באופן מיידי

## הפעלה מקומית

### 1. שכפל ותקין

```bash
git clone <your-repo>
cd department-screen
pnpm install
```

### 2. הגדר Supabase

1. צור פרויקט חינמי ב-[supabase.com](https://supabase.com)
2. העתק את ה-URL ו-anon key מ: **Project Settings → API**
3. צור קובץ `.env.local`:

```bash
cp .env.local.example .env.local
# ערוך את הקובץ עם הפרטים שלך
```

4. הרץ את הסכמה ב-**SQL Editor** בסופאבייס:

```sql
-- הדבק את תוכן scripts/001_create_tables.sql
-- ואז את תוכן scripts/002_seed_data.sql
```

5. הפעל Realtime עבור הטבלאות ב: **Database → Replication → Supabase Realtime**  
   סמן: `activities`, `announcements`, `ticker_messages`

### 3. הפעל

```bash
pnpm dev
```

פתח [http://localhost:3000](http://localhost:3000)

## פריסה ל-Vercel

1. דחוף לגיטהאב
2. ייבא ב-[vercel.com/new](https://vercel.com/new)
3. הוסף את משתני הסביבה ב-**Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. פרוס ✅

## מבנה הפרויקט

```
app/
  page.tsx              # דף בית — רשימת מחלקות
  display/[code]/       # מסך תצוגה לכל מחלקה
  admin/                # ממשק ניהול (מוגן בהתחברות)
  auth/                 # התחברות והרשמה
components/
  display/              # רכיבי מסך התצוגה
  admin/                # רכיבי ממשק הניהול
lib/
  supabase/             # חיבור Supabase
  types.ts              # TypeScript types
scripts/
  001_create_tables.sql # סכמת בסיס הנתונים
  002_seed_data.sql     # נתוני דוגמה
```

## URLs

| כתובת | תיאור |
|-------|-------|
| `/` | דף בית — בחירת מחלקה |
| `/display/[code]` | מסך תצוגה למחלקה |
| `/admin` | לוח בקרה (דורש התחברות) |
| `/auth/login` | התחברות |
