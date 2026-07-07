'use client'

import { useQuery } from "convex/react"
import { User, Mail, Phone, MapPin, Calendar, Users as UsersIcon } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export default function PortalProfile() {
    const profile = useQuery(api.check_ins.getMyProfile, {})

    if (profile === undefined) {
        return (
            <Card className="border-border/50 rounded-lg">
                <CardContent className="p-6 space-y-3">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                </CardContent>
            </Card>
        )
    }

    if (profile === null) {
        return (
            <Card className="border-border/50 rounded-lg">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                    No linked member profile found. Visit the portal link page to connect your account.
                </CardContent>
            </Card>
        )
    }

    const initials = (profile.name ?? "?").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()

    return (
        <Card className="border-border/50 rounded-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    My Profile
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={profile.avatar_url} />
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-lg font-semibold">{profile.name}</p>
                        <p className="text-sm text-muted-foreground">{profile.organization_name}</p>
                        <Badge variant="secondary" className="mt-1 capitalize">{profile.status}</Badge>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field icon={<Mail className="h-4 w-4" />} label="Email" value={profile.email} />
                    <Field icon={<Phone className="h-4 w-4" />} label="Phone" value={profile.phone} />
                    <Field icon={<Calendar className="h-4 w-4" />} label="Date of birth" value={profile.dob} />
                    <Field icon={<Calendar className="h-4 w-4" />} label="Joined" value={profile.joined_date} />
                    <Field
                        icon={<MapPin className="h-4 w-4" />}
                        label="Address"
                        value={[profile.address, profile.city, profile.state, profile.country].filter(Boolean).join(", ") || undefined}
                    />
                    <Field
                        icon={<UsersIcon className="h-4 w-4" />}
                        label="Units"
                        value={profile.unit_names?.length ? profile.unit_names.join(", ") : undefined}
                    />
                </div>

                <p className="text-xs text-muted-foreground">
                    Profile editing is read-only for now. Contact your church admin to update your details.
                </p>
            </CardContent>
        </Card>
    )
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 text-muted-foreground">{icon}</div>
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm">{value || "—"}</p>
            </div>
        </div>
    )
}