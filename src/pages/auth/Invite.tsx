
import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export default function InvitePage() {
    const { token } = useParams<{ token: string }>()
    const navigate = useNavigate()

    useEffect(() => {
        if (token) {
            navigate(`/accept-invitation?token=${token}`)
        }
    }, [token, navigate])

    return (
        <div className="min-h-screen flex items-center justify-center">
            <p>Redirecting to invitation...</p>
        </div>
    )
}
