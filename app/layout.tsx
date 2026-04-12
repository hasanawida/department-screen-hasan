import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

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
        <meta name="viewport" content="width=1920, initial-scale=1, minimum-scale=1" />
        <meta name="theme-color" content="#10B981" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="מערכת המחלקה" />
      </head>
      <body suppressHydrationWarning={true} className={`${inter.className} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}