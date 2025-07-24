'use client'
import { useEffect } from 'react'
import { useUser, SignInButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useTerminology } from '@/hooks/use-terminology'

export default function HomePage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const { terminology } = useTerminology()

  useEffect(() => {
    if (isLoaded && user) {
      router.replace('/dashboard')
    }
  }, [user, isLoaded, router])

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    )
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex flex-1 min-h-screen flex-col md:flex-row">
        {/* Left: Hero Section */}
        <div
          className="flex flex-col justify-center items-center md:items-start px-4 md:px-12 py-8 md:py-16 min-h-[320px] w-full md:w-3/5 lg:w-2/3"
          style={{
            background:
              "linear-gradient(120deg,rgba(30,41,59,0.82) 60%,rgba(40,40,80,0.5)), url('/mkcashbotchway.png') center/cover no-repeat",
          }}
        >
          <div className="max-w-xl w-full bg-black/30 rounded-xl p-4 md:p-8 shadow-lg backdrop-blur-sm mx-auto">
            <div className="mb-2 text-center">
              <div className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg">
                {terminology.church_name || 'Our Church'}
              </div>
              <div className="text-xl md:text-2xl font-extrabold mt-1 text-purple-400 drop-shadow-lg">
                {terminology.app_name || 'MKCAshBotchWay State of the Flock'}
              </div>
            </div>
            <p className="mb-8 text-lg font-medium text-slate-100/90 drop-shadow text-center">
              Manage members, attendance, basontas, regions and services.
            </p>
          </div>
        </div>
        {/* Right: Blurred Glass Section */}
        <div
          className="flex items-center justify-center w-full md:w-2/5 lg:w-1/3 min-h-[320px] border border-white/20 backdrop-blur-2xl"
          style={{
            height: 'auto',
            background:
              'linear-gradient(120deg, #9333eab5 60%, rgba(40, 40, 80, 0.18))',
            boxShadow: 'rgba(30, 41, 59, 0.12) 0px 0px 32px 0px',
            // background:
            //   'linear-gradient(120deg,rgba(89,19,151,0.35) 60%,rgba(40,40,80,0.18))',
            // boxShadow: '0 0 32px 0 rgba(30,41,59,0.12)',
            borderLeft: 'none',
            zIndex: 2,
          }}
        >
          <div className="w-full max-w-xs p-4 md:p-8 rounded-2xl shadow-xl border border-slate-800 bg-slate-900/60 mx-auto">
            <h2 className="text-2xl font-bold mb-2 text-white text-center">
              Welcome
            </h2>
            <p className="mb-6 text-center text-slate-300">
              Sign in to access your dashboard and features
            </p>
            <SignInButton mode="modal">
              <Button className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white mb-2">
                Sign In / Create Account
              </Button>
            </SignInButton>
          </div>
        </div>
      </div>
    </main>
  )
}
