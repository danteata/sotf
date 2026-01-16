import { useEffect } from 'react'
import { useUser, SignInButton } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useTerminology } from '@/hooks/use-terminology'
import { Church, Users, Calendar, TrendingUp } from 'lucide-react'

export default function HomePage() {
    const { user, isLoaded } = useUser()
    const navigate = useNavigate()
    const { terminology } = useTerminology()

    useEffect(() => {
        if (isLoaded && user) {
            navigate('/dashboard', { replace: true })
        }
    }, [user, isLoaded, navigate])

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-screen bg-accent">
                <div className="text-4xl font-black animate-brutal-bounce">Loading...</div>
            </div>
        )
    }

    return (
        <main className="min-h-screen bg-background relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-20 left-10 w-64 h-64 bg-primary opacity-10 rotate-12 rounded-brutal"></div>
            <div className="absolute bottom-32 right-16 w-80 h-80 bg-secondary opacity-10 -rotate-6 rounded-brutal"></div>
            <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-accent opacity-10 rotate-45 rounded-brutal"></div>

            <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    {/* Left: Hero Content */}
                    <div className="space-y-8">
                        <div className="inline-block">
                            <div className="bg-accent text-accent-foreground px-6 py-2 rounded-brutal border-4 border-black dark:border-white shadow-brutal-md font-black text-sm uppercase tracking-wider">
                                ⚡ Church Management System
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-5xl md:text-7xl font-black leading-tight">
                                <span className="inline-block bg-primary text-primary-foreground px-4 py-2 -rotate-1 border-4 border-black dark:border-white shadow-brutal-lg">
                                    {terminology.church_name || 'Our Church'}
                                </span>
                            </h1>
                            <h2 className="text-3xl md:text-4xl font-bold text-primary">
                                {terminology.app_name || 'State of the Flock'}
                            </h2>
                        </div>

                        <p className="text-xl md:text-2xl font-medium text-foreground leading-relaxed">
                            Manage members, attendance, ministries, regions and services with a system built for <span className="bg-secondary text-secondary-foreground px-2 py-1 font-black">modern churches</span>.
                        </p>

                        {/* Feature Cards */}
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            {[
                                { icon: Users, label: 'Members', color: 'bg-primary' },
                                { icon: Calendar, label: 'Events', color: 'bg-secondary' },
                                { icon: Church, label: 'Ministries', color: 'bg-accent' },
                                { icon: TrendingUp, label: 'Analytics', color: 'bg-success' }
                            ].map((feature, idx) => (
                                <div
                                    key={idx}
                                    className={`${feature.color} text-white p-4 rounded-brutal border-4 border-black dark:border-white shadow-brutal-md hover:shadow-brutal-lg hover:-translate-y-1 transition-all duration-150 cursor-pointer`}
                                >
                                    <feature.icon className="w-8 h-8 mb-2" />
                                    <div className="font-black text-sm uppercase">{feature.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Sign In Card */}
                    <div className="flex items-center justify-center">
                        <div className="w-full max-w-md bg-background border-6 border-black dark:border-white rounded-brutal shadow-brutal-xl p-8 space-y-6 transform hover:rotate-1 transition-transform duration-150">
                            <div className="text-center space-y-2">
                                <div className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-brutal border-4 border-black dark:border-white shadow-brutal-sm rotate-[-2deg] font-black text-2xl mb-4">
                                    Welcome! 👋
                                </div>
                                <h2 className="text-3xl font-black text-foreground">
                                    Get Started
                                </h2>
                                <p className="text-lg font-medium text-muted-foreground">
                                    Sign in to access your dashboard
                                </p>
                            </div>

                            <div className="space-y-4">
                                <SignInButton mode="modal">
                                    <Button
                                        size="lg"
                                        className="w-full text-lg"
                                        variant="default"
                                    >
                                        Sign In / Sign Up
                                    </Button>
                                </SignInButton>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t-4 border-black dark:border-white"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-4 bg-background font-bold text-muted-foreground uppercase">
                                            Features
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3 text-sm font-medium">
                                    {[
                                        '✓ Real-time attendance tracking',
                                        '✓ Member management & profiles',
                                        '✓ Event scheduling & notifications',
                                        '✓ Financial reporting & analytics'
                                    ].map((feature, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-foreground">
                                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                                            {feature}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom CTA */}
                <div className="mt-20 text-center">
                    <div className="inline-block bg-secondary text-secondary-foreground px-8 py-4 rounded-brutal border-4 border-black dark:border-white shadow-brutal-lg font-black text-xl rotate-[-1deg] hover:rotate-0 transition-transform">
                        Built with ❤️ for Ministry Excellence
                    </div>
                </div>
            </div>
        </main>
    )
}
