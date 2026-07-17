import { useEffect, useMemo, useState } from "react"
import { MembersContent } from "@/components/members-content"
import { HouseholdsContent } from "@/components/households-content"
import type { Member } from "@/types/database"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { useOrganization } from "@/hooks/use-organization"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Users, Home } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 50

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
    const [loadedCount, setLoadedCount] = useState(PAGE_SIZE)

    // Reset "Load more" progress when filters change. Adjusting state during
    // render (React's documented pattern for "resetting state on prop
    // change") instead of an effect avoids an extra render pass.
    const filterKey = `${organization?._id ?? ""}:${view}:${search}`
    const [prevFilterKey, setPrevFilterKey] = useState(filterKey)
    if (filterKey !== prevFilterKey) {
        setPrevFilterKey(filterKey)
        setLoadedCount(PAGE_SIZE)
    }

    // A single live query whose pageSize grows on "Load more", rather than
    // one query per page merged client-side — listPage already collects and
    // filters the whole scoped set server-side before slicing, so this costs
    // nothing extra, and it means the visible list is always fully reactive
    // (e.g. an archived member disappears immediately, not just on refresh).
    const page = useQuery(
        api.members.listPage,
        organization
            ? {
                  organization_id: organization._id,
                  filter: view,
                  search: search || undefined,
                  pageSize: loadedCount,
              }
            : "skip",
    )

    const totalCount = page?.totalCount
    const isDone = page?.isDone ?? true
    const isLoading = page === undefined

    const members = useMemo(() => page?.page ?? [], [page])

    return (
        <LayoutWrapper>
            <Tabs defaultValue="directory" className="w-full space-y-4">
                <TabsList className="bg-muted/50 p-1 rounded-lg h-auto gap-0.5">
                    <TabsTrigger
                        value="directory"
                        className={cn(
                            "h-8 px-3 rounded-md text-sm gap-1.5",
                            "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                            "text-muted-foreground",
                        )}
                    >
                        <Users className="h-3.5 w-3.5" />
                        Directory
                    </TabsTrigger>
                    <TabsTrigger
                        value="households"
                        className={cn(
                            "h-8 px-3 rounded-md text-sm gap-1.5",
                            "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                            "text-muted-foreground",
                        )}
                    >
                        <Home className="h-3.5 w-3.5" />
                        Households
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="directory" className="space-y-4 outline-none">
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

                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <MembersContent
                            initialMembers={members as unknown as Member[]}
                            view={view}
                            onViewChange={setView}
                        />
                    )}

                    {!isDone && (
                        <div className="mt-4 flex justify-center">
                            <Button
                                variant="outline"
                                disabled={page === undefined}
                                onClick={() => setLoadedCount((c) => c + PAGE_SIZE)}
                            >
                                {page === undefined ? "Loading…" : "Load more"}
                            </Button>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="households" className="outline-none">
                    <HouseholdsContent />
                </TabsContent>
            </Tabs>
        </LayoutWrapper>
    )
}
