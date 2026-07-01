import { useEffect, useState } from 'react'
import { useUser, SignInButton } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
    Church,
    Users,
    Calendar,
    DollarSign,
    Mail,
    UsersRound,
    BarChart3,
    CheckCircle,
    ChevronDown,
    ShieldCheck,
} from 'lucide-react'

const QUICK_FEATURES = [
    { icon: Users, title: 'Members', desc: 'Track attendance, manage families, build relationships.' },
    { icon: Calendar, title: 'Events', desc: 'Schedule services, coordinate volunteers, send reminders.' },
    { icon: Mail, title: 'Communication', desc: 'Email, SMS, and push notifications for your congregation.' },
    { icon: DollarSign, title: 'Giving', desc: 'Accept tithes and offerings with secure online giving.' },
]

const FEATURES = [
    {
        icon: Users,
        title: 'Member Management',
        desc: "Know your flock better. Track attendance, manage profiles, organize families, and build meaningful relationships with everyone in your congregation.",
    },
    {
        icon: Calendar,
        title: 'Event Planning',
        desc: 'From Sunday services to midweek Bible studies, plan every event with ease. Coordinate volunteers, send automated reminders, and never miss a detail.',
    },
    {
        icon: DollarSign,
        title: 'Online Giving',
        desc: 'Make giving simple. Accept tithes and offerings online with secure payments, recurring giving, and transparent financial reports.',
    },
    {
        icon: Mail,
        title: 'Communication Hub',
        desc: 'Reach your whole congregation instantly. Send targeted emails, texts, and app notifications to any group — from youth ministry to elder board.',
    },
    {
        icon: UsersRound,
        title: 'Small Groups',
        desc: 'Deepen discipleship through thriving small groups. Manage life groups, Bible studies, and prayer circles with easy scheduling and engagement tracking.',
    },
    {
        icon: BarChart3,
        title: 'Analytics & Insights',
        desc: 'Lead with wisdom. See attendance trends, giving patterns, and engagement at a glance to make informed decisions for your church.',
    },
]

const BETA_BENEFITS = [
    { title: 'Free access during beta', desc: '3–6 months of full access at no cost.' },
    { title: 'Priority feature requests', desc: 'Your needs shape our roadmap directly.' },
    { title: 'Direct access to founders', desc: 'Personal support from our founding team.' },
    { title: '50% off for life', desc: 'A locked-in discount when we officially launch.' },
]

const FAQS = [
    {
        q: 'How quickly can we get started?',
        a: "Most churches are up and running in under 30 minutes. We'll help you import your member data, set up your first event, and send your first message on day one — plus free onboarding calls to get you started right.",
    },
    {
        q: "Is my congregation's data secure?",
        a: "Absolutely. We use bank-level encryption to protect your members' information. Your data is backed up daily and we're fully compliant with data-protection regulations. You own your data — we never share or sell it.",
    },
    {
        q: 'Can it integrate with our existing tools?',
        a: 'Yes. We integrate with popular church tools including Planning Center, Mailchimp, and QuickBooks, and offer CSV import/export so you can move data in and out easily.',
    },
    {
        q: 'What kind of support do you offer?',
        a: "Every church gets email support, thorough documentation, and video tutorials. During beta, you'll also get direct access to our founding team.",
    },
    {
        q: 'Is there a mobile app for our members?',
        a: 'Yes. Members can view events, register for services, give online, and stay connected with their small groups from our iOS and Android apps.',
    },
    {
        q: 'What size church is this designed for?',
        a: 'Floc works for churches of all sizes — from plants with 50 members to congregations of 1,000+. Pricing scales with your church, so you only pay for what you need.',
    },
]

