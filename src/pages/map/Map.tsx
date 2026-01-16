
import { useState, useMemo } from 'react'
import MapView from '@/components/map-view'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Search, MapPin, Filter, Layers, Users } from 'lucide-react'
import { LayoutWrapper } from '@/components/layout-wrapper'
import { useManagedMembers, useAccessibleMinistriesAndRegions } from '@/hooks/use-user-role'

export default function MapPage() {
    // State for filters
    const [statusFilter, setStatusFilter] = useState('all')
    const [ministryFilter, setMinistryFilter] = useState('all')
    const [regionFilter, setRegionFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')

    // Fetch members data using Convex hook (already scoped by leadership)
    const { members, isLoading: membersLoading } = useManagedMembers()

    // Fetch accessible ministries and regions
    const { ministries, regions, isLoading: filtersLoading } = useAccessibleMinistriesAndRegions()

    const filteredMembers = useMemo(() => {
        let filtered = [...members];

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(member => member.status === statusFilter);
        }

        // Apply ministry filter - support multiple ministries per member
        if (ministryFilter !== 'all') {
            filtered = filtered.filter(member => {
                if (!member.ministry_names || !Array.isArray(member.ministry_names)) {
                    return false;
                }
                // Check if any of the member's ministries exactly matches the filter
                return member.ministry_names.some((ministry: string) =>
                    ministry && (ministry.trim() === ministryFilter.trim() || ministry === ministryFilter)
                );
            });
        }

        // Apply region filter
        if (regionFilter !== 'all') {
            filtered = filtered.filter(member => member.region_name === regionFilter);
        }

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(member =>
                member.name.toLowerCase().includes(query) ||
                (member.email && member.email.toLowerCase().includes(query)) ||
                (member.phone && member.phone.toLowerCase().includes(query))
            );
        }

        // Only show members with location data
        filtered = filtered.filter(member => member.latitude && member.longitude);

        return filtered;
    }, [members, statusFilter, ministryFilter, searchQuery, regionFilter]);

    const totalMembers = filteredMembers.length;

    return (
        <LayoutWrapper>
            <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-black text-primary rounded-xl">
                                <MapPin className="h-8 w-8" />
                            </div>
                            <h1 className="text-4xl font-black uppercase tracking-tighter">Geospatial Overview</h1>
                        </div>
                        <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 pl-1">
                            <Users className="h-4 w-4" /> Personnel Deployment Database
                        </p>
                    </div>

                    <div className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl border-2 border-black shadow-brutal-sm">
                        <span className="font-black text-2xl tracking-tighter">{totalMembers}</span>
                        <span className="font-bold uppercase text-[10px] tracking-widest text-white/60 pt-1">Tactical Units On Map</span>
                    </div>
                </div>

                {/* Filter controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-8 border-4 border-black shadow-brutal rounded-[32px] bg-white">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest pl-1 flex items-center gap-2">
                            <Filter className="h-3 w-3" /> Mission Status
                        </label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-12 border-3 border-black font-bold uppercase rounded-xl">
                                <SelectValue placeholder="DEPLOYMENT_STATUS" />
                            </SelectTrigger>
                            <SelectContent className="border-3 border-black rounded-xl">
                                <SelectItem value="all" className="font-bold uppercase text-xs">ALL_STATUS</SelectItem>
                                <SelectItem value="active" className="font-bold uppercase text-xs">ACTIVE_DUTY</SelectItem>
                                <SelectItem value="inactive" className="font-bold uppercase text-xs">OFF_ROTATION</SelectItem>
                                <SelectItem value="visitor" className="font-bold uppercase text-xs">EXTERNAL_VISITOR</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest pl-1 flex items-center gap-2">
                            <Layers className="h-3 w-3" /> Division / Ministry
                        </label>
                        <Select value={ministryFilter} onValueChange={setMinistryFilter}>
                            <SelectTrigger className="h-12 border-3 border-black font-bold uppercase rounded-xl">
                                <SelectValue placeholder="TACTICAL_UNIT" />
                            </SelectTrigger>
                            <SelectContent className="border-3 border-black rounded-xl">
                                <SelectItem value="all" className="font-bold uppercase text-xs">ALL_DIVISIONS</SelectItem>
                                {ministries.map((ministry) => (
                                    <SelectItem key={ministry.id} value={ministry.name} className="font-bold uppercase text-xs">
                                        {ministry.name.toUpperCase()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest pl-1 flex items-center gap-2">
                            <MapPin className="h-3 w-3" /> Jurisdiction / Region
                        </label>
                        <Select value={regionFilter} onValueChange={setRegionFilter}>
                            <SelectTrigger className="h-12 border-3 border-black font-bold uppercase rounded-xl">
                                <SelectValue placeholder="SECTOR_CONTROL" />
                            </SelectTrigger>
                            <SelectContent className="border-3 border-black rounded-xl">
                                <SelectItem value="all" className="font-bold uppercase text-xs">ALL_SECTORS</SelectItem>
                                {regions.map((region) => (
                                    <SelectItem key={region.id} value={region.name} className="font-bold uppercase text-xs">
                                        {region.name.toUpperCase()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest pl-1 flex items-center gap-2">
                            <Search className="h-3 w-3" /> Personnel Search
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="IDENT_NUMBER_OR_NAME..."
                                className="h-12 pl-10 border-3 border-black font-bold uppercase rounded-xl"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Map view container with brutalist border */}
                <div className="relative border-4 border-black shadow-brutal rounded-[40px] overflow-hidden group">
                    <div className="absolute top-4 left-4 z-10 p-4 bg-black/90 text-white rounded-2xl border-2 border-primary/50 shadow-lg backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Live_Geospatial_Uplink</span>
                        </div>
                    </div>
                    <div className="h-[650px] w-full bg-muted/50">
                        {membersLoading ? (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                                <Loader2 className="h-16 w-16 animate-spin text-black stroke-[3px]" />
                                <p className="font-black uppercase tracking-widest text-xs">Decrypting_Satellite_Data...</p>
                            </div>
                        ) : (
                            <MapView members={filteredMembers} />
                        )}
                    </div>
                </div>
            </div>
        </LayoutWrapper>
    )
}

function Loader2({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    )
}
