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
  const isAdminApi = pathname.startsWith('/api/translate-reminder') || pathname.startsWith('/api/analyze-schedule')

  // רשימת מורשים לניהול — מהסביבה (ADMIN_EMAILS="a@x,b@y"). אם ריק → כל משתמש מחובר.
  const allowed = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  const isAllowedUser = user && (allowed.length === 0 || (user.email && allowed.includes(user.email.toLowerCase())))

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