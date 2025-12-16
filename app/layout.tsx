import { type Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Space_Grotesk } from 'next/font/google'
import './globals.css'
import QueryProvider from '@/components/query-provider'
import { AuthLoadingWrapper } from '@/components/auth-loading-wrapper'
import { OrganizationProvider } from '@/hooks/use-organization'
import { ThemeProvider } from '@/components/theme-provider'

const font = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
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
      <html lang="en" suppressHydrationWarning>
        <body className={`${font.variable} antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <AuthLoadingWrapper>
                <OrganizationProvider>
                  {children}
                </OrganizationProvider>
              </AuthLoadingWrapper>
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}