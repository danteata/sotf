import { useEffect, useMemo, useState } from "react"
import type { FunctionReturnType } from "convex/server"
import { MembersContent } from "@/components/members-content"
import type { Member } from "@/types/database"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { useOrganization } from "@/hooks/use-organization"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

type MemberRow = FunctionReturnType<typeof api.members.listPage>["page"][number]

function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delayMs)
        return () => clearTimeout(t)
    }, [value, delayMs])
    return debounced
}

export default function MembersPage() {
    const { organization } = useOrganization()
    const [view, setView] = useState<"active" | "archived">("active")
    const [searchInput, setSearchInput] = useState("")
    const search = useDebouncedValue(searchInput.trim(), 250)
    const [cursor, setCursor] = useState<string | undefined>(undefined)
    const [accumulated, setAccumulated] = useState<MemberRow[]>([])

    // Reset pagination when filters change. Adjusting state during render
    // (React's documented pattern for "resetting state on prop change")
    // instead of an effect avoids an extra render pass.
    const filterKey = `${organization?._id ?? ""}:${view}:${search}`
    const [prevFilterKey, setPrevFilterKey] = useState(filterKey)
    if (filterKey !== prevFilterKey) {
        setPrevFilterKey(filterKey)
        setCursor(undefined)
        setAccumulated([])
    }

    const page = useQuery(
        api.members.listPage,
        organization
            ? {
                  organization_id: organization._id,
                  filter: view,
                  search: search || undefined,
                  pageSize: 50,
                  cursor,
              }
            : "skip",
    )

    // Merge pages as they arrive
    const [mergedForPage, setMergedForPage] = useState<typeof page>(undefined)
    if (page && page !== mergedForPage) {
        setMergedForPage(page)
        if (!cursor) {
            setAccumulated(page.page)
        } else {
            setAccumulated((prev) => {
                const seen = new Set(prev.map((m) => m._id ?? m.id))
                const next = page.page.filter((m) => !seen.has(m._id ?? m.id))
                return [...prev, ...next]
            })
        }
    }

    const totalCount = page?.totalCount
    const isDone = page?.isDone ?? true
    const isLoading = page === undefined && accumulated.length === 0

    const members = useMemo(() => accumulated, [accumulated])

    if (isLoading) {
        return (
            <LayoutWrapper>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </LayoutWrapper>
        )
    }

    return (
        <LayoutWrapper>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search name, email, or phone…"
                        className="pl-9"
                    />
                </div>
                {typeof totalCount === "number" && (
                    <p className="text-sm text-muted-foreground">
                        {totalCount.toLocaleString()} member
                        {totalCount === 1 ? "" : "s"}
                        {search ? " matching" : ""}
                    </p>
                )}
            </div>

            <MembersContent
                initialMembers={members as unknown as Member[]}
                view={view}
                onViewChange={setView}
            />

            {!isDone && (
                <div className="mt-4 flex justify-center">
                    <Button
                        variant="outline"
                        disabled={page === undefined}
                        onClick={() => {
                            if (page?.nextCursor) setCursor(page.nextCursor)
                        }}
                    >
                        {page === undefined ? "Loading…" : "Load more"}
                    </Button>
                </div>
            )}
        </LayoutWrapper>
    )
}
