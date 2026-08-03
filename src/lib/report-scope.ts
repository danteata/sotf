/**
 * What a report's numbers cover, as returned by `describeCallerScope`
 * (convex/scope.ts). Org-wide viewers get `isScoped: false`.
 */
export type ReportScope = {
  isScoped: boolean
  unitNames: string[]
  memberCount: number | null
}

/** Subtitle copy that names the slice a report covers. */
export function scopeSubtitle(
  scope: ReportScope | null | undefined,
  orgWide: string,
): string {
  if (!scope?.isScoped) return orgWide
  if (scope.unitNames.length === 1) return `Limited to ${scope.unitNames[0]}`
  if (scope.unitNames.length > 1) return `Limited to the ${scope.unitNames.length} units you lead`
  return "Limited to the members you manage"
}
