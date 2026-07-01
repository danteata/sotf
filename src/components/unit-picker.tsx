"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface UnitOption {
    _id: string
    name: string
    type?: string
}

interface UnitPickerProps {
    units: UnitOption[]
    selectedIds: string[]
    onToggle: (id: string) => void
    className?: string
    emptyText?: string
}

const TYPE_LABEL: Record<string, string> = {
    functional: "Functional",
    ministry: "Ministry",
    administrative: "Administrative",
    geographic: "Geographic",
    organization: "Organization",
}

// Shared unit selection list used by both the add- and edit-member dialogs so
// the "Units" step looks and behaves identically in each.
export function UnitPicker({
    units,
    selectedIds,
    onToggle,
    className,
    emptyText = "No units available.",
}: UnitPickerProps) {
    const [query, setQuery] = useState("")
    const filtered = query
        ? units.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
        : units

    return (
        <div className={className}>
            <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search units…"
                    className="pl-8 rounded-lg"
                />
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border border-border/60 divide-y divide-border/40">
                {filtered.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">{emptyText}</div>
                ) : (
                    filtered.map((unit) => {
                        const checked = selectedIds.includes(unit._id)
                        return (
                            <label
                                key={unit._id}
                                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                                    checked ? "bg-primary/5" : "hover:bg-muted/50"
                                }`}
                            >
                                <Checkbox
                                    checked={checked}
                                    onCheckedChange={() => onToggle(unit._id)}
                                    className="h-4 w-4 border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium truncate">{unit.name}</div>
                                    {unit.type && (
                                        <div className="text-xs text-muted-foreground">
                                            {TYPE_LABEL[unit.type] || unit.type}
                                        </div>
                                    )}
                                </div>
                            </label>
                        )
                    })
                )}
            </div>

            {selectedIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                    {selectedIds.map((id) => {
                        const unit = units.find((u) => u._id === id)
                        if (!unit) return null
                        return (
                            <Badge key={id} variant="secondary" className="font-normal">
                                {unit.name}
                            </Badge>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
