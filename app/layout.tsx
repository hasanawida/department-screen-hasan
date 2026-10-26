import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
// גופן הזהות (Rubik) לכל המערכת — עברית, ערבית, רוסית ואנגלית, בלי תלות ב-Google Fonts
import '@/components/orientation/orientation-fonts.css'

export const metadata: Metadata = {
  title: 'מערכת המחלקה',
  description: 'מערכת ניהול מחלקה',
  manifest: '/manifest.json',
  icons: {
    apple: '/icon-192.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#3F2F2D" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="מערכת המחלקה" />
      </head>
      <body suppressHydrationWarning={true} className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
