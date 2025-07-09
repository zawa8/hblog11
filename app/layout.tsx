import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { ToastProvider } from '@/components/providers/toaster-provider'
import { ConfettiProvider } from '@/components/providers'

import { inglishenglosoftw8asc } from '@/components/hsciifp/hsciifonts'
import Hsciifontpicker from '@/components/hsciifp/Hsciifontpicker'

export const metadata: Metadata = {
  title: 'LMS (Learning Management System)',
  description: 'LMS (Learning Management System)',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inglishenglosoftw8asc.className}>
          <Hsciifontpicker/>
          <ConfettiProvider />
          <ToastProvider />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
