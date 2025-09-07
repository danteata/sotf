import { type Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import './globals.css'
import QueryProvider from '@/components/query-provider'
import { AuthLoadingWrapper } from '@/components/auth-loading-wrapper'

const font = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'MKC AshBotchWay - State of the Flock',
  description: 'Church management system for Makarios Church AshBotchWay',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${font.variable} antialiased`}>
          <QueryProvider>
            <AuthLoadingWrapper>
              {children}
            </AuthLoadingWrapper>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
