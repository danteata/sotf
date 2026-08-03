import { Users2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ReportScope } from "@/lib/report-scope"

/**
 * Marks figures that cover only the units the viewer administers, so a unit
 * admin doesn't read their own numbers as the whole organization's. Renders
 * nothing for org-wide viewers.
 */
export function ScopeBadge({
  scope,
  className,
}: {
  scope?: ReportScope | null
  className?: string
}) {
  if (!scope?.isScoped) return null

  const [firstUnit, ...otherUnits] = scope.unitNames
  const label = !firstUnit
    ? "Your members"
    : otherUnits.length > 0
      ? `${firstUnit} +${otherUnits.length}`
      : firstUnit

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-normal text-muted-foreground whitespace-nowrap",
        className,
      )}
      title={
        scope.unitNames.length > 0
          ? `Showing ${scope.unitNames.join(", ")} only`
          : "Showing the members you manage only"
      }
    >
      <Users2 className="h-3 w-3 shrink-0" />
      <span className="truncate max-w-[14rem]">{label}</span>
      {scope.memberCount !== null && (
        <span className="text-muted-foreground/60">· {scope.memberCount}</span>
      )}
    </Badge>
  )
}
