import { LayoutWrapper } from "@/components/layout-wrapper"
import { WelcomeBanner } from "@/components/welcome-banner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, Heart } from "lucide-react"

export default function HomePage() {
  return (
    <LayoutWrapper>
      <WelcomeBanner />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Member Management</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Easily manage your church members, track attendance, and organize ministry groups.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Event Planning</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Schedule and manage church events, services, and special occasions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Giving & Donations</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Track donations, generate reports, and manage church finances.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>About Makarios Church Management System</CardTitle>
            <CardDescription>A comprehensive solution for church administration</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Our church management system helps you streamline administrative tasks, connect with your congregation,
              and focus more on ministry. With features for member management, attendance tracking, event planning, and
              financial management, you'll have everything you need to effectively lead your church.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-3">
                <h3 className="font-medium">Member Directory</h3>
                <p className="text-sm text-muted-foreground">Maintain detailed profiles of all church members.</p>
              </div>
              <div className="rounded-lg border p-3">
                <h3 className="font-medium">Attendance Tracking</h3>
                <p className="text-sm text-muted-foreground">Record and analyze attendance for all church events.</p>
              </div>
              <div className="rounded-lg border p-3">
                <h3 className="font-medium">Ministry Management</h3>
                <p className="text-sm text-muted-foreground">Organize and coordinate various ministry groups.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutWrapper>
  )
}

