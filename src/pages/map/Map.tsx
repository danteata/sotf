'use client'

import { LayoutWrapper } from "@/components/layout-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import MapView from "../../../components/map-view";
import { Member } from "@/types/database";

export default function MapPage() {
    const membersData = useQuery(api.members.getAll, {}) || [];
    const members = (membersData as Member[]).map((m: any) => ({
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
                    </CardHeader>
                    <CardContent>
                        {members.length > 0 ? (
                            <MapView members={members} />
                        ) : (
                            <div className="h-[600px] bg-muted rounded-lg flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </LayoutWrapper>
    );
}
