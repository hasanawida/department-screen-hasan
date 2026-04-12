import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'מערכת המחלקה',
  description: 'מערכת ניהול מחלקה',
  generator: 'v0.app',
  icons: {},
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
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
      </head>
      <body suppressHydrationWarning={true} className={`${inter.className} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}