export default function HomePage() {
    const { user, isLoaded } = useUser()
    const navigate = useNavigate()
    const [activeFaq, setActiveFaq] = useState<number | null>(null)

    const toggleFaq = (index: number) => setActiveFaq(activeFaq === index ? null : index)

    useEffect(() => {
        if (isLoaded && user) {
            navigate('/dashboard', { replace: true })
        }
    }, [user, isLoaded, navigate])

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-muted border-t-primary rounded-full animate-spin" />
                    <p className="text-muted-foreground text-sm">Loading…</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            {/* Navigation */}
            <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur">
                <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                            <Church className="h-4 w-4" />
                        </div>
                        <span className="text-lg font-semibold tracking-tight">Floc</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-8 text-sm">
                        <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
                        <a href="#beta" className="text-muted-foreground hover:text-foreground transition-colors">Beta program</a>
                        <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
                    </nav>
                    <SignInButton mode="modal">
                        <Button size="sm">Sign in</Button>
                    </SignInButton>
                </div>
            </header>

            {/* Hero */}
            <section className="relative overflow-hidden border-b border-border/70">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                <div className="max-w-3xl mx-auto text-center px-6 py-24 lg:py-28">
                    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Now in beta
                    </div>
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1]">
                        Spend less time on admin,<br className="hidden sm:block" /> more time on ministry.
                    </h1>
                    <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                        Floc gives your church the tools to grow your congregation, deepen discipleship,
                        and simplify management — all in one place.
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <SignInButton mode="modal">
                            <Button size="lg" className="px-8">Get started free</Button>
                        </SignInButton>
                        <a href="#features">
                            <Button size="lg" variant="outline" className="px-8">See how it works</Button>
                        </a>
                    </div>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-primary" /> No credit card required</span>
                        <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-primary" /> Free during beta</span>
                        <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-primary" /> Setup in under 30 minutes</span>
                    </div>
                </div>
            </section>

            {/* Quick features */}
            <div className="max-w-6xl mx-auto px-6 -mt-10 mb-24 relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {QUICK_FEATURES.map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                                <Icon className="h-5 w-5" />
                            </div>
                            <div className="font-medium mb-1">{title}</div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Features */}
            <section id="features" className="py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="max-w-2xl mx-auto text-center mb-14">
                        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
                            Everything your church needs, in one place
                        </h2>
                        <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
                            Powerful ministry tools designed specifically for churches of all sizes.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {FEATURES.map(({ icon: Icon, title, desc }) => (
                            <div
                                key={title}
                                className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
                            >
                                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-semibold tracking-tight mb-2">{title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Beta program */}
            <section id="beta" className="py-24 px-6">
                <div className="max-w-4xl mx-auto rounded-2xl border border-primary/20 bg-primary/[0.03] p-8 md:p-12">
                    <div className="text-center max-w-2xl mx-auto">
                        <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-5">
                            Limited beta access
                        </div>
                        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
                            Join our founding churches program
                        </h2>
                        <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
                            Be among the first 25 churches to help shape the future of Floc, with exclusive
                            benefits and a direct say in the features we build.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
                        {BETA_BENEFITS.map(({ title, desc }) => (
                            <div key={title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-medium text-sm">{title}</div>
                                    <p className="text-sm text-muted-foreground">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 text-center">
                        <SignInButton mode="modal">
                            <Button size="lg" className="px-8">Apply for beta access</Button>
                        </SignInButton>
                        <p className="mt-4 text-sm text-muted-foreground">
                            12 churches already testing · 13 spots remaining
                        </p>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="py-24 px-6">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
                            Questions pastors ask us
                        </h2>
                        <p className="mt-4 text-muted-foreground text-lg">
                            Everything you need to know about Floc.
                        </p>
                    </div>
                    <div className="space-y-3">
                        {FAQS.map((faq, i) => (
                            <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                                <button
                                    onClick={() => toggleFaq(i)}
                                    className="w-full text-left px-5 py-4 flex justify-between items-center gap-4"
                                >
                                    <span className="font-medium">{faq.q}</span>
                                    <ChevronDown
                                        className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${activeFaq === i ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                {activeFaq === i && (
                                    <div className="px-5 pb-5 -mt-1 text-sm text-muted-foreground leading-relaxed">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-24 px-6 border-t border-border/70">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
                        Ready to simplify your church management?
                    </h2>
                    <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
                        Join the first wave of churches spending less time on admin and more on ministry.
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <SignInButton mode="modal">
                            <Button size="lg" className="px-8">Apply for beta access</Button>
                        </SignInButton>
                        <Button size="lg" variant="outline" className="px-8">Schedule a 15-min demo</Button>
                    </div>
                    <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        No credit card required · Cancel anytime
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border/70 py-14 px-6">
                <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
                    <div>
                        <h4 className="text-sm font-semibold mb-4">Product</h4>
                        <div className="space-y-2.5 text-sm">
                            <a href="#features" className="block text-muted-foreground hover:text-foreground transition-colors">Features</a>
                            <a href="#beta" className="block text-muted-foreground hover:text-foreground transition-colors">Beta program</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold mb-4">Resources</h4>
                        <div className="space-y-2.5 text-sm">
                            <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Documentation</a>
                            <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Support</a>
                            <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Contact us</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold mb-4">Company</h4>
                        <div className="space-y-2.5 text-sm">
                            <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">About</a>
                            <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Our story</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold mb-4">Legal</h4>
                        <div className="space-y-2.5 text-sm">
                            <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Privacy policy</a>
                            <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Terms of service</a>
                        </div>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                            <Church className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-medium text-foreground">Floc</span>
                    </div>
                    <p>© 2026 Floc. Built for churches.</p>
                </div>
            </footer>
        </div>
    )
}
