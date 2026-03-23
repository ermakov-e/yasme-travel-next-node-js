import type { Metadata, Viewport } from 'next'
import './globals.css'
import { QueryProvider } from '@/providers/QueryProvider'
import { MockProvider } from '@/providers/MockProvider'

export const metadata: Metadata = {
  title: 'Yasme Travel',
  description: 'Совместные фото из путешествий с друзьями',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Yasme Travel',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#F97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <MockProvider>{children}</MockProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
