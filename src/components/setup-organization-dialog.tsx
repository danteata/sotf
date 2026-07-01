
import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useAnalytics } from "@/hooks/useAnalytics"
import { AnalyticsEventType } from "@/services/analytics/types"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useOrganization } from "@/hooks/use-organization"
import { toast } from "sonner"
import { Building2, Loader2 } from "lucide-react"
import { useConvexAuth } from "convex/react"

export function SetupOrganizationDialog() {
    const { organization, isLoading: isOrgLoading } = useOrganization()
    const createOrg = useMutation(api.organizations.create)
    const { trackEvent } = useAnalytics()
    const [name, setName] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isOpen, setIsOpen] = useState(true)
    const { isAuthenticated } = useConvexAuth()

    // Get user role to check if super_admin
    const user = useQuery(api.users.current, isAuthenticated ? undefined : "skip")

    // Don't show if:
    // 1. Still loading
    // 2. Has organization
    // 3. Is super_admin (they manage all orgs, don't need to create one)
    // 4. User data still loading
    if (isOrgLoading || organization || user === undefined || user?.role === "super_admin") {
        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setIsSubmitting(true)
        try {
            await createOrg({ name })
            trackEvent(AnalyticsEventType.ORGANIZATION_CREATED, { name_length: name.length })
            trackEvent(AnalyticsEventType.ORGANIZATION_SETUP_COMPLETED, {})
            toast.success("Organization created successfully")
            setIsOpen(false)
            window.location.reload()
        } catch (error) {
            toast.error("Failed to create organization")
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-[480px] border-0 shadow-soft-xl bg-white dark:bg-card rounded-2xl">
                <DialogHeader className="space-y-4">
                    <div className="mx-auto bg-gradient-primary p-4 rounded-2xl shadow-soft">
                        <Building2 className="w-10 h-10 text-primary-foreground" />
                    </div>
                    <DialogTitle className="text-3xl text-center bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                        Setup Organization
                    </DialogTitle>
                    <DialogDescription className="text-center text-base text-muted-foreground">
                        Welcome to Floc. To get started, please name your organization.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-3">
                        <Label htmlFor="org-name" className="text-sm font-semibold text-foreground">
                            Organization Name
                        </Label>
                        <Input
                            id="org-name"
                            placeholder="e.g. First Baptist Church"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-12 text-base border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl transition-smooth"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-semibold bg-gradient-primary hover:opacity-90 shadow-soft hover:shadow-soft-lg transition-smooth rounded-xl"
                            disabled={isSubmitting || !name.trim()}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Organization"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
