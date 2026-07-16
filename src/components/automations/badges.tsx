import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Rule lifecycle status.
export function RuleStatusBadge({ status, dryRun }: { status: string; dryRun?: boolean }) {
  const map: Record<string, string> = {
    enabled: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    paused: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    draft: "bg-muted text-muted-foreground border-border",
  }
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="outline" className={cn("px-2.5 py-0.5 rounded-full text-xs", map[status] || map.draft)}>
        {label}
      </Badge>
      {dryRun && (
        <Badge variant="outline" className="px-2 py-0.5 rounded-full text-xs bg-sky-500/10 text-sky-600 border-sky-500/20">
          Dry run
        </Badge>
      )}
    </div>
  )
}

// message_log outcome.
export function OutcomeBadge({ outcome }: { outcome: string }) {
  const map: Record<string, string> = {
    sent: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    dry_run: "bg-sky-500/10 text-sky-600 border-sky-500/20",
    deduped: "bg-muted text-muted-foreground border-border",
    suppressed_consent: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    quiet_hours_deferred: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    throttled: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    skipped_no_provider: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    failed: "bg-destructive/10 text-destructive border-destructive/20",
  }
  const label = outcome.replace(/_/g, " ")
  return (
    <Badge variant="outline" className={cn("px-2 py-0.5 rounded-full text-xs capitalize", map[outcome] || map.deduped)}>
      {label}
    </Badge>
  )
}
