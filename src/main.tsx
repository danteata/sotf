import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexReactClient } from 'convex/react'
import { OrganizationProvider } from './hooks/use-organization.tsx'
import { ThemeProvider } from './components/theme-provider'

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined

if (!convexUrl || !clerkKey) {
    throw new Error("Missing required environment variables: VITE_CONVEX_URL or VITE_CLERK_PUBLISHABLE_KEY")
}

const convex = new ConvexReactClient(convexUrl)

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ClerkProvider publishableKey={clerkKey}>
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
                <ThemeProvider defaultTheme="light" storageKey="floc-ui-theme">
                    <OrganizationProvider>
                        <App />
                    </OrganizationProvider>
                </ThemeProvider>
            </ConvexProviderWithClerk>
        </ClerkProvider>
    </React.StrictMode>,
)
