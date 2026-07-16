'use client'

import { LayoutWrapper } from "@/components/layout-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Loader2, Crown } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import MapView from "../../../components/map-view";
import { Member } from "@/types/database";
import { useSubscription } from "@/providers/SubscriptionProvider";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useUserRole } from "@/hooks/use-user-role";

export default function MapPage() {
    const { isPro, loading: subLoading } = useSubscription();
    const { role } = useUserRole();
    const isSuperAdmin = role === "super_admin";
    const canUseMap = isPro || isSuperAdmin;

    const membersData = useQuery(
        api.members.getAll,
        canUseMap ? {} : "skip",
    );
    const members = ((membersData ?? []) as unknown as Member[]).map((m: any) => ({
        ...m,
        id: m._id || m.id
    }));

    return (
        <LayoutWrapper>
            <div className="container mx-auto py-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-6 w-6" />
                            Member Map
                        </CardTitle>
                        <CardDescription>
                            See where members live relative to your church.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {subLoading ? (
                            <div className="h-[400px] bg-muted rounded-lg flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : !canUseMap ? (
                            <div className="h-[400px] rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-4 px-6 text-center">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Crown className="h-6 w-6 text-primary" />
                                </div>
                                <div className="space-y-1 max-w-sm">
                                    <h3 className="font-semibold">Member map is a Pro feature</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Upgrade to plot member addresses, plan outreach, and see your congregation geographically.
                                    </p>
                                </div>
                                <Button asChild>
                                    <Link to="/billing">Upgrade to Pro</Link>
                                </Button>
                            </div>
                        ) : membersData === undefined ? (
                            <div className="h-[600px] bg-muted rounded-lg flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <MapView members={members} />
                        )}
                    </CardContent>
                </Card>
            </div>
        </LayoutWrapper>
    );
}
