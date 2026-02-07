import { useEffect, useState } from 'react'
import { useUser, SignInButton } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Church, Users, Calendar, DollarSign, Mail, Layers, CheckCircle, ArrowRight } from 'lucide-react'

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
            <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#ff6b35] border-t-[#ff8c42] rounded-full animate-spin"></div>
                    <p className="text-gray-400 font-medium">Loading your experience...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#fafafa] text-[#1a1a1a] overflow-x-hidden font-sans">
            {/* Gentle background effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="flame absolute top-[10%] left-[5%] opacity-10"></div>
                <div className="flame absolute top-[60%] right-[10%] opacity-15 animation-delay-2000"></div>
                <div className="flame absolute bottom-[20%] left-[15%] opacity-10 animation-delay-4000"></div>
            </div>

            {/* Navigation */}
            <header className="relative z-20 flex items-center justify-between p-6 lg:px-8 bg-white border-b border-[#e5e5e5]">
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-[#ff6b35]">⛪ floc</span>
                </div>
                <nav className="hidden md:flex items-center gap-8">
                    <a href="#features" className="text-[#4a4a4a] hover:text-[#ff6b35] transition-colors duration-300 font-medium">Features</a>
                    <a href="#beta" className="text-[#4a4a4a] hover:text-[#ff6b35] transition-colors duration-300 font-medium">Beta Program</a>
                    <a href="#faq" className="text-[#4a4a4a] hover:text-[#ff6b35] transition-colors duration-300 font-medium">FAQ</a>
                    <SignInButton mode="modal">
                        <Button variant="outline" className="border-2 border-[#ff6b35] text-[#ff6b35] hover:bg-[#ff6b35] hover:text-white font-bold rounded-full px-6 transition-all duration-300">
                            Login
                        </Button>
                    </SignInButton>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="relative z-10 text-center py-24 lg:py-32 px-6 lg:px-8 bg-gradient-to-br from-[#fff5f0] via-white to-[#fff8f5]">
                <div className="max-w-7xl mx-auto relative">
                    <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6 text-[#2a2a2a]">
                        IGNITE YOUR<br />
                        <span className="bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] bg-clip-text text-transparent">
                            MINISTRY
                        </span>
                    </h1>
                    <p className="text-xl text-[#666] max-w-3xl mx-auto mb-10 leading-relaxed">
                        Spend less time on admin, more time on ministry. Floc gives your church the tools to grow your congregation, deepen discipleship, and simplify church management.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-20">
                        <SignInButton mode="modal">
                            <Button className="bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] hover:shadow-lg hover:shadow-[#ff6b35]/35 text-white font-bold text-lg px-12 py-7 rounded-full transition-all duration-300 hover:-translate-y-1">
                                Get Started Free
                            </Button>
                        </SignInButton>
                        <a href="#features" className="inline-flex items-center justify-center bg-white text-[#ff6b35] font-bold text-lg px-10 py-[1.15rem] border-2 border-[#ff6b35] rounded-full hover:bg-[#fff5f0] transition-all duration-300">
                            See How It Works
                        </a>
                    </div>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[#888] text-sm">
                        <span className="flex items-center gap-2">✓ No credit card required</span>
                        <span className="flex items-center gap-2">✓ Free during beta</span>
                        <span className="flex items-center gap-2">✓ Setup in under 30 minutes</span>
                    </div>
                </div>
            </section>

            {/* Quick Features Grid */}
            <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 -mt-12 mb-24">
                <div className="bg-white rounded-[20px] p-10 shadow-xl border border-[#e5e5e5]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-[#fafafa] rounded-2xl p-6 text-center hover:bg-white transition-all duration-300 hover:-translate-y-2 border border-[#f0f0f0] hover:border-[#ff6b35] hover:shadow-lg hover:shadow-[#ff6b35]/10 cursor-pointer group">
                            <CheckCircle className="w-10 h-10 text-[#ff6b35] mx-auto mb-4 transition-transform duration-300 group-hover:scale-110" />
                            <div className="font-bold text-lg mb-2 text-[#2a2a2a]">Members</div>
                            <p className="text-sm text-[#666] leading-relaxed">Track attendance, manage families, build relationships</p>
                        </div>
                        <div className="bg-[#fafafa] rounded-2xl p-6 text-center hover:bg-white transition-all duration-300 hover:-translate-y-2 border border-[#f0f0f0] hover:border-[#ff6b35] hover:shadow-lg hover:shadow-[#ff6b35]/10 cursor-pointer group">
                            <Calendar className="w-10 h-10 text-[#ff6b35] mx-auto mb-4 transition-transform duration-300 group-hover:scale-110" />
                            <div className="font-bold text-lg mb-2 text-[#2a2a2a]">Events</div>
                            <p className="text-sm text-[#666] leading-relaxed">Schedule services, coordinate volunteers, send reminders</p>
                        </div>
                        <div className="bg-[#fafafa] rounded-2xl p-6 text-center hover:bg-white transition-all duration-300 hover:-translate-y-2 border border-[#f0f0f0] hover:border-[#ff6b35] hover:shadow-lg hover:shadow-[#ff6b35]/10 cursor-pointer group">
                            <Mail className="w-10 h-10 text-[#ff6b35] mx-auto mb-4 transition-transform duration-300 group-hover:scale-110" />
                            <div className="font-bold text-lg mb-2 text-[#2a2a2a]">Communication</div>
                            <p className="text-sm text-[#666] leading-relaxed">Email, SMS, and push notifications for your congregation</p>
                        </div>
                        <div className="bg-[#fafafa] rounded-2xl p-6 text-center hover:bg-white transition-all duration-300 hover:-translate-y-2 border border-[#f0f0f0] hover:border-[#ff6b35] hover:shadow-lg hover:shadow-[#ff6b35]/10 cursor-pointer group">
                            <DollarSign className="w-10 h-10 text-[#ff6b35] mx-auto mb-4 transition-transform duration-300 group-hover:scale-110" />
                            <div className="font-bold text-lg mb-2 text-[#2a2a2a]">Giving</div>
                            <p className="text-sm text-[#666] leading-relaxed">Accept tithes and offerings with secure online giving</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Features Section */}
            <section id="features" className="relative z-10 py-32 px-6 lg:px-8 bg-white">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-black text-center mb-6 text-[#ff6b35] leading-tight">
                        EVERYTHING YOUR CHURCH<br />NEEDS IN ONE PLACE
                    </h2>
                    <p className="text-xl text-[#666] text-center mb-20 max-w-2xl mx-auto leading-relaxed">
                        Powerful ministry tools designed specifically for churches of all sizes
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-2xl p-8 hover:border-[#ff6b35] hover:bg-white transition-all duration-300 hover:shadow-xl hover:shadow-[#ff6b35]/5 hover:-translate-y-2">
                            <h3 className="text-2xl font-bold mb-4 text-[#2a2a2a]">Member Management</h3>
                            <p className="text-[#666] leading-relaxed">
                                Know your flock better. Track attendance, manage member profiles, organize families, and build meaningful relationships with every person in your congregation.
                            </p>
                        </div>
                        <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-2xl p-8 hover:border-[#ff6b35] hover:bg-white transition-all duration-300 hover:shadow-xl hover:shadow-[#ff6b35]/5 hover:-translate-y-2">
                            <h3 className="text-2xl font-bold mb-4 text-[#2a2a2a]">Event Planning</h3>
                            <p className="text-[#666] leading-relaxed">
                                From Sunday services to Wednesday night Bible studies, plan every church event with ease. Coordinate volunteers, send automated reminders, and never miss a detail.
                            </p>
                        </div>
                        <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-2xl p-8 hover:border-[#ff6b35] hover:bg-white transition-all duration-300 hover:shadow-xl hover:shadow-[#ff6b35]/5 hover:-translate-y-2">
                            <h3 className="text-2xl font-bold mb-4 text-[#2a2a2a]">Online Giving</h3>
                            <p className="text-[#666] leading-relaxed">
                                Make giving simple for your members. Accept tithes and offerings online with secure payment processing, recurring giving options, and transparent financial reports.
                            </p>
                        </div>
                        <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-2xl p-8 hover:border-[#ff6b35] hover:bg-white transition-all duration-300 hover:shadow-xl hover:shadow-[#ff6b35]/5 hover:-translate-y-2">
                            <h3 className="text-2xl font-bold mb-4 text-[#2a2a2a]">Communication Hub</h3>
                            <p className="text-[#666] leading-relaxed">
                                Reach your entire congregation instantly. Send targeted emails, text messages, and app notifications to specific groups—from youth ministry to elder board.
                            </p>
                        </div>
                        <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-2xl p-8 hover:border-[#ff6b35] hover:bg-white transition-all duration-300 hover:shadow-xl hover:shadow-[#ff6b35]/5 hover:-translate-y-2">
                            <h3 className="text-2xl font-bold mb-4 text-[#2a2a2a]">Small Groups</h3>
                            <p className="text-[#666] leading-relaxed">
                                Deepen discipleship through thriving small groups. Manage life groups, Bible studies, and prayer circles with easy scheduling, discussion tools, and member engagement tracking.
                            </p>
                        </div>
                        <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-2xl p-8 hover:border-[#ff6b35] hover:bg-white transition-all duration-300 hover:shadow-xl hover:shadow-[#ff6b35]/5 hover:-translate-y-2">
                            <h3 className="text-2xl font-bold mb-4 text-[#2a2a2a]">Analytics & Insights</h3>
                            <p className="text-[#666] leading-relaxed">
                                Lead with wisdom. Get clear insights on attendance trends, giving patterns, member engagement, and ministry health to make informed decisions for your church's future.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Beta Program Section */}
            <section id="beta" className="relative z-10 py-32 px-6 lg:px-8 bg-gradient-to-br from-[#fff5f0] to-[#ffe8dc]">
                <div className="container max-w-5xl mx-auto">
                    <div className="bg-white border-2 border-[#ff6b35] rounded-3xl p-10 md:p-16 text-center shadow-2xl shadow-[#ff6b35]/10">
                        <div className="inline-block bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] text-white font-bold text-xs px-4 py-2 rounded-full uppercase tracking-widest mb-6">
                            Limited Beta Access
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-[#2a2a2a] mb-6 leading-tight">
                            JOIN OUR FOUNDING<br />CHURCHES PROGRAM
                        </h2>
                        <p className="text-lg text-[#666] mb-12 max-w-2xl mx-auto leading-relaxed">
                            Be among the first 25 churches to help shape the future of Floc. Get exclusive benefits and influence the features we build.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 text-left">
                            <div className="flex items-start gap-4">
                                <div className="bg-[#fff5f0] p-2 rounded-lg">
                                    <CheckCircle className="w-6 h-6 text-[#ff6b35]" />
                                </div>
                                <div>
                                    <strong className="text-[#2a2a2a] block mb-1">Free Access During Beta</strong>
                                    <span className="text-[#666] text-sm">3-6 months of full access at no cost</span>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="bg-[#fff5f0] p-2 rounded-lg">
                                    <CheckCircle className="w-6 h-6 text-[#ff6b35]" />
                                </div>
                                <div>
                                    <strong className="text-[#2a2a2a] block mb-1">Priority Feature Requests</strong>
                                    <span className="text-[#666] text-sm">Your needs shape our roadmap directly</span>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="bg-[#fff5f0] p-2 rounded-lg">
                                    <CheckCircle className="w-6 h-6 text-[#ff6b35]" />
                                </div>
                                <div>
                                    <strong className="text-[#2a2a2a] block mb-1">Direct Access to Founders</strong>
                                    <span className="text-[#666] text-sm">Personal support from our founding team</span>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="bg-[#fff5f0] p-2 rounded-lg">
                                    <CheckCircle className="w-6 h-6 text-[#ff6b35]" />
                                </div>
                                <div>
                                    <strong className="text-[#2a2a2a] block mb-1">50% Off for Life</strong>
                                    <span className="text-[#666] text-sm">Locked-in discount when we officially launch</span>
                                </div>
                            </div>
                        </div>

                        <SignInButton mode="modal">
                            <Button className="bg-[#ff6b35] hover:bg-[#ff8c42] text-white font-bold text-lg px-12 py-7 rounded-2xl transition-all duration-300 transform hover:-translate-y-1">
                                Apply for Beta Access
                            </Button>
                        </SignInButton>
                        <p className="mt-6 text-[#888] font-medium italic italic">
                            12 churches already testing • 13 spots remaining
                        </p>
                    </div>
                </div>
            </section>

            {/* Beta focus - pricing hidden */}

            {/* FAQ Section */}
            <section id="faq" className="relative z-10 py-32 px-6 lg:px-8 bg-[#fafafa]">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-black text-center mb-6 text-[#ff6b35] leading-tight uppercase">
                        Questions Pastors<br />Ask Us
                    </h2>
                    <p className="text-xl text-[#666] text-center mb-20 max-w-2xl mx-auto leading-relaxed">
                        Everything you need to know about Floc
                    </p>

                    <div className="space-y-4">
                        {[
                            {
                                q: "How quickly can we get started with Floc?",
                                a: "Most churches are up and running in under 30 minutes. We'll help you import your member data, set up your first event, and send your first communication on day one. Plus, we offer free onboarding calls to get you started right."
                            },
                            {
                                q: "Is my congregation's data secure?",
                                a: "Absolutely. We use bank-level encryption to protect your members' information. Your data is backed up daily, and we're fully compliant with data protection regulations. You own your data—we never share or sell it."
                            },
                            {
                                q: "Can Floc integrate with our existing tools?",
                                a: "Yes! Floc integrates with popular church tools including Planning Center, Mailchimp, QuickBooks, and more. We also offer CSV import/export so you can easily move data in and out."
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
                                q: "What size church is Floc designed for?",
                                a: "Floc works for churches of all sizes—from church plants with 50 members to established congregations with 1,000+. Our pricing scales with your church, so you only pay for what you need."
                            },
                            {
                                q: "Do we need technical expertise to use Floc?",
                                a: "Not at all! Floc is designed for church staff and volunteers, not IT professionals. If you can use email, you can use Floc. And our support team is always here to help."
                            }
                        ].map((faq, i) => (
                            <div key={i} className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden transition-all duration-300 hover:border-[#ff6b35]">
                                <button
                                    onClick={() => toggleFaq(i)}
                                    className="w-full text-left p-6 flex justify-between items-center group"
                                >
                                    <span className="font-bold text-lg text-[#2a2a2a] group-hover:text-[#ff6b35] transition-colors">{faq.q}</span>
                                    <ArrowRight className={`w-5 h-5 text-[#ff6b35] transition-transform duration-300 ${activeFaq === i ? 'rotate-90' : ''}`} />
                                </button>
                                <div className={`px-6 pb-6 text-[#666] leading-relaxed transition-all duration-300 ${activeFaq === i ? 'block' : 'hidden'}`}>
                                    {faq.a}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA Section */}
            <section className="relative z-10 py-32 px-6 lg:px-8 bg-gradient-to-br from-[#fff5f0] via-white to-[#fff8f5] text-center">
                <div className="container max-w-4xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-black text-[#ff6b35] mb-6 leading-tight uppercase">
                        Ready to simplify your<br />church management?
                    </h2>
                    <p className="text-xl text-[#666] mb-12 max-w-2xl mx-auto leading-relaxed">
                        Join the first wave of churches experiencing less admin stress and more ministry impact.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <SignInButton mode="modal">
                            <Button className="bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] hover:shadow-lg text-white font-bold text-lg px-12 py-7 rounded-full transition-all duration-300 transform hover:-translate-y-1">
                                Apply for Beta Access
                            </Button>
                        </SignInButton>
                        <Button variant="outline" className="bg-white text-[#ff6b35] font-bold text-lg px-10 py-7 border-2 border-[#ff6b35] rounded-full hover:bg-[#fff5f0] transition-colors">
                            Schedule a 15-Min Demo
                        </Button>
                    </div>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[#888] text-sm">
                        <span>✓ No credit card required</span>
                        <span>✓ Free setup assistance</span>
                        <span>✓ Cancel anytime</span>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 bg-white border-t border-[#e5e5e5] py-20 px-6 lg:px-8">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div>
                        <h4 className="text-[#ff6b35] font-black uppercase tracking-widest text-sm mb-6">Product</h4>
                        <div className="space-y-3">
                            <a href="#features" className="block text-[#666] hover:text-[#ff6b35] transition-colors">Features</a>
                            <a href="#beta" className="block text-[#666] hover:text-[#ff6b35] transition-colors">Beta Program</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-[#ff6b35] font-black uppercase tracking-widest text-sm mb-6">Resources</h4>
                        <div className="space-y-3">
                            <a href="#" className="block text-[#666] hover:text-[#ff6b35] transition-colors">Documentation</a>
                            <a href="#" className="block text-[#666] hover:text-[#ff6b35] transition-colors">Support</a>
                            <a href="#" className="block text-[#666] hover:text-[#ff6b35] transition-colors">Contact Us</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-[#ff6b35] font-black uppercase tracking-widest text-sm mb-6">Company</h4>
                        <div className="space-y-3">
                            <a href="#" className="block text-[#666] hover:text-[#ff6b35] transition-colors">About Floc</a>
                            <a href="#" className="block text-[#666] hover:text-[#ff6b35] transition-colors">Our Story</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-[#ff6b35] font-black uppercase tracking-widest text-sm mb-6">Legal</h4>
                        <div className="space-y-3">
                            <a href="#" className="block text-[#666] hover:text-[#ff6b35] transition-colors">Privacy Policy</a>
                            <a href="#" className="block text-[#666] hover:text-[#ff6b35] transition-colors">Terms of Service</a>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-[#f0f0f0] text-center text-[#888] text-sm">
                    <p>© 2026 Floc. Built with ❤️ for churches.</p>
                </div>
            </footer>
        </div>
    )
}
