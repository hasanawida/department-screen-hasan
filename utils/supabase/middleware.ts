import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
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
  const isAdminApi =
    pathname.startsWith('/api/translate-reminder') ||
    pathname.startsWith('/api/analyze-schedule') ||
    pathname.startsWith('/api/admins')

  // רשימת מורשים: קודם טבלת admins ב-DB, ואם אין — fallback ל-ADMIN_EMAILS מה-env
  let isAllowedUser = false
  if (user && user.email) {
    const emailLc = user.email.toLowerCase()

    const { data: adminRow } = await supabase
      .from('admins')
      .select('email')
      .eq('email', emailLc)
      .maybeSingle()

    if (adminRow) {
      isAllowedUser = true
    } else {
      const fallback = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
      if (fallback.length === 0 || fallback.includes(emailLc)) isAllowedUser = true
    }
  }

  // לא מחובר ומנסה להיכנס לאדמין → לוגין
  if (!user && isAdminPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // מחובר אך לא ברשימת האדמינים → חזרה ללוגין
  if (user && isAdminPage && !isAllowedUser) {
    await supabase.auth.signOut()
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('error', 'not_allowed')
    return NextResponse.redirect(url)
  }

  // בקשות API רגישות — גם הן חייבות משתמש מאושר
  if (isAdminApi && !isAllowedUser) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    })
  }

  // מחובר ועל דף auth → אדמין
  if (user && isAuthPage && isAllowedUser) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}