import { redirect } from 'next/navigation'

interface InvitePageProps {
  params: {
    token: string
  }
}

export default function InvitePage({ params }: InvitePageProps) {
  // Redirect to the accept-invitation page with the token as a query parameter
  redirect(`/accept-invitation?token=${params.token}`)
}
