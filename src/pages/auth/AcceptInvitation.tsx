
import { useEffect, useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { useUser } from "@clerk/clerk-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, Loader2, UserCheck, ShieldAlert, Key } from "lucide-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"

export default function AcceptInvitationPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { user: clerkUser, isLoaded } = useUser()

    const token = searchParams.get('token') || ""

    // Convex Queries
    const invitation = useQuery(api.invitations.getByToken, { token })
    const acceptInvitationMutation = useMutation(api.invitations.accept)

    const [isAccepting, setIsAccepting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        if (!token) {
            setError('No invitation token provided')
        }
    }, [token])

    // Handle invitation status errors (like expired or used)
    useEffect(() => {
        if (invitation === null && token) {
            setError('Invalid or expired invitation protocol')
        }
    }, [invitation, token])

    const handleAccept = async () => {
        if (!clerkUser || !invitation) return

        setIsAccepting(true)
        setError(null)
        try {
            await acceptInvitationMutation({ token })
            setSuccess(true)

            // Redirect to appropriate dashboard after 3 seconds
            setTimeout(() => {
                const redirectPath = invitation.intended_role === 'ministry_leader' ? '/ministry-dashboard' :
                    invitation.intended_role === 'region_leader' ? '/region-dashboard' : '/'
                window.location.href = redirectPath
            }, 3000)
        } catch (err: any) {
            console.error('Error accepting invitation:', err)
            setError(err.message || 'Failed to authorize leadership protocol')
        } finally {
            setIsAccepting(false)
        }
    }

    if (token === "" || (invitation === undefined && !error)) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-black stroke-[3px]" />
                    <span className="font-black uppercase tracking-widest text-xs">DECRYPTING_INVITATION_PACKAGE...</span>
                </div>
            </div>
        )
    }


    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6">
                <Card className="w-full max-w-md border-4 border-black shadow-brutal rounded-3xl overflow-hidden">
                    <CardHeader className="bg-red-500 text-black border-b-4 border-black p-6">
                        <CardTitle className="flex items-center gap-3 font-black uppercase tracking-tighter text-2xl">
                            <ShieldAlert className="h-8 w-8" />
                            PROTOCOL_FAILURE
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="p-4 bg-red-50 border-2 border-dashed border-red-500 rounded-xl">
                            <p className="font-bold text-red-700 uppercase text-xs leading-relaxed">{error}</p>
                        </div>
                        <Button
                            onClick={() => navigate('/')}
                            className="w-full h-14 border-4 border-black bg-black text-white hover:bg-black/90 shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all rounded-2xl font-black uppercase text-lg"
                        >
                            RETURN_TO_BASE
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6">
                <Card className="w-full max-w-md border-4 border-black shadow-brutal rounded-3xl overflow-hidden animate-in zoom-in duration-500">
                    <CardHeader className="bg-primary text-black border-b-4 border-black p-6">
                        <CardTitle className="flex items-center gap-3 font-black uppercase tracking-tighter text-2xl">
                            <CheckCircle className="h-8 w-8" />
                            ACCESS_GRANTED
                        </CardTitle>
                        <CardDescription className="text-black/60 font-bold uppercase text-[10px] mt-1">
                            Identity verified. Leadership privileges activated.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="space-y-4">
                            <p className="text-sm font-bold uppercase text-muted-foreground leading-tight">
                                Uplink established. You now have command access to the leadership dashboard. Redirecting to tactical overview...
                            </p>
                            <div className="flex items-center gap-2">
                                <Badge className="bg-black text-white border-2 border-black font-black uppercase py-2 px-4 text-xs rounded-xl">
                                    {invitation?.intended_role === 'ministry_leader' ? 'MINISTRY_COMMANDER' :
                                        invitation?.intended_role === 'region_leader' ? 'REGIONAL_OVERSEER' :
                                            invitation?.intended_role?.toUpperCase()}
                                </Badge>
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-center">
                            <Loader2 className="h-10 w-10 animate-spin text-black stroke-[3px]" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6">
                <Loader2 className="h-12 w-12 animate-spin text-black stroke-[3px]" />
            </div>
        )
    }

    if (!clerkUser) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6">
                <Card className="w-full max-w-md border-4 border-black shadow-brutal rounded-3xl overflow-hidden">
                    <CardHeader className="bg-yellow-400 text-black border-b-4 border-black p-6">
                        <CardTitle className="font-black uppercase tracking-tighter text-2xl">IDENTITY_REQUIRED</CardTitle>
                        <CardDescription className="text-black/60 font-bold uppercase text-[10px]">
                            Authentication token needed to accept invitation
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <p className="text-sm font-bold uppercase text-muted-foreground leading-relaxed italic">
                            You must authenticate your identity to activate the leadership protocol. Existing credentials or new enrollment required.
                        </p>
                        <div className="space-y-4">
                            <Button
                                onClick={() => navigate(`/sign-up?force_redirect_url=${encodeURIComponent(window.location.href)}`)}
                                className="w-full h-14 border-4 border-black bg-primary text-black hover:bg-primary/90 shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all rounded-2xl font-black uppercase text-lg"
                            >
                                START_ENROLLMENT
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => navigate(`/sign-in?force_redirect_url=${encodeURIComponent(window.location.href)}`)}
                                className="w-full h-14 border-4 border-black bg-white text-black hover:bg-muted shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all rounded-2xl font-black uppercase text-lg"
                            >
                                VERIFY_EXISTING
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
            <Card className="w-full max-w-md border-4 border-black shadow-brutal rounded-[40px] overflow-hidden bg-white">
                <CardHeader className="bg-black text-white p-8">
                    <CardTitle className="flex items-center gap-3 text-3xl font-black uppercase tracking-tighter">
                        <Key className="h-8 w-8 text-primary" />
                        INVITATION_DECRYPTED
                    </CardTitle>
                    <CardDescription className="text-white/60 font-bold uppercase text-[10px] tracking-widest mt-2">
                        Deployment orders finalized for tactical integration
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground pl-1">
                                ASSIGNED_ROLE
                            </p>
                            <div className="p-4 border-3 border-black rounded-2xl bg-primary/10 flex items-center justify-between">
                                <span className="font-black uppercase text-lg">
                                    {invitation?.intended_role === 'ministry_leader' ? 'MINISTRY_COMMANDER' :
                                        invitation?.intended_role === 'region_leader' ? 'REGIONAL_OVERSEER' :
                                            invitation?.intended_role?.toUpperCase()}
                                </span>
                                <Badge className="bg-black text-primary border-none font-black text-[9px] px-2 py-0.5">ACTIVE_REQ</Badge>
                            </div>
                        </div>

                        {invitation?.member_id && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground pl-1">
                                    LINKED_IDENTITY
                                </p>
                                <div className="p-4 border-3 border-black rounded-2xl bg-muted/50">
                                    <p className="font-black uppercase text-sm mb-1">MEMBER_REF: {invitation.member_id.substring(0, 8)}</p>
                                    <p className="text-xs font-bold text-muted-foreground uppercase italic truncate">Associated with central personnel database</p>
                                </div>
                            </div>
                        )}

                        <div className="p-4 bg-muted/20 border-3 border-dashed border-black/20 rounded-2xl">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black uppercase text-muted-foreground">TOKEN_EXPIRY</span>
                                <span className="text-[10px] font-black uppercase text-red-500">CRITICAL_WINDOW</span>
                            </div>
                            <p className="text-sm font-bold uppercase">
                                {new Date(invitation?.expires_at || 0).toLocaleDateString()} @ {new Date(invitation?.expires_at || 0).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button
                            onClick={handleAccept}
                            disabled={isAccepting}
                            className="w-full h-16 border-4 border-black bg-primary text-black hover:bg-primary shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all rounded-2xl font-black uppercase text-xl"
                        >
                            {isAccepting ? (
                                <>
                                    <Loader2 className="mr-3 h-6 w-6 animate-spin stroke-[3px]" />
                                    ACTIVATING...
                                </>
                            ) : (
                                'ACCEPT_COMMAND'
                            )}
                        </Button>
                    </div>

                    <div className="p-4 bg-black/5 rounded-xl border-2 border-black/5">
                        <p className="text-[9px] font-bold text-muted-foreground text-center uppercase leading-tight tracking-tight">
                            By accepting this commission, you assume full responsibility for personnel management and tactical reporting within your authorized jurisdiction.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
