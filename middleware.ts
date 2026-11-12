import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

// ההתחברות נבדקת רק בניהול ובעמוד הכניסה. מסכי הטלוויזיה ועמודי הצוות (קישור אישי) לא עוברים כאן —
// כך תקלה בשירות ההתחברות לא יכולה להפיל מסך, וכל רענון של מסך חוסך קריאה מיותרת.
export const config = {
  matcher: ['/admin/:path*', '/api/admins/:path*', '/auth/:path*'],
}
