"use client"

import { useState } from "react"
import { useAction } from "convex/react"
import { HeartHandshake, Loader2 } from "lucide-react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TRANSACTION_CATEGORIES } from "@/lib/financial-utils"

// Subset of TRANSACTION_CATEGORIES that count as "giving" — mirrors
// convex/financial.ts's GIVING_CATEGORIES. Keep both in sync.
const GIVING_CATEGORY_KEYS = ["tithe", "offering", "donation", "mission"] as const

interface GiveFormProps {
    organizationId: Id<"organizations">
    /** "member": signed-in portal giver, auto-attached server-side, no giver-info fields.
     *  "guest": public link, collects name/email/phone. */
    mode: "member" | "guest"
    defaultName?: string
    defaultEmail?: string
    onStarted?: () => void
}

export function GiveForm({ organizationId, mode, defaultName, defaultEmail, onStarted }: GiveFormProps) {
    const [amount, setAmount] = useState("")
    const [category, setCategory] = useState<string>("tithe")
    const [note, setNote] = useState("")
    const [giverName, setGiverName] = useState(defaultName ?? "")
    const [giverEmail, setGiverEmail] = useState(defaultEmail ?? "")
    const [giverPhone, setGiverPhone] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const initializeGivingCheckout = useAction(api.paystack.initializeGivingCheckout)

    const parsedAmount = Number(amount)
    // Email is optional — most givers pay via mobile money from their phone
    // and shouldn't need one. Paystack's own email requirement is satisfied
    // server-side with a placeholder when none is given (paystack.ts).
    const canSubmit = Number.isFinite(parsedAmount) && parsedAmount > 0 && !submitting

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        if (!canSubmit) return
        setSubmitting(true)
        try {
            const { authorizationUrl } = await initializeGivingCheckout({
                organization_id: organizationId,
                amount: parsedAmount,
                category,
                giver_name: mode === "guest" ? giverName || undefined : undefined,
                // Always forwarded (not just guest mode) — a member with no
                // email on file fills this in via the fallback field below,
                // and the server still prefers its own linked-member lookup
                // over anything else for who the gift is attributed to.
                giver_email: giverEmail || undefined,
                giver_phone: mode === "guest" ? giverPhone || undefined : undefined,
                note: note || undefined,
            })
            onStarted?.()
            // Full redirect (not a new tab) — this is a one-shot checkout the
            // giver is meant to complete and return from, not a background
            // billing tab an admin keeps working alongside.
            window.location.href = authorizationUrl
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't start checkout. Please try again.")
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="give-amount">Amount (GHS)</Label>
                <Input
                    id="give-amount"
                    type="number"
                    min="1"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="e.g. 50"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="give-category">Give towards</Label>
                <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="give-category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {GIVING_CATEGORY_KEYS.map((key) => (
                            <SelectItem key={key} value={key}>
                                {TRANSACTION_CATEGORIES[key].icon} {TRANSACTION_CATEGORIES[key].label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {mode === "guest" && (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="give-name">Your name (optional)</Label>
                        <Input
                            id="give-name"
                            value={giverName}
                            onChange={(e) => setGiverName(e.target.value)}
                            placeholder="Anonymous"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="give-email">Email (optional)</Label>
                        <Input
                            id="give-email"
                            type="email"
                            value={giverEmail}
                            onChange={(e) => setGiverEmail(e.target.value)}
                            placeholder="you@example.com"
                        />
                        <p className="text-xs text-muted-foreground">
                            Only needed if you'd like a receipt — not required to give.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="give-phone">Phone (optional)</Label>
                        <Input
                            id="give-phone"
                            type="tel"
                            value={giverPhone}
                            onChange={(e) => setGiverPhone(e.target.value)}
                        />
                    </div>
                </>
            )}

            {mode === "member" && !defaultEmail && (
                <div className="space-y-2">
                    <Label htmlFor="give-email-member">Email (optional)</Label>
                    <Input
                        id="give-email-member"
                        type="email"
                        value={giverEmail}
                        onChange={(e) => setGiverEmail(e.target.value)}
                        placeholder="you@example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                        We don't have an email on file for you — only needed if you'd like a receipt.
                    </p>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="give-note">Note (optional)</Label>
                <Textarea
                    id="give-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Anything you'd like recorded with this gift"
                />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={!canSubmit}>
                {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <HeartHandshake className="mr-2 h-4 w-4" />
                )}
                Give {amount ? `GHS ${amount}` : ""}
            </Button>
        </form>
    )
}
