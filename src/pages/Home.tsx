import { useEffect, useState } from 'react'
import { useUser, SignInButton } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
    Church,
    Calendar,
    BarChart3,
    Check,
    Plus,
    ShieldCheck,
    Crown,
    ArrowRight,
    Share2,
    UserCog,
    Layers,
    QrCode,
    Users,
    DollarSign,
} from 'lucide-react'

const CREAM = '#FAF7F1'
const CREAM_ALT = '#F4EEE4'
const INK = '#221D16'

const SUNDAY_TIMELINE = [
    {
        time: '8:45 AM',
        icon: QrCode,
        title: 'Check-in opens',
        detail: 'Members scan at the door — no register, no queue.',
    },
    {
        time: '9:15 AM',
        icon: Users,
        title: '412 checked in · 23 first-timers',
        detail: '94% self-served through the QR link.',
    },
    {
        time: '11:20 AM',
        icon: DollarSign,
        title: '₵20,770 recorded',
        detail: 'Tithes, offering and special giving tallied.',
    },
    {
        time: 'Monday',
        icon: Share2,
        title: 'Follow-up list shared',
        detail: '6 members flagged, sent to 3 volunteers.',
    },
]

const HOW_IT_WORKS = [
    {
        title: 'Check-in logs itself',
        desc: 'QR scan, kiosk tap, or self-service — attendance is recorded the moment someone walks in.',
    },
    {
        title: 'Patterns surface on their own',
        desc: 'Consecutive absences and 60-day inactivity get flagged automatically, no spreadsheet required.',
    },
    {
        title: 'Follow-up is one link away',
        desc: 'Share a secure list with your care team. They call, you stay focused on the parts only you can do.',
    },
]

const FEATURE_ROWS = [
    {
        kicker: 'Care & follow-up',
        title: 'Know who’s drifting, without keeping score in your head',
        desc: 'Floc quietly watches attendance patterns so you don’t have to hold it all in your head — then makes reaching out as easy as sharing a link.',
        bullets: [
            'Auto-detect members inactive 60+ days',
            'Consecutive-absence tracking, per event',
            'Shareable follow-up links — no login for volunteers',
            'Demographics and retention analytics',
        ],
        visual: 'members',
        visualSide: 'left' as const,
    },
    {
        kicker: 'Attendance',
        title: 'Check-in that just works',
        desc: 'QR self-check-in, kiosk mode for stewards, geofencing, lateness tracking, and a full audit trail. Members scan, you get data.',
        bullets: [
            'Live headcount as members check in',
            'Geofence enforcement (strict or soft)',
            'Automatic lateness detection',
            'Kiosk mode for door stewards',
        ],
        visual: 'qr',
        visualSide: 'right' as const,
    },
    {
        kicker: 'Financial',
        title: 'Every cedi, accounted for',
        desc: 'Track tithes, offerings and expenses per service. Split by cash and electronic, attach receipts, and generate reports your finance team will love.',
        bullets: [
            'Per-service income breakdown',
            'Cash vs electronic tracking',
            'Expense management with receipts',
            'CSV export for accountants',
        ],
        visual: 'financial',
        visualSide: 'left' as const,
    },
]

const SECONDARY_FEATURES = [
    {
        icon: Layers,
        title: 'Groups and Units',
        desc: 'Hierarchical org structure with departments, zones, and small groups. Assign leaders, manage membership, and visualize your church’s shape.',
    },
    {
        icon: Calendar,
        title: 'Events',
        desc: 'Event catalog with custom types, default times, grace windows, and unit scoping. The backbone of your attendance system.',
    },
    {
        icon: BarChart3,
        title: 'Reports and Insights',
        desc: 'Weekly and monthly trends, event comparisons, demographic breakdowns, retention rates, and exportable data for your leadership meetings.',
    },
    {
        icon: UserCog,
        title: 'Member Portal',
        desc: 'Self-service for your members: check attendance history, view profile details, and link their account. No admin needed.',
    },
    {
        icon: ShieldCheck,
        title: 'Roles and Permissions',
        desc: 'Six-level role hierarchy from super admin to member. Unit admins only see what they manage. Every change is audit-logged.',
    },
    {
        icon: Share2,
        title: 'Follow-up Sharing',
        desc: 'Generate secure public links for absent-member lists. Volunteers can call and follow up without needing an app account.',
    },
]

