import { useState } from "react"
import { MembersContent } from "@/components/members-content"
import { HouseholdsContent } from "@/components/households-content"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { Users, Home } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export default function MembersPage() {
    const [view, setView] = useState<"active" | "archived">("active")

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
                    <MembersContent view={view} onViewChange={setView} />
                </TabsContent>

                <TabsContent value="households" className="outline-none">
                    <HouseholdsContent />
                </TabsContent>
            </Tabs>
        </LayoutWrapper>
    )
}
