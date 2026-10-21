import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { MusicPlayer } from '@/components/layout/MusicPlayer'
import { KeyboardSound } from '@/components/layout/KeyboardSound'
import { SplashScreen } from '@/components/layout/SplashScreen'


const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Level',
  description: 'Gestão inteligente de produções audiovisuais',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Level',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </head>
      <body className={`${inter.className} bg-white text-black antialiased`}>
        <SplashScreen />
        {children}
        <MusicPlayer />
        <KeyboardSound />
      </body>
    </html>
  )
}
