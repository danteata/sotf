import { Suspense } from "react"
import { Church } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link, useSearchParams } from "react-router-dom"
import { SignUp } from "@clerk/clerk-react"

function SignUpContent() {
    const [searchParams] = useSearchParams()
    const redirectUrl = searchParams.get('redirect_url') || '/'

    // Check if Clerk is configured
    const isClerkConfigured =
        typeof import.meta.env.VITE_CLERK_PUBLISHABLE_KEY === "string" &&
        import.meta.env.VITE_CLERK_PUBLISHABLE_KEY !== "your_publishable_key"

    if (!isClerkConfigured) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30">
                <div className="mb-8 flex items-center gap-2">
                    <Church className="h-8 w-8 text-primary" />
                    <h1 className="text-2xl">Floc</h1>
                </div>

                <Card className="mx-auto w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Create an Account</CardTitle>
                        <CardDescription>
                            This is a demo sign-up page. To enable actual authentication, please configure Clerk.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input id="firstName" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input id="lastName" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder="your.email@example.com" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4">
                        <Button className="w-full" onClick={() => (window.location.href = redirectUrl)}>
                            Sign Up
                        </Button>
                        <p className="text-center text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <Link to="/sign-in" className="text-primary underline">
                                Sign in
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30">
            <div className="mb-8 flex items-center gap-2">
                <Church className="h-8 w-8 text-primary" />
                <h1 className="text-2xl">Floc</h1>
            </div>
            <SignUp
                appearance={{
                    elements: {
                        rootBox: "mx-auto",
                        card: "bg-background shadow-lg",
                        formButtonPrimary: "bg-primary hover:bg-primary/90",
                    },
                }}
                signInUrl="/sign-in"
                forceRedirectUrl={redirectUrl}
                routing="path"
                path="/sign-up"
            />
        </div>
    )
}

export default function SignUpPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30">
                <div className="mb-8 flex items-center gap-2">
                    <Church className="h-8 w-8 text-primary" />
                    <h1 className="text-2xl">Floc</h1>
                </div>
                <div className="animate-pulse">Loading...</div>
            </div>
        }>
            <SignUpContent />
        </Suspense>
    )
}
