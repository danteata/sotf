import { useEffect, useState } from 'react'
import { useUser, SignInButton } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Church, Users, Calendar, DollarSign, Mail, Layers, CheckCircle, ArrowRight } from 'lucide-react'

export default function HomePage() {
    const { user, isLoaded } = useUser()
    const navigate = useNavigate()

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
        <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
            {/* Animated Flame Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="flame absolute top-[10%] left-[5%]"></div>
                <div className="flame absolute top-[60%] right-[10%] animation-delay-2000"></div>
                <div className="flame absolute bottom-[20%] left-[15%] animation-delay-4000"></div>
            </div>

            {/* Navigation */}
            <header className="relative z-20 flex items-center justify-between p-6 lg:px-8">
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-[#ff6b35]">⛪ floc</span>
                </div>
                <nav className="hidden md:flex items-center gap-8">
                    <a href="#features" className="text-white hover:text-[#ff6b35] transition-colors duration-300 font-medium">Features</a>
                    <a href="#testimonials" className="text-white hover:text-[#ff6b35] transition-colors duration-300 font-medium">Testimonials</a>
                    <a href="#pricing" className="text-white hover:text-[#ff6b35] transition-colors duration-300 font-medium">Pricing</a>
                    <a href="#contact" className="text-white hover:text-[#ff6b35] transition-colors duration-300 font-medium">Contact</a>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="relative z-10 text-center py-24 lg:py-32 px-6 lg:px-8">
                {/* Light Reflections */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-[#ff6b35]/10 to-transparent rounded-full blur-3xl transform -translate-y-1/2"></div>
                    <div className="absolute top-0 right-1/4 w-80 h-80 bg-gradient-to-l from-[#ff8c42]/10 to-transparent rounded-full blur-3xl transform -translate-y-1/2"></div>
                    <div className="absolute top-1/2 left-0 w-72 h-72 bg-gradient-to-r from-[#ff6b35]/5 to-transparent rounded-full blur-2xl"></div>
                    <div className="absolute top-1/2 right-0 w-64 h-64 bg-gradient-to-l from-[#ff8c42]/5 to-transparent rounded-full blur-2xl"></div>
                </div>

                <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6 relative z-10">
                    IGNITE YOUR<br />
                    <span className="bg-gradient-to-r from-white to-[#ff6b35] bg-clip-text text-transparent">
                        COMMUNITY IMPACT
                    </span>
                </h1>
                <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8 leading-relaxed relative z-10">
                    Transform your church management with cutting-edge tools that fuel growth, foster community, and amplify your organization's impact.
                </p>
                <div className="relative z-10">
                    <SignInButton mode="modal">
                        <Button className="bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] hover:from-[#ff8c42] hover:to-[#ff6b35] text-white font-semibold text-lg px-12 py-4 rounded-full shadow-2xl hover:shadow-[#ff6b35]/25 transition-all duration-300 hover:-translate-y-1">
                            Start Your Journey
                        </Button>
                    </SignInButton>
                </div>
            </section>

            {/* Dashboard Preview */}
            <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 mb-24">
                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#252525] rounded-[20px] p-12 shadow-2xl border border-[#333]">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="bg-[#2a2a2a] rounded-2xl p-6 text-center hover:bg-[#333] transition-all duration-300 hover:-translate-y-2 border border-[#333] hover:border-[#ff6b35] cursor-pointer">
                            <CheckCircle className="w-10 h-10 text-[#ff6b35] mx-auto mb-4" />
                            <div className="font-bold text-lg">Members</div>
                        </div>
                        <div className="bg-[#2a2a2a] rounded-2xl p-6 text-center hover:bg-[#333] transition-all duration-300 hover:-translate-y-2 border border-[#333] hover:border-[#ff6b35] cursor-pointer">
                            <Calendar className="w-10 h-10 text-[#ff6b35] mx-auto mb-4" />
                            <div className="font-bold text-lg">Events</div>
                        </div>
                        <div className="bg-[#2a2a2a] rounded-2xl p-6 text-center hover:bg-[#333] transition-all duration-300 hover:-translate-y-2 border border-[#333] hover:border-[#ff6b35] cursor-pointer">
                            <Mail className="w-10 h-10 text-[#ff6b35] mx-auto mb-4" />
                            <div className="font-bold text-lg">Communication</div>
                        </div>
                        <div className="bg-[#2a2a2a] rounded-2xl p-6 text-center hover:bg-[#333] transition-all duration-300 hover:-translate-y-2 border border-[#333] hover:border-[#ff6b35] cursor-pointer">
                            <DollarSign className="w-10 h-10 text-[#ff6b35] mx-auto mb-4" />
                            <div className="font-bold text-lg">Giving</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <section id="features" className="relative z-10 py-24 px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-5xl font-black text-center mb-4 text-[#ff6b35]">
                        POWERFUL TOOLS<br />ENDLESS POSSIBILITIES
                    </h2>
                    <p className="text-xl text-gray-400 text-center mb-16 max-w-2xl mx-auto">
                        Everything you need to manage and grow your church community
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8 hover:border-[#ff6b35] transition-all duration-300 hover:-translate-y-2">
                            <h3 className="text-2xl font-bold mb-4 text-white">Member Management</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Track attendance, manage contact information, and build deeper relationships with comprehensive member profiles and family grouping.
                            </p>
                        </div>
                        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8 hover:border-[#ff6b35] transition-all duration-300 hover:-translate-y-2">
                            <h3 className="text-2xl font-bold mb-4 text-white">Event Planning</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Schedule services, organize events, and manage volunteers effortlessly with integrated calendars and automated reminders.
                            </p>
                        </div>
                        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8 hover:border-[#ff6b35] transition-all duration-300 hover:-translate-y-2">
                            <h3 className="text-2xl font-bold mb-4 text-white">Online Giving</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Accept donations securely with multiple payment options, recurring giving, and detailed financial reporting for transparency.
                            </p>
                        </div>
                        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8 hover:border-[#ff6b35] transition-all duration-300 hover:-translate-y-2">
                            <h3 className="text-2xl font-bold mb-4 text-white">Communication Hub</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Send targeted emails, SMS messages, and push notifications to keep your congregation informed and engaged.
                            </p>
                        </div>
                        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8 hover:border-[#ff6b35] transition-all duration-300 hover:-translate-y-2">
                            <h3 className="text-2xl font-bold mb-4 text-white">Small Groups</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Foster community through small group management, scheduling, and discussion tools that encourage discipleship.
                            </p>
                        </div>
                        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8 hover:border-[#ff6b35] transition-all duration-300 hover:-translate-y-2">
                            <h3 className="text-2xl font-bold mb-4 text-white">Analytics & Insights</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Make data-driven decisions with powerful analytics on attendance trends, giving patterns, and engagement metrics.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section id="testimonials" className="relative z-10 py-24 px-6 lg:px-8 bg-[#111]">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-5xl font-black text-center mb-4 text-[#ff6b35]">
                        HEAR FROM<br />OUR SATISFIED CHURCHES
                    </h2>
                    <p className="text-xl text-gray-400 text-center mb-16 max-w-2xl mx-auto">
                        Join thousands of churches experiencing transformation
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8">
                            <div className="flex items-center mb-6">
                                <div className="w-12 h-12 bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] rounded-full mr-4"></div>
                                <div>
                                    <div className="font-semibold text-white">Pastor Michael Chen</div>
                                    <div className="text-gray-500">Grace Community Church</div>
                                </div>
                            </div>
                            <p className="text-gray-300 leading-relaxed">
                                "Floc transformed how we shepherd our congregation. The member management tools helped us stay connected during challenging times, and our online giving increased by 40%."
                            </p>
                        </div>
                        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8">
                            <div className="flex items-center mb-6">
                                <div className="w-12 h-12 bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] rounded-full mr-4"></div>
                                <div>
                                    <div className="font-semibold text-white">Rev. Sarah Johnson</div>
                                    <div className="text-gray-500">First Baptist Downtown</div>
                                </div>
                            </div>
                            <p className="text-gray-300 leading-relaxed">
                                "The event planning features are phenomenal. We've doubled our small group participation and engagement has never been higher. Floc truly understands church management."
                            </p>
                        </div>
                        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8">
                            <div className="flex items-center mb-6">
                                <div className="w-12 h-12 bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] rounded-full mr-4"></div>
                                <div>
                                    <div className="font-semibold text-white">Elder David Martinez</div>
                                    <div className="text-gray-500">New Hope Fellowship</div>
                                </div>
                            </div>
                            <p className="text-gray-300 leading-relaxed">
                                "Moving from spreadsheets to Floc was the best decision we made. The analytics help us understand our congregation better and serve them more effectively."
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="relative z-10 py-24 px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-5xl font-black text-center mb-16 text-[#ff6b35]">
                        GET ANSWERS<br />TO YOUR TOP QUESTIONS
                    </h2>

                    <div className="space-y-4">
                        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 cursor-pointer hover:border-[#ff6b35] transition-colors duration-300">
                            <div className="font-semibold text-lg text-white">How quickly can we get started with Floc?</div>
                        </div>
                        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 cursor-pointer hover:border-[#ff6b35] transition-colors duration-300">
                            <div className="font-semibold text-lg text-white">Is my congregation's data secure?</div>
                        </div>
                        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 cursor-pointer hover:border-[#ff6b35] transition-colors duration-300">
                            <div className="font-semibold text-lg text-white">Can Floc integrate with our existing tools?</div>
                        </div>
                        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 cursor-pointer hover:border-[#ff6b35] transition-colors duration-300">
                            <div className="font-semibold text-lg text-white">What kind of support do you offer?</div>
                        </div>
                        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 cursor-pointer hover:border-[#ff6b35] transition-colors duration-300">
                            <div className="font-semibold text-lg text-white">Is there a mobile app for our members?</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="relative z-10 py-24 px-6 lg:px-8">
                <div className="text-center">
                    <h2 className="text-5xl font-black mb-6 text-[#ff6b35]">
                        START TRANSFORMING<br />YOUR CHURCH TODAY
                    </h2>
                    <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                        Start managing your church with confidence today
                    </p>
                    <SignInButton mode="modal">
                        <Button className="bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] hover:from-[#ff8c42] hover:to-[#ff6b35] text-white font-semibold text-lg px-12 py-4 rounded-full shadow-2xl hover:shadow-[#ff6b35]/25 transition-all duration-300 hover:-translate-y-1">
                            Begin Free Trial
                        </Button>
                    </SignInButton>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 bg-[#0a0a0a] border-t border-[#222] py-16 px-6 lg:px-8">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <h4 className="text-[#ff6b35] mb-4 font-bold">Product</h4>
                        <div className="space-y-2">
                            <a href="#" className="block text-gray-500 hover:text-[#ff6b35] transition-colors">Features</a>
                            <a href="#" className="block text-gray-500 hover:text-[#ff6b35] transition-colors">Pricing</a>
                            <a href="#" className="block text-gray-500 hover:text-[#ff6b35] transition-colors">Security</a>
                            <a href="#" className="block text-gray-500 hover:text-[#ff6b35] transition-colors">Updates</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-[#ff6b35] mb-4 font-bold">Resources</h4>
                        <div className="space-y-2">
                            <a href="#" className="block text-gray-500 hover:text-[#ff6b35] transition-colors">Documentation</a>
                            <a href="#" className="block text-gray-500 hover:text-[#ff6b35] transition-colors">Tutorials</a>
                            <a href="#" className="block text-gray-500 hover:text-[#ff6b35] transition-colors">Blog</a>
                            <a href="#" className="block text-gray-500 hover:text-[#ff6b35] transition-colors">Support</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-[#ff6b35] mb-4 font-bold">Company</h4>
                        <div className="space-y-2">
                            <a href="#" className="block text-gray-500 hover:text-[#ff6b35] transition-colors">About Us</a>
                            <a href="#" className="block text-gray-500 hover:text-[#ff6b35] transition-colors">Careers</a>
                            <a href="#" className="block text-gray-500 hover:text-[#ff6b35] transition-colors">Contact</a>
                            <a href="#" className="block text-gray-500 hover:text-[#ff6b35] transition-colors">Partners</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-[#ff6b35] mb-4 font-bold">Legal</h4>
                        <div className="space-y-2">
                            <a href="#" className="block text-gray-500 hover:text-[#ff6b35] transition-colors">Privacy Policy</a>
                            <a href="#" className="block text-gray-500 hover:text-[#ff6b35] transition-colors">Terms of Service</a>
                            <a href="#" className="block text-gray-500 hover:text-[#ff6b35] transition-colors">Cookie Policy</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
