import { useEffect, useState } from 'react'
import { useUser, SignInButton } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Church, Users, Calendar, DollarSign, Mail, Layers, CheckCircle, ArrowRight, Sparkles, Zap, Shield, Globe } from 'lucide-react'

export default function HomePage() {
    const { user, isLoaded } = useUser()
    const navigate = useNavigate()
    const [activeFaq, setActiveFaq] = useState<number | null>(null)

    const toggleFaq = (index: number) => {
        setActiveFaq(activeFaq === index ? null : index)
    }

    useEffect(() => {
        if (isLoaded && user) {
            navigate('/dashboard', { replace: true })
        }
    }, [user, isLoaded, navigate])

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-accent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground">Loading your experience...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground overflow-x-hidden font-sans">
            {/* Animated background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-0 left-0 w-full h-full gradient-mesh opacity-50"></div>
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
            </div>

            {/* Navigation */}
            <header className="relative z-20 flex items-center justify-between p-6 lg:px-8 glass border-b border-border/30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center neon-glow">
                        <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-2xl text-gradient">Floc</span>
                </div>
                <nav className="hidden md:flex items-center gap-8">
                    <a href="#features" className="text-muted-foreground hover:text-primary transition-colors duration-300">Features</a>
                    <a href="#beta" className="text-muted-foreground hover:text-primary transition-colors duration-300">Beta Program</a>
                    <a href="#faq" className="text-muted-foreground hover:text-primary transition-colors duration-300">FAQ</a>
                    <SignInButton mode="modal">
                        <Button variant="neon" className="font-bold rounded-lg px-6">
                            Login
                        </Button>
                    </SignInButton>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="relative z-10 text-center py-24 lg:py-32 px-6 lg:px-8">
                <div className="max-w-7xl mx-auto relative">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-8">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-sm text-primary">Now in Beta</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl leading-tight mb-6">
                        <span className="text-foreground">IGNITE YOUR</span><br />
                        <span className="text-gradient neon-text">
                            MINISTRY
                        </span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
                        Spend less time on admin, more time on ministry. Floc gives your church the tools to grow your congregation, deepen discipleship, and simplify church management.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-20">
                        <SignInButton mode="modal">
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-12 py-7 rounded-xl neon-glow transition-all duration-300 hover:-translate-y-1">
                                Get Started Free
                            </Button>
                        </SignInButton>
                        <a href="#features" className="inline-flex items-center justify-center glass text-primary text-lg px-10 py-[1.15rem] border border-primary/30 rounded-xl hover:bg-primary/10 transition-all duration-300">
                            See How It Works
                        </a>
                    </div>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-muted-foreground text-sm">
                        <span className="flex items-center gap-2 text-success">✓ No credit card required</span>
                        <span className="flex items-center gap-2 text-success">✓ Free during beta</span>
                        <span className="flex items-center gap-2 text-success">✓ Setup in under 30 minutes</span>
                    </div>
                </div>
            </section>

            {/* Quick Features Grid */}
            <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 -mt-12 mb-24">
                <div className="glass-card rounded-2xl p-10 border border-border/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="glass rounded-2xl p-6 text-center hover:border-primary/30 transition-all duration-300 hover:-translate-y-2 border border-border/20 hover:neon-glow cursor-pointer group">
                            <CheckCircle className="w-10 h-10 text-primary mx-auto mb-4 transition-transform duration-300 group-hover:scale-110" />
                            <div className="font-bold text-lg mb-2">Members</div>
                            <p className="text-sm text-muted-foreground leading-relaxed">Track attendance, manage families, build relationships</p>
                        </div>
                        <div className="glass rounded-2xl p-6 text-center hover:border-primary/30 transition-all duration-300 hover:-translate-y-2 border border-border/20 hover:neon-glow cursor-pointer group">
                            <Calendar className="w-10 h-10 text-primary mx-auto mb-4 transition-transform duration-300 group-hover:scale-110" />
                            <div className="font-bold text-lg mb-2">Events</div>
                            <p className="text-sm text-muted-foreground leading-relaxed">Schedule services, coordinate volunteers, send reminders</p>
                        </div>
                        <div className="glass rounded-2xl p-6 text-center hover:border-primary/30 transition-all duration-300 hover:-translate-y-2 border border-border/20 hover:neon-glow cursor-pointer group">
                            <Mail className="w-10 h-10 text-primary mx-auto mb-4 transition-transform duration-300 group-hover:scale-110" />
                            <div className="font-bold text-lg mb-2">Communication</div>
                            <p className="text-sm text-muted-foreground leading-relaxed">Email, SMS, and push notifications for your congregation</p>
                        </div>
                        <div className="glass rounded-2xl p-6 text-center hover:border-primary/30 transition-all duration-300 hover:-translate-y-2 border border-border/20 hover:neon-glow cursor-pointer group">
                            <DollarSign className="w-10 h-10 text-primary mx-auto mb-4 transition-transform duration-300 group-hover:scale-110" />
                            <div className="font-bold text-lg mb-2">Giving</div>
                            <p className="text-sm text-muted-foreground leading-relaxed">Accept tithes and offerings with secure online giving</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Features Section */}
            <section id="features" className="relative z-10 py-32 px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-4xl md:text-5xl text-center mb-6 text-gradient leading-tight">
                        EVERYTHING YOUR CHURCH<br />NEEDS IN ONE PLACE
                    </h2>
                    <p className="text-xl text-muted-foreground text-center mb-20 max-w-2xl mx-auto leading-relaxed">
                        Powerful ministry tools designed specifically for churches of all sizes
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="glass-card rounded-2xl p-8 border border-border/20 hover:border-primary/30 transition-all duration-300 hover:neon-glow hover:-translate-y-2">
                            <h3 className="text-2xl mb-4">Member Management</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Know your flock better. Track attendance, manage member profiles, organize families, and build meaningful relationships with every person in your congregation.
                            </p>
                        </div>
                        <div className="glass-card rounded-2xl p-8 border border-border/20 hover:border-primary/30 transition-all duration-300 hover:neon-glow hover:-translate-y-2">
                            <h3 className="text-2xl mb-4">Event Planning</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                From Sunday services to Wednesday night Bible studies, plan every church event with ease. Coordinate volunteers, send automated reminders, and never miss a detail.
                            </p>
                        </div>
                        <div className="glass-card rounded-2xl p-8 border border-border/20 hover:border-primary/30 transition-all duration-300 hover:neon-glow hover:-translate-y-2">
                            <h3 className="text-2xl mb-4">Online Giving</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Make giving simple for your members. Accept tithes and offerings online with secure payment processing, recurring giving options, and transparent financial reports.
                            </p>
                        </div>
                        <div className="glass-card rounded-2xl p-8 border border-border/20 hover:border-primary/30 transition-all duration-300 hover:neon-glow hover:-translate-y-2">
                            <h3 className="text-2xl mb-4">Communication Hub</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Reach your entire congregation instantly. Send targeted emails, text messages, and app notifications to specific groups—from youth ministry to elder board.
                            </p>
                        </div>
                        <div className="glass-card rounded-2xl p-8 border border-border/20 hover:border-primary/30 transition-all duration-300 hover:neon-glow hover:-translate-y-2">
                            <h3 className="text-2xl mb-4">Small Groups</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Deepen discipleship through thriving small groups. Manage life groups, Bible studies, and prayer circles with easy scheduling, discussion tools, and member engagement tracking.
                            </p>
                        </div>
                        <div className="glass-card rounded-2xl p-8 border border-border/20 hover:border-primary/30 transition-all duration-300 hover:neon-glow hover:-translate-y-2">
                            <h3 className="text-2xl mb-4">Analytics & Insights</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Lead with wisdom. Get clear insights on attendance trends, giving patterns, member engagement, and ministry health to make informed decisions for your church's future.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Beta Program Section */}
            <section id="beta" className="relative z-10 py-32 px-6 lg:px-8">
                <div className="container max-w-5xl mx-auto">
                    <div className="glass-card border border-primary/30 rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
                        <div className="absolute inset-0 gradient-mesh opacity-30"></div>
                        <div className="relative z-10">
                            <div className="inline-block bg-primary/20 text-primary text-xs px-4 py-2 rounded-full tracking-widest mb-6 border border-primary/30">
                                Limited Beta Access
                            </div>
                            <h2 className="text-4xl md:text-5xl mb-6 leading-tight">
                                JOIN OUR FOUNDING<br />CHURCHES PROGRAM
                            </h2>
                            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                                Be among the first 25 churches to help shape the future of Floc. Get exclusive benefits and influence the features we build.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 text-left">
                                <div className="flex items-start gap-4">
                                    <div className="bg-primary/20 p-2 rounded-lg">
                                        <CheckCircle className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <strong className="block mb-1">Free Access During Beta</strong>
                                        <span className="text-muted-foreground text-sm">3-6 months of full access at no cost</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="bg-primary/20 p-2 rounded-lg">
                                        <CheckCircle className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <strong className="block mb-1">Priority Feature Requests</strong>
                                        <span className="text-muted-foreground text-sm">Your needs shape our roadmap directly</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="bg-primary/20 p-2 rounded-lg">
                                        <CheckCircle className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <strong className="block mb-1">Direct Access to Founders</strong>
                                        <span className="text-muted-foreground text-sm">Personal support from our founding team</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="bg-primary/20 p-2 rounded-lg">
                                        <CheckCircle className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <strong className="block mb-1">50% Off for Life</strong>
                                        <span className="text-muted-foreground text-sm">Locked-in discount when we officially launch</span>
                                    </div>
                                </div>
                            </div>

                            <SignInButton mode="modal">
                                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-12 py-7 rounded-xl neon-glow transition-all duration-300 transform hover:-translate-y-1">
                                    Apply for Beta Access
                                </Button>
                            </SignInButton>
                            <p className="mt-6 text-muted-foreground">
                                12 churches already testing • 13 spots remaining
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="relative z-10 py-32 px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl md:text-5xl text-center mb-6 text-gradient leading-tight">
                        Questions Pastors<br />Ask Us
                    </h2>
                    <p className="text-xl text-muted-foreground text-center mb-20 max-w-2xl mx-auto leading-relaxed">
                        Everything you need to know about Floc
                    </p>

                    <div className="space-y-4">
                        {[
                            {
                                q: "How quickly can we get started?",
                                a: "Most churches are up and running in under 30 minutes. We'll help you import your member data, set up your first event, and send your first communication on day one. Plus, we offer free onboarding calls to get you started right."
                            },
                            {
                                q: "Is my congregation's data secure?",
                                a: "Absolutely. We use bank-level encryption to protect your members' information. Your data is backed up daily, and we're fully compliant with data protection regulations. You own your data—we never share or sell it."
                            },
                            {
                                q: "Can it integrate with our existing tools?",
                                a: "Yes! We integrate with popular church tools including Planning Center, Mailchimp, QuickBooks, and more. We also offer CSV import/export so you can easily move data in and out."
                            },
                            {
                                q: "What kind of support do you offer?",
                                a: "Every church gets email support, comprehensive documentation, and video tutorials. We're building a community of church admins to share best practices. During beta, you'll get direct access to our founding team."
                            },
                            {
                                q: "Is there a mobile app for our members?",
                                a: "Yes! Members can access everything through our mobile app—view events, register for services, give online, and stay connected with their small groups. Available on iOS and Android."
                            },
                            {
                                q: "What size church is this designed for?",
                                a: "Floc works for churches of all sizes—from church plants with 50 members to established congregations with 1,000+. Our pricing scales with your church, so you only pay for what you need."
                            },
                            {
                                q: "Do we need technical expertise?",
                                a: "Not at all! The platform is designed for church staff and volunteers, not IT professionals. If you can use email, you can use Floc. And our support team is always here to help."
                            }
                        ].map((faq, i) => (
                            <div key={i} className="glass rounded-xl overflow-hidden transition-all duration-300 hover:border-primary/30 border border-border/20">
                                <button
                                    onClick={() => toggleFaq(i)}
                                    className="w-full text-left p-6 flex justify-between items-center group"
                                >
                                    <span className="font-bold text-lg group-hover:text-primary transition-colors">{faq.q}</span>
                                    <ArrowRight className={`w-5 h-5 text-primary transition-transform duration-300 ${activeFaq === i ? 'rotate-90' : ''}`} />
                                </button>
                                <div className={`px-6 pb-6 text-muted-foreground leading-relaxed transition-all duration-300 ${activeFaq === i ? 'block' : 'hidden'}`}>
                                    {faq.a}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA Section */}
            <section className="relative z-10 py-32 px-6 lg:px-8 text-center">
                <div className="container max-w-4xl mx-auto">
                    <h2 className="text-4xl md:text-5xl text-gradient mb-6 leading-tight">
                        Ready to simplify your<br />church management?
                    </h2>
                    <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                        Join the first wave of churches experiencing less admin stress and more ministry impact.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <SignInButton mode="modal">
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-12 py-7 rounded-xl neon-glow transition-all duration-300 transform hover:-translate-y-1">
                                Apply for Beta Access
                            </Button>
                        </SignInButton>
                        <Button variant="neon" className="font-bold text-lg px-10 py-7 rounded-xl">
                            Schedule a 15-Min Demo
                        </Button>
                    </div>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-muted-foreground text-sm">
                        <span className="flex items-center gap-2 text-success">✓ No credit card required</span>
                        <span className="flex items-center gap-2 text-success">✓ Free setup assistance</span>
                        <span className="flex items-center gap-2 text-success">✓ Cancel anytime</span>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 glass border-t border-border/30 py-20 px-6 lg:px-8">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div>
                        <h4 className="text-primary tracking-widest text-sm mb-6">Product</h4>
                        <div className="space-y-3">
                            <a href="#features" className="block text-muted-foreground hover:text-primary transition-colors">Features</a>
                            <a href="#beta" className="block text-muted-foreground hover:text-primary transition-colors">Beta Program</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-primary tracking-widest text-sm mb-6">Resources</h4>
                        <div className="space-y-3">
                            <a href="#" className="block text-muted-foreground hover:text-primary transition-colors">Documentation</a>
                            <a href="#" className="block text-muted-foreground hover:text-primary transition-colors">Support</a>
                            <a href="#" className="block text-muted-foreground hover:text-primary transition-colors">Contact Us</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-primary tracking-widest text-sm mb-6">Company</h4>
                        <div className="space-y-3">
                            <a href="#" className="block text-muted-foreground hover:text-primary transition-colors">About</a>
                            <a href="#" className="block text-muted-foreground hover:text-primary transition-colors">Our Story</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-primary tracking-widest text-sm mb-6">Legal</h4>
                        <div className="space-y-3">
                            <a href="#" className="block text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a>
                            <a href="#" className="block text-muted-foreground hover:text-primary transition-colors">Terms of Service</a>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-border/30 text-center text-muted-foreground text-sm">
                    <p>© 2026 Floc. Built with ❤️ for churches.</p>
                </div>
            </footer>
        </div>
    )
}
