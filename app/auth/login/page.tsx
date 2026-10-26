'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { EshkolotLogo, Pin, BRAND } from '@/components/orientation/eshkolot-logo'

const inputCls =
  'h-12 w-full rounded-xl border border-[#3F2F2D]/15 bg-white px-4 text-base text-[#3F2F2D] outline-none placeholder:text-[#3F2F2D]/40 focus:border-[#5A826F] focus:ring-2 focus:ring-[#5A826F]/25'

function hebrewError(message: string) {
  if (/invalid login credentials/i.test(message)) return 'האימייל או הסיסמה לא נכונים.'
  if (/email not confirmed/i.test(message)) return 'צריך לאשר את כתובת האימייל לפני ההתחברות.'
  if (/fetch|network/i.test(message)) return 'אין חיבור לשרת. בודקים את האינטרנט ומנסים שוב.'
  return message
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/admin'
  const notAllowed = searchParams.get('error') === 'not_allowed'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.refresh()
      router.push(redirectTo)
    } catch (err: unknown) {
      setError(err instanceof Error ? hebrewError(err.message) : 'ההתחברות לא הצליחה')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid min-h-svh w-full bg-[#F6F2EE] text-[#3F2F2D] md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" dir="rtl">
      {/* טופס */}
      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <EshkolotLogo className="mb-10 h-14 w-auto" />
          <h1 className="text-3xl font-extrabold tracking-tight">כניסה לניהול המסכים</h1>
          <p className="mt-2 text-[15px] text-[#3F2F2D]/65">לוחות הפעילות, התפריט ומסכי ההתמצאות של כל המחלקות.</p>

          <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-[#5A826F]">אימייל</label>
              <input id="email" type="email" dir="ltr" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputCls + ' text-left'} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-[#5A826F]">סיסמה</label>
              <input id="password" type="password" dir="ltr" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required className={inputCls + ' text-left'} />
            </div>
            {(error || notAllowed) && (
              <p role="alert" className="rounded-xl bg-[#FDE8E1] px-4 py-3 text-[15px] text-[#7a2e22]">
                {error ?? 'החשבון הזה לא מורשה לניהול. פונים למנהל המערכת כדי לקבל הרשאה.'}
              </p>
            )}
            <button type="submit" disabled={isLoading}
              className="mt-1 h-12 w-full rounded-xl bg-[#3F2F2D] text-base font-semibold text-[#F6F2EE] hover:bg-[#3F2F2D]/90 disabled:opacity-60">
              {isLoading ? 'נכנסים…' : 'כניסה'}
            </button>
          </form>
        </div>
      </div>

      {/* צד מותג */}
      <div className="relative hidden overflow-hidden bg-[#E3ECE7] md:block" aria-hidden="true">
        <Pin color={BRAND.sage} className="absolute right-[18%] top-[14%] w-[34%]" />
        <Pin color={BRAND.sun} className="absolute right-[8%] top-[44%] w-[26%]" />
        <Pin color={BRAND.coral} className="absolute right-[40%] top-[50%] w-[24%]" />
        <p className="absolute bottom-10 right-10 left-10 text-2xl font-bold leading-snug text-[#375044]">
          מה שקורה היום במחלקה,<br />על המסך, בגדול וברור.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
