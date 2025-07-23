import { Suspense } from 'react'
import AcceptInvitationClient from './AcceptInvitationClient'

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AcceptInvitationClient />
    </Suspense>
  )
}