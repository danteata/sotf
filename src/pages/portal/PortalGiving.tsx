'use client'

import { useState } from "react"
import { useQuery } from "convex/react"
import { HeartHandshake, Loader2 } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GiveForm } from "@/components/give-form"
import { TRANSACTION_CATEGORIES, formatGHS } from "@/lib/financial-utils"

export default function PortalGiving() {
    const [giving, setGiving] = useState(false)
    const profile = useQuery(api.check_ins.getMyProfile, {})
    const history = useQuery(api.financial.getMyGiving, {})

    const loading = profile === undefined || history === undefined

    return (
        <div className="space-y-6">
            <Card className="border-border/50 rounded-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <HeartHandshake className="h-4 w-4" />
                        My Giving
                    </CardTitle>
                    {profile?.organization_id && (
                        <Button size="sm" onClick={() => setGiving(true)}>
                            Give now
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-2">
                            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : !profile ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            We couldn't find your member profile.
                        </p>
                    ) : history.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            No gifts recorded yet.
                        </p>
                    ) : (
                        <div className="divide-y divide-border/40">
                            {history.map((h) => (
                                <div key={h._id} className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="text-sm font-medium">{formatGHS(h.amount)}</p>
                                        <p className="text-xs text-muted-foreground">{h.date}</p>
                                    </div>
                                    <Badge variant="outline" className="capitalize">
                                        {TRANSACTION_CATEGORIES[h.category as keyof typeof TRANSACTION_CATEGORIES]?.label ?? h.category}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={giving} onOpenChange={setGiving}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <HeartHandshake className="h-4 w-4" />
                            Give
                        </DialogTitle>
                    </DialogHeader>
                    {profile?.organization_id ? (
                        <GiveForm
                            organizationId={profile.organization_id}
                            mode="member"
                            defaultName={profile.name}
                            defaultEmail={profile.email}
                            onStarted={() => setGiving(false)}
                        />
                    ) : (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