const PRICING = [
    {
        name: 'Free',
        priceUsd: '$0',
        priceGhs: '₵0',
        period: '/month',
        description: 'Everything a growing church needs to get organized and start tracking.',
        features: ['Up to 200 members', 'Attendance tracking', 'Basic financial records', '1 organization', 'QR check-in'],
        cta: 'Get started free',
        highlight: false,
    },
    {
        name: 'Pro',
        priceUsd: '$10',
        priceGhs: '₵150',
        period: '/month',
        description: 'For churches that want the full picture and room to grow.',
        features: [
            'Unlimited members and units',
            'Advanced reports and CSV exports',
            'Geofenced check-in',
            'Priority support',
            'Early access to new features',
            'Full audit trail',
        ],
        cta: 'Choose Pro',
        highlight: true,
    },
]

const FAQS = [
    {
        q: 'How quickly can we get started?',
        a: "Most churches are up and running in under 30 minutes. Import your member data, set up your first service, and you're ready — no long onboarding required.",
    },
    {
        q: "Is my congregation's data secure?",
        a: 'Yes. Data is encrypted in transit and at rest, backed up continuously, and never shared or sold. You own your data and can export it at any time.',
    },
    {
        q: 'Can I bring my existing data?',
        a: 'Of course. Import members and units via CSV, or paste a spreadsheet. We keep imports simple and reversible.',
    },
    {
        q: 'How does pricing work?',
        a: 'Start free. When you need more — unlimited members, advanced reports, and priority support — upgrade to Pro for ₵150/month per organization. No setup fees, cancel anytime.',
    },
    {
        q: 'Do members need an account?',
        a: 'No. Admins manage the church; members can check in via QR or portal without a separate login. Invite-only access keeps your data safe.',
    },
    {
        q: 'What size church is Floc for?',
        a: 'From church plants of 50 to congregations of 1,000+. Pricing scales with your needs, so you only pay for what you use.',
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
            <div className="flex items-center justify-center min-h-screen" style={{ background: CREAM }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-black/10 border-t-primary rounded-full animate-spin" />
                    <p className="text-neutral-500 text-sm">Loading…</p>
                </div>
            </div>
        )
    }

    return (
        <div
            className="min-h-screen font-sans antialiased"
            style={{ background: CREAM, color: INK }}
        >
            {/* Navigation */}
            <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-[#FAF7F1]/80 backdrop-blur-md">
                <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
                    <a href="#top" className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                            <Church className="h-4 w-4" />
                        </div>
                        <span className="text-lg font-semibold tracking-tight font-serif">Floc</span>
                    </a>
                    <nav className="hidden md:flex items-center gap-8 text-sm">
                        <a href="#features" className="text-neutral-600 hover:text-black transition-colors">Features</a>
                        <a href="#pricing" className="text-neutral-600 hover:text-black transition-colors">Pricing</a>
                        <a href="#faq" className="text-neutral-600 hover:text-black transition-colors">FAQ</a>
                    </nav>
                    <div className="flex items-center gap-2">
                        <SignInButton mode="modal">
                            <Button size="sm" variant="ghost" className="hover:bg-black/5">Sign in</Button>
                        </SignInButton>
                        <SignInButton mode="modal">
                            <Button size="sm">Get started</Button>
                        </SignInButton>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section id="top" className="relative overflow-hidden">
                <div
                    className="absolute inset-0 -z-10"
                    style={{
                        background:
                            'radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--primary) 10%, transparent), transparent 70%)',
                    }}
                    aria-hidden
                />
                <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 lg:pt-28">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        <div>
                            <p className="text-sm font-medium text-primary mb-4">
                                For churches that outgrew spreadsheets
                            </p>
                            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight leading-[1.08]">
                                By the time service ends, everything&apos;s already sorted.
                            </h1>
                            <p className="mt-6 text-lg text-neutral-600 leading-relaxed max-w-xl">
                                Floc runs quietly behind your Sunday — checking members in, tallying the
                                offering, and flagging who needs a follow-up call. So your team can focus on
                                people, not paperwork.
                            </p>
                            <div className="mt-8 flex flex-col sm:flex-row items-start gap-3">
                                <SignInButton mode="modal">
                                    <Button size="lg" className="px-8 h-12 text-base">
                                        Get started free
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </SignInButton>
                                <a href="#features">
                                    <Button size="lg" variant="outline" className="px-8 h-12 text-base bg-white border-black/10 hover:bg-black/[0.03]">
                                        See how it works
                                    </Button>
                                </a>
                            </div>
                            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-500">
                                <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Free plan forever</span>
                                <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> No credit card needed</span>
                                <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Set up in 5 minutes</span>
                            </div>
                        </div>

                        <SundayTimelineCard />
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section id="features" className="pt-16 pb-4 px-6 border-t border-black/[0.06]">
                <div className="max-w-2xl mx-auto text-center">
                    <p className="text-xs font-semibold tracking-[0.15em] text-primary uppercase mb-3">
                        How it works
                    </p>
                    <h2 className="font-serif text-3xl md:text-5xl font-medium tracking-tight leading-tight">
                        One church, one place
                    </h2>
                    <p className="mt-5 text-neutral-600 text-lg leading-relaxed">
                        Floc connects every Sunday touchpoint so information doesn&apos;t end up scattered
                        across five different notebooks.
                    </p>
                </div>
                <div className="max-w-5xl mx-auto mt-16 relative grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="hidden md:block absolute top-6 left-[16.67%] right-[16.67%] h-px bg-black/10" aria-hidden />
                    {HOW_IT_WORKS.map((step, i) => (
                        <div key={step.title} className="relative text-center">
                            <div className="relative z-10 mx-auto h-12 w-12 rounded-full bg-white border border-black/10 flex items-center justify-center font-serif text-lg">
                                0{i + 1}
                            </div>
                            <h3 className="mt-5 font-semibold tracking-tight">{step.title}</h3>
                            <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Feature rows */}
            <section className="py-16 px-6">
                <div className="max-w-6xl mx-auto space-y-24">
                    {FEATURE_ROWS.map((row) => (
                        <div
                            key={row.kicker}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center"
                        >
                            <div className={row.visualSide === 'right' ? 'lg:order-2' : ''}>
                                <FeatureVisual kind={row.visual} />
                            </div>
                            <div className={row.visualSide === 'right' ? 'lg:order-1' : ''}>
                                <p className="text-xs font-semibold tracking-[0.15em] text-primary uppercase mb-3">
                                    {row.kicker}
                                </p>
                                <h3 className="font-serif text-2xl md:text-3xl font-medium tracking-tight">
                                    {row.title}
                                </h3>
                                <p className="mt-4 text-neutral-600 leading-relaxed">{row.desc}</p>
                                <ul className="mt-6 space-y-3">
                                    {row.bullets.map((b) => (
                                        <li key={b} className="flex items-start gap-2.5 text-sm">
                                            <span className="mt-0.5 h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                <Check className="h-2.5 w-2.5" />
                                            </span>
                                            <span>{b}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Secondary features grid */}
            <section className="py-24 px-6" style={{ background: CREAM_ALT }}>
                <div className="max-w-6xl mx-auto">
                    <div className="max-w-2xl mx-auto text-center mb-14">
                        <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">
                            And that&apos;s just the start
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {SECONDARY_FEATURES.map(({ icon: Icon, title, desc }) => (
                            <div
                                key={title}
                                className="rounded-2xl border border-black/[0.06] bg-white p-6 transition-all hover:border-primary/30 hover:shadow-sm"
                            >
                                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                                    <Icon className="h-4 w-4" />
                                </div>
                                <h3 className="font-semibold tracking-tight mb-2">{title}</h3>
                                <p className="text-sm text-neutral-600 leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="max-w-2xl mx-auto text-center mb-14">
                        <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">
                            Simple, honest pricing
                        </h2>
                        <p className="mt-4 text-neutral-600 text-lg leading-relaxed">
                            Start free, forever. Upgrade to Pro when you're ready for more — no setup fees,
                            cancel anytime.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto items-stretch">
                        {PRICING.map((plan) => (
                            <div
                                key={plan.name}
                                className={`relative flex flex-col rounded-3xl border p-8 bg-white ${
                                    plan.highlight
                                        ? 'border-primary/50 shadow-xl shadow-primary/5'
                                        : 'border-black/[0.08]'
                                }`}
                            >
                                {plan.highlight && (
                                    <span className="absolute -top-3 right-8 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                                        <Crown className="h-3.5 w-3.5" /> Most popular
                                    </span>
                                )}
                                <p className="text-xs font-semibold tracking-[0.15em] text-neutral-400 uppercase">{plan.name}</p>
                                <div className="flex items-baseline gap-1 mt-3">
                                    <span className="font-serif text-5xl font-medium tracking-tight">{plan.priceUsd}</span>
                                    <span className="text-sm text-neutral-500">{plan.period}</span>
                                </div>
                                <p className="mt-1 text-xs text-neutral-400">≈ {plan.priceGhs} GHS</p>
                                <p className="mt-3 text-sm text-neutral-600">{plan.description}</p>
                                <ul className="mt-6 space-y-3 text-sm flex-1">
                                    {plan.features.map((f) => (
                                        <li key={f} className="flex items-start gap-2.5">
                                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                                <SignInButton mode="modal">
                                    <Button
                                        size="lg"
                                        className={`w-full mt-8 h-12 ${!plan.highlight ? 'bg-white text-black border border-black/15 hover:bg-black/[0.03]' : ''}`}
                                        variant={plan.highlight ? 'default' : 'outline'}
                                    >
                                        {plan.cta}
                                    </Button>
                                </SignInButton>
                            </div>
                        ))}
                    </div>
                    <p className="mt-8 text-center text-sm text-neutral-500">
                        Billed in Ghana cedis (GHS). USD shown for reference — rates may vary.
                    </p>
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="py-24 px-6">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">
                            Questions, answered
                        </h2>
                        <p className="mt-4 text-neutral-600 text-lg">
                            Everything you need to know about Floc.
                        </p>
                    </div>
                    <div className="space-y-3">
                        {FAQS.map((faq, i) => (
                            <div key={i} className="rounded-xl border border-black/[0.08] bg-white overflow-hidden">
                                <button
                                    onClick={() => toggleFaq(i)}
                                    className="w-full text-left px-5 py-4 flex justify-between items-center gap-4 hover:bg-black/[0.02] transition-colors"
                                >
                                    <span className="font-medium">{faq.q}</span>
                                    <Plus
                                        className={`h-4 w-4 text-primary shrink-0 transition-transform duration-200 ${activeFaq === i ? 'rotate-45' : ''}`}
                                    />
                                </button>
                                {activeFaq === i && (
                                    <div className="px-5 pb-5 -mt-1 text-sm text-neutral-600 leading-relaxed">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-24 px-6">
                <div
                    className="max-w-5xl mx-auto rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
                    style={{ background: INK }}
                >
                    <div
                        className="absolute inset-0 -z-10"
                        style={{
                            background:
                                'radial-gradient(60% 60% at 50% 0%, color-mix(in oklch, var(--primary) 30%, transparent), transparent 70%)',
                        }}
                        aria-hidden
                    />
                    <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-white">
                        Ready to simplify your church management?
                    </h2>
                    <p className="mt-4 text-white/60 text-lg leading-relaxed max-w-xl mx-auto">
                        Join churches spending less time on admin and more on ministry. Start free —
                        upgrade to Pro whenever you like.
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <SignInButton mode="modal">
                            <Button size="lg" className="px-8 h-12 bg-white text-black hover:bg-white/90">
                                Get started free
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </SignInButton>
                        <a href="#pricing">
                            <Button size="lg" variant="outline" className="px-8 h-12 border-white/25 bg-transparent text-white hover:bg-white/10">
                                See pricing
                            </Button>
                        </a>
                    </div>
                    <div className="mt-6 flex items-center justify-center gap-2 text-sm text-white/50">
                        No credit card required · Cancel anytime
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-black/[0.06] py-14 px-6">
                <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-10">
                    <div className="col-span-2 md:col-span-1 pr-4">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="h-6 w-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                                <Church className="h-3.5 w-3.5" />
                            </div>
                            <span className="font-serif font-medium">Floc</span>
                        </div>
                        <p className="text-sm text-neutral-500 leading-relaxed">
                            Church management software built for teams that care more about people than paperwork.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold mb-4">Product</h4>
                        <div className="space-y-2.5 text-sm">
                            <a href="#features" className="block text-neutral-500 hover:text-black transition-colors">Features</a>
                            <a href="#pricing" className="block text-neutral-500 hover:text-black transition-colors">Pricing</a>
                            <a href="#faq" className="block text-neutral-500 hover:text-black transition-colors">FAQ</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold mb-4">Resources</h4>
                        <div className="space-y-2.5 text-sm">
                            <a href="#" className="block text-neutral-500 hover:text-black transition-colors">Documentation</a>
                            <a href="#" className="block text-neutral-500 hover:text-black transition-colors">Support</a>
                            <a href="#" className="block text-neutral-500 hover:text-black transition-colors">Contact us</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold mb-4">Company</h4>
                        <div className="space-y-2.5 text-sm">
                            <a href="#" className="block text-neutral-500 hover:text-black transition-colors">About</a>
                            <a href="#" className="block text-neutral-500 hover:text-black transition-colors">Our story</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold mb-4">Legal</h4>
                        <div className="space-y-2.5 text-sm">
                            <a href="#" className="block text-neutral-500 hover:text-black transition-colors">Privacy policy</a>
                            <a href="#" className="block text-neutral-500 hover:text-black transition-colors">Terms of service</a>
                        </div>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-black/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
                    <p>© 2026 Floc. Built for churches.</p>
                    <p>Built with love for churches</p>
                </div>
            </footer>
        </div>
    )
}

/** The hero visual: a running log of one Sunday, end to end. */
function SundayTimelineCard() {
    return (
        <div className="rounded-3xl border border-black/[0.08] bg-white shadow-2xl shadow-black/5 p-6 max-w-md mx-auto lg:mx-0 w-full">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="text-sm font-semibold">Sunday Service</div>
                    <div className="text-xs text-neutral-500">Today&apos;s timeline</div>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
                </span>
            </div>
            <div className="relative">
                <div className="absolute left-3 top-1 bottom-1 w-px bg-black/[0.08]" aria-hidden />
                <div className="space-y-6">
                    {SUNDAY_TIMELINE.map((step) => (
                        <div key={step.title} className="relative flex gap-4">
                            <div className="relative z-10 h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <step.icon className="h-3 w-3" />
                            </div>
                            <div className="flex-1 -mt-0.5">
                                <div className="text-[11px] text-neutral-400 font-medium mb-0.5">{step.time}</div>
                                <div className="text-sm font-semibold leading-snug">{step.title}</div>
                                <div className="text-xs text-neutral-500 mt-0.5">{step.detail}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

/** Alternating section illustrations used in the feature rows. */
function FeatureVisual({ kind }: { kind: string }) {
    if (kind === 'members') {
        const rows = [
            { name: 'Ama Mensah', sub: 'Youth Ministry · Choir', color: 'bg-blue-500', status: 'Active', variant: 'active' },
            { name: 'Kwame Owusu', sub: "Ushering · Men's Fellowship", color: 'bg-rose-500', status: '3 wks absent', variant: 'absent' },
            { name: 'Sarah Adjei', sub: 'First-time visitor', color: 'bg-emerald-500', status: 'Visitor', variant: 'visitor' },
            { name: 'Daniel Boateng', sub: 'Worship Team', color: 'bg-violet-500', status: 'Active', variant: 'active' },
        ]
        const statusStyles: Record<string, string> = {
            active: 'bg-emerald-50 text-emerald-700',
            visitor: 'bg-amber-50 text-amber-700',
            absent: 'bg-red-50 text-red-600',
        }
        return (
            <div className="rounded-2xl border border-black/[0.08] bg-white p-3 shadow-sm">
                <div className="divide-y divide-black/[0.06]">
                    {rows.map((r) => (
                        <div key={r.name} className="flex items-center justify-between px-2 py-3">
                            <div className="flex items-center gap-3">
                                <div className={`h-9 w-9 rounded-full ${r.color} text-white flex items-center justify-center text-xs font-semibold`}>
                                    {r.name.split(' ').map((p) => p.charAt(0)).join('')}
                                </div>
                                <div>
                                    <div className="text-sm font-medium">{r.name}</div>
                                    <div className="text-xs text-neutral-500">{r.sub}</div>
                                </div>
                            </div>
                            <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${statusStyles[r.variant]}`}>
                                {r.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (kind === 'qr') {
        return (
            <div className="rounded-2xl border border-black/[0.08] bg-white p-8 shadow-sm flex flex-col items-center">
                <div className="grid grid-cols-7 gap-1 p-3 rounded-xl bg-black/[0.02]">
                    {Array.from({ length: 49 }).map((_, i) => {
                        const onEdge =
                            (i < 7 || i >= 42 || i % 7 === 0 || i % 7 === 6) &&
                            ((Math.floor(i / 7) < 2 || Math.floor(i / 7) > 4) &&
                                (i % 7 < 2 || i % 7 > 4))
                        const dark = onEdge || (i * 7) % 5 === 0
                        return (
                            <div
                                key={i}
                                className={`h-2.5 w-2.5 rounded-[1px] ${dark ? 'bg-black' : 'bg-transparent'}`}
                            />
                        )
                    })}
                </div>
                <div className="mt-5 flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                    <Check className="h-3.5 w-3.5" /> Checked in successfully
                </div>
                <p className="mt-2 text-xs text-neutral-500">Sunday Service · 9:02 AM · On time</p>
            </div>
        )
    }

    const financials = [
        { label: 'Tithes', value: '₵12,450', pct: 100 },
        { label: 'Offerings', value: '₵8,320', pct: 67 },
        { label: 'Donations', value: '₵4,800', pct: 38 },
        { label: 'Special Offerings', value: '₵2,150', pct: 17 },
    ]
    return (
        <div className="rounded-2xl border border-black/[0.08] bg-white p-6 shadow-sm space-y-5">
            {financials.map((f) => (
                <div key={f.label}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-neutral-600">{f.label}</span>
                        <span className="font-semibold">{f.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/[0.05] overflow-hidden">
                        <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${f.pct}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
}
