'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Building2,
    MapPin,
    Users,
    Settings,
    BarChart3,
    Grid3X3,
    Shield,
    TrendingUp,
    Layout,
    ArrowUpRight
} from 'lucide-react'
import { UnitManagement } from '@/components/unit-management'
import { OrganizationChart } from '@/components/organization-chart'
import { SettingsDialog } from '@/components/settings-dialog'
import { LayoutWrapper } from '@/components/layout-wrapper'
import { useUserRole } from '@/hooks/use-user-role'
import { useOrganization } from '@/hooks/use-organization'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export default function OrganizationPage() {
    const { isAdmin, role } = useUserRole()
    const { organization } = useOrganization()
    const [activeTab, setActiveTab] = useState('units')
    const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)

    // Convex Query for Real Stats
    const chartData = useQuery(api.organizations.getChartData, {
        organization_id: organization?._id
    })

    const hasAccess = isAdmin ||
        role === 'organization_admin' ||
        role === 'division_admin' ||
        role === 'unit_admin'

    if (!hasAccess) {
        return (
            <LayoutWrapper>
                <div className="container p-20 flex items-center justify-center">
                    <div className="text-center space-y-6 max-w-md p-10 border border-border bg-card shadow-soft-lg rounded-xl">
                        <div className="mx-auto h-20 w-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center">
                            <Shield className="h-10 w-10" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">Access Denied</h2>
                        <p className="font-medium text-muted-foreground">
                            Your security clearance is insufficient for organization architecture protocols.
                        </p>
                        <Button variant="outline" className="shadow-sm hover:shadow-md rounded-lg" onClick={() => window.history.back()}>
                            Return to Dashboard
                        </Button>
                    </div>
                </div>
            </LayoutWrapper>
        )
    }

    const orgStats = {
        divisions: chartData?.rootUnits?.length || 0,
        units: chartData?.units?.length || 0,
        members: chartData?.memberCounts?.length || 0
    }

    return (
        <LayoutWrapper>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header Area */}
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-6 border-b border-border/50">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-primary text-white rounded-xl shadow-md">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Command Center</h1>
                        </div>
                        <p className="text-muted-foreground pl-12 text-sm">
                            Architectural oversight of {chartData?.organization?.name || "The Organization"}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="h-9 px-4 rounded-lg bg-muted text-muted-foreground font-medium shadow-sm">
                            Role: {role?.replace('_', ' ')}
                        </Badge>

                        <Button
                            className="bg-primary text-primary-foreground shadow-soft hover:shadow-soft-lg transition-all rounded-lg"
                            onClick={() => setSettingsDialogOpen(true)}
                        >
                            <Settings className="h-4 w-4 mr-2" />
                            Global Params
                        </Button>
                    </div>
                </div>

                {/* Tactical Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard
                        label="Central Org"
                        value="1"
                        icon={<Building2 className="h-5 w-5" />}
                        iconBg="bg-primary/10 text-primary"
                    />
                    <StatCard
                        label="Divisions"
                        value={orgStats.divisions.toString()}
                        icon={<MapPin className="h-5 w-5" />}
                        iconBg="bg-orange-500/10 text-orange-500"
                    />
                    <StatCard
                        label="Managed Units"
                        value={orgStats.units.toString()}
                        icon={<Grid3X3 className="h-5 w-5" />}
                        iconBg="bg-blue-500/10 text-blue-500"
                    />
                    <StatCard
                        label="Total Personnel"
                        value={orgStats.members.toString()}
                        icon={<Users className="h-5 w-5" />}
                        iconBg="bg-emerald-500/10 text-emerald-500"
                    />
                </div>

                {/* Operational Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                    <TabsList className="bg-muted/50 p-1 rounded-xl w-full md:w-auto inline-flex">
                        <TabsTrigger
                            value="units"
                            className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 transition-all"
                        >
                            <Layout className="h-4 w-4 mr-2" />
                            Unit Deployment
                        </TabsTrigger>
                        <TabsTrigger
                            value="chart"
                            className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-6 transition-all"
                        >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Hierarchy Visualizer
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="units" className="animate-in fade-in duration-500">
                        <div className="rounded-xl overflow-hidden shadow-soft border border-border/50 bg-card p-6">
                            <UnitManagement />
                        </div>
                    </TabsContent>

                    <TabsContent value="chart" className="animate-in fade-in duration-500">
                        <div className="rounded-xl overflow-hidden shadow-soft border border-border/50 bg-card p-6">
                            <OrganizationChart />
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Knowledge Base Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <InfoBlock
                        title="Unit Deployment"
                        items={[
                            "Configure and relocate operational units between sector divisions",
                            "Batch execute terminology updates and structural changes",
                            "Monitor personnel distribution across the entire hierarchy",
                            "Perform real-time architectural validation of unit status"
                        ]}
                    />
                    <InfoBlock
                        title="Strategic Visualization"
                        items={[
                            "Execute drag-and-drop structural updates via the Visualizer",
                            "Isolate specific branches for granular personnel review",
                            "Track organizational growth through integrated trend data",
                            "Sync high-level terminology with global application states"
                        ]}
                    />
                </div>

                <SettingsDialog
                    open={settingsDialogOpen}
                    onOpenChange={setSettingsDialogOpen}
                />
            </div>
        </LayoutWrapper>
    )
}

function StatCard({ label, value, icon, iconBg }: { label: string, value: string, icon: React.ReactNode, iconBg: string }) {
    return (
        <Card className="rounded-xl shadow-sm border border-border/50 hover:shadow-md transition-all">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-2.5 rounded-xl ${iconBg}`}>
                        {icon}
                    </div>
                    <Badge variant="outline" className="border-0 bg-muted/50 text-muted-foreground text-[10px]">
                        Active
                    </Badge>
                </div>
                <div className="space-y-1">
                    <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
                </div>
            </CardContent>
        </Card>
    )
}

function InfoBlock({ title, items }: { title: string, items: string[] }) {
    return (
        <div className="p-6 rounded-xl border border-border/50 bg-card shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
            <h3 className="text-lg font-bold flex items-center gap-3">
                <div className="h-1.5 w-8 bg-primary rounded-full" /> {title}
            </h3>
            <ul className="space-y-3">
                {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 group">
                        <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <ArrowUpRight className="h-3 w-3" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
