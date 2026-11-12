import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** מנהלים שמוגדרים בשרת (משתנה הסביבה ADMIN_EMAILS, מופרדים בפסיקים) */
export function envAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname.startsWith('/auth')
  const isAdminPage = pathname.startsWith('/admin')
  const isAdminApi = pathname.startsWith('/api/admins')

  // הפניה שלא מאבדת את עוגיות ההתחברות שהתעדכנו (או נמחקו) בבקשה הזו
  const redirectTo = (path: string, params: Record<string, string> = {}) => {
    const url = request.nextUrl.clone()
    url.pathname = path
    url.search = ''
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    const res = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c))
    return res
  }

  // מי מורשה לניהול: מי שמופיע ב-ADMIN_EMAILS בשרת, או מי שרשום בטבלת admins.
  // רק כשעוד לא הוגדר אף מנהל (אין ADMIN_EMAILS והטבלה ריקה) כל משתמש מחובר נכנס,
  // כדי שאפשר יהיה להגדיר את המנהל הראשון. מרגע שהוגדר מנהל אחד — הכניסה נעולה לכל השאר.
  let isAllowedUser = false
  if (user?.email && (isAdminPage || isAdminApi || isAuthPage)) {
    const emailLc = user.email.toLowerCase()
    const envAdmins = envAdminEmails()

    if (envAdmins.includes(emailLc)) {
      isAllowedUser = true
    } else {
      const { data: adminRow } = await supabase
        .from('admins')
        .select('email')
        .eq('email', emailLc)
        .maybeSingle()

      if (adminRow) {
        isAllowedUser = true
      } else if (envAdmins.length === 0) {
        const { data: anyAdmin, error } = await supabase.from('admins').select('email').limit(1)
        if (!error && (anyAdmin ?? []).length === 0) isAllowedUser = true
      }
    }
  }

  // לא מחובר ומנסה להיכנס לניהול → כניסה
  if (!user && isAdminPage) {
    const back = pathname + request.nextUrl.search
    return redirectTo('/auth/login', back === '/admin' ? {} : { redirectTo: back })
  }

  // מחובר אבל לא מנהל → יציאה וחזרה לעמוד הכניסה
  if (user && isAdminPage && !isAllowedUser) {
    await supabase.auth.signOut()
    return redirectTo('/auth/login', { error: 'not_allowed' })
  }

  // ניהול המנהלים — רק למנהל מאושר
  if (isAdminApi && !isAllowedUser) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    })
  }

  // מנהל מחובר שנכנס לעמוד הכניסה → ישר לניהול (לעמוד שממנו הגיע, אם יש)
  if (user && isAuthPage && isAllowedUser) {
    const back = request.nextUrl.searchParams.get('redirectTo') || ''
    if (back.startsWith('/admin')) {
      const target = new URL(back, request.nextUrl.origin)
      if (target.origin === request.nextUrl.origin) {
        const res = NextResponse.redirect(target)
        supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c))
        return res
      }
    }
    return redirectTo('/admin')
  }

  return supabaseResponse
}
