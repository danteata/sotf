"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, Loader2, UserCheck } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function AcceptInvitationClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user: clerkUser, isLoaded } = useUser()
  
  const [invitation, setInvitation] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      loadInvitation()
    } else {
      setError('No invitation token provided')
      setIsLoading(false)
    }
  }, [token])

  const loadInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          *,
          members (
            name,
            email,
            first_name,
            last_name
          )
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Invalid or expired invitation')
        } else {
          throw error
        }
      } else {
        setInvitation(data)
      }
    } catch (err) {
      console.error('Error loading invitation:', err)
      setError('Failed to load invitation')
    } finally {
      setIsLoading(false)
    }
  }

  const acceptInvitation = async () => {
    if (!clerkUser || !invitation) return

    setIsAccepting(true)
    try {
      const { data, error } = await supabase.rpc('accept_invitation', {
        p_token: token,
        p_clerk_user_id: clerkUser.id,
        p_user_name: clerkUser.fullName || clerkUser.firstName || 'Unknown User'
      })

      if (error) throw error

      const result = data[0]
      if (result.success) {
        setSuccess(true)
        // Redirect to appropriate dashboard after 3 seconds
        setTimeout(() => {
          if (invitation.intended_role === 'ministry_leader') {
            router.push('/ministry-dashboard')
          } else if (invitation.intended_role === 'region_leader') {
            router.push('/region-dashboard')
          } else {
            router.push('/')
          }
        }, 3000)
      } else {
        setError(result.message)
      }
    } catch (err) {
      console.error('Error accepting invitation:', err)
      setError('Failed to accept invitation')
    } finally {
      setIsAccepting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading invitation...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Invitation Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push('/')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Welcome!
            </CardTitle>
            <CardDescription>
              Your account has been created successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You now have access to your leadership dashboard. You'll be redirected automatically in a few seconds.
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="default">
                  {invitation.intended_role === 'ministry_leader' ? 'Ministry Leader' :
                   invitation.intended_role === 'region_leader' ? 'Region Leader' :
                   invitation.intended_role}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!clerkUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to accept this invitation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You need to sign in or create an account to accept this leadership invitation.
            </p>
            <Button onClick={() => router.push('/sign-in')} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Leadership Invitation
          </CardTitle>
          <CardDescription>
            You've been invited to join as a leader
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Invited as:</strong>
            </p>
            <Badge variant="default" className="mb-2">
              {invitation.intended_role === 'ministry_leader' ? 'Ministry Leader' :
               invitation.intended_role === 'region_leader' ? 'Region Leader' :
               invitation.intended_role}
            </Badge>
          </div>

          {invitation.members && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                <strong>For member:</strong>
              </p>
              <p className="font-medium">{invitation.members.name}</p>
              <p className="text-sm text-muted-foreground">{invitation.members.email}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Invitation expires:</strong>
            </p>
            <p className="text-sm">
              {new Date(invitation.expires_at).toLocaleDateString()} at{' '}
              {new Date(invitation.expires_at).toLocaleTimeString()}
            </p>
          </div>

          <div className="pt-4">
            <Button 
              onClick={acceptInvitation}
              disabled={isAccepting}
              className="w-full"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            By accepting, you'll gain access to manage members and record attendance for your assigned areas.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
