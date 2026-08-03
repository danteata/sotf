import { AttendanceTrends } from "@/components/attendance-trends"
import { MemberInsights } from "@/components/member-insights"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, Users } from "lucide-react"

export default function ReportsPage() {
  return (
    <LayoutWrapper>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl tracking-tight text-foreground">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Participation and membership insights for the members you oversee
            </p>
          </div>
        </div>

        <Tabs defaultValue="attendance" className="w-full space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-lg h-auto flex-wrap gap-0.5">
            <TabsTrigger 
              value="attendance" 
              className="h-9 px-4 rounded-md text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Attendance Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="members" 
              className="h-9 px-4 rounded-md text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Member Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="outline-none">
            <AttendanceTrends />
          </TabsContent>

          <TabsContent value="members" className="outline-none">
            <MemberInsights />
          </TabsContent>
        </Tabs>
      </div>
    </LayoutWrapper>
  )
}
