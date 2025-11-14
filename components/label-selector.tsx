"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label as FormLabel } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { X, Tag, Plus, Check } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useUserRole } from "@/hooks/use-user-role"
import type { Label, MemberLabel } from "@/types/database"

interface LabelSelectorProps {
    memberId: string
    currentLabels?: Label[]
    onLabelsChange?: (labels: Label[]) => void
    variant?: 'compact' | 'full'
    showDialog?: boolean
}

export function LabelSelector({
    memberId,
    currentLabels = [],
    onLabelsChange,
    variant = 'compact',
    showDialog = true
}: LabelSelectorProps) {
    const { user } = useUserRole()
    const [availableLabels, setAvailableLabels] = useState<Label[]>([])
    const [selectedLabels, setSelectedLabels] = useState<Label[]>(currentLabels)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [searchValue, setSearchValue] = useState("")

    // Load available labels
    useEffect(() => {
        loadLabels()
    }, [])

    // Update selected labels when currentLabels prop changes
    useEffect(() => {
        setSelectedLabels(currentLabels)
    }, [currentLabels])

    const loadLabels = async () => {
        try {
            const { data, error } = await supabase
                .from('labels')
                .select('*')
                .eq('is_active', true)
                .order('name')

            if (error) throw error
            setAvailableLabels(data || [])
        } catch (error) {
            console.error('Error loading labels:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleLabelToggle = async (label: Label) => {
        const isSelected = selectedLabels.some(l => l.id === label.id)
        let newLabels: Label[]

        if (isSelected) {
            // Remove label
            newLabels = selectedLabels.filter(l => l.id !== label.id)
            try {
                await supabase
                    .from('member_labels')
                    .delete()
                    .eq('member_id', memberId)
                    .eq('label_id', label.id)
            } catch (error) {
                console.error('Error removing label:', error)
                return
            }
        } else {
            // Add label
            newLabels = [...selectedLabels, label]
            try {
                const { error } = await supabase
                    .from('member_labels')
                    .insert({
                        member_id: memberId,
                        label_id: label.id,
                        assigned_by: user?.id,
                        assigned_by_name: user?.name
                    })

                if (error && !error.message.includes('duplicate key')) throw error
            } catch (error) {
                console.error('Error adding label:', error)
                return
            }
        }

        setSelectedLabels(newLabels)
        onLabelsChange?.(newLabels)
    }

    const handleCreateNewLabel = async (labelName: string) => {
        try {
            // Create the new label
            const { data: newLabel, error } = await supabase
                .from('labels')
                .insert({
                    name: labelName.trim(),
                    color: '#3B82F6', // Default blue color
                    category: 'custom',
                    is_system_label: false,
                    created_by: user?.id,
                    created_by_name: user?.name,
                    is_active: true,
                })
                .select()
                .single()

            if (error) throw error

            // Add it to available labels
            setAvailableLabels(prev => [...prev, newLabel])

            // Add it to selected labels and create the association
            const newLabels = [...selectedLabels, newLabel]
            setSelectedLabels(newLabels)

            try {
                const { error: assignError } = await supabase
                    .from('member_labels')
                    .insert({
                        member_id: memberId,
                        label_id: newLabel.id,
                        assigned_by: user?.id,
                        assigned_by_name: user?.name
                    })

                if (assignError && !assignError.message.includes('duplicate key')) throw assignError
            } catch (assignError) {
                console.error('Error assigning new label:', assignError)
                return
            }

            onLabelsChange?.(newLabels)
            setSearchValue("") // Clear search after creating
        } catch (error) {
            console.error('Error creating new label:', error)
        }
    }

    const filteredLabels = availableLabels.filter(label =>
        label.name.toLowerCase().includes(searchValue.toLowerCase())
    )

    // Check if the search value could be a new label
    const canCreateNewLabel = searchValue.trim().length > 0 &&
        !availableLabels.some(label =>
            label.name.toLowerCase() === searchValue.toLowerCase().trim()
        )

    const groupedLabels = filteredLabels.reduce((acc, label) => {
        const category = label.category || 'other'
        if (!acc[category]) acc[category] = []
        acc[category].push(label)
        return acc
    }, {} as Record<string, Label[]>)

    if (variant === 'compact') {
        return (
            <div className="flex flex-wrap gap-1">
                {selectedLabels.slice(0, 3).map((label) => (
                    <Badge
                        key={label.id}
                        variant="secondary"
                        className="text-xs"
                        style={{ backgroundColor: `${label.color}20`, borderColor: label.color }}
                    >
                        <Tag className="w-3 h-3 mr-1" style={{ color: label.color }} />
                        {label.name}
                        <button
                            onClick={() => handleLabelToggle(label)}
                            className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </Badge>
                ))}
                {selectedLabels.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                        +{selectedLabels.length - 3} more
                    </Badge>
                )}
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-6 px-2">
                            <Plus className="w-3 h-3" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                        <Command>
                            <CommandInput
                                placeholder="Search labels..."
                                value={searchValue}
                                onValueChange={setSearchValue}
                            />
                            <CommandList>
                                {Object.entries(groupedLabels).map(([category, labels]) => (
                                    <CommandGroup key={category} heading={category.charAt(0).toUpperCase() + category.slice(1)}>
                                        {labels.map((label) => {
                                            const isSelected = selectedLabels.some(l => l.id === label.id)
                                            return (
                                                <CommandItem
                                                    key={label.id}
                                                    onSelect={() => handleLabelToggle(label)}
                                                    className="flex items-center gap-2"
                                                >
                                                    <div
                                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: label.color }}
                                                    />
                                                    <span className="flex-1">{label.name}</span>
                                                    {isSelected && <Check className="w-4 h-4 text-green-600" />}
                                                </CommandItem>
                                            )
                                        })}
                                    </CommandGroup>
                                ))}

                                {/* Always show create option if search text doesn't match existing labels */}
                                {canCreateNewLabel && (
                                    <CommandGroup heading="Create New">
                                        <CommandItem
                                            onSelect={() => handleCreateNewLabel(searchValue)}
                                            className="flex items-center gap-2 text-blue-600"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>Create "{searchValue.trim()}"</span>
                                        </CommandItem>
                                    </CommandGroup>
                                )}

                                <CommandEmpty>No labels found.</CommandEmpty>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        )
    }

    // Full variant for dialog
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                {selectedLabels.map((label) => (
                    <Badge
                        key={label.id}
                        variant="secondary"
                        className="text-sm py-1 px-3"
                        style={{ backgroundColor: `${label.color}20`, borderColor: label.color }}
                    >
                        <Tag className="w-4 h-4 mr-2" style={{ color: label.color }} />
                        {label.name}
                        <button
                            onClick={() => handleLabelToggle(label)}
                            className="ml-2 hover:bg-gray-300 rounded-full p-0.5"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </Badge>
                ))}
            </div>

            <div className="border rounded-lg p-4">
                <FormLabel className="text-sm font-medium mb-2 block">Available Labels</FormLabel>
                <Input
                    placeholder="Search labels..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="mb-3"
                />

                <div className="max-h-60 overflow-y-auto space-y-3">
                    {/* Create new label option */}
                    {canCreateNewLabel && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Create New</h4>
                            <button
                                onClick={() => handleCreateNewLabel(searchValue)}
                                className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 w-full text-left transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm">Create "{searchValue.trim()}"</div>
                                    <div className="text-xs text-blue-600">Add as new custom label</div>
                                </div>
                            </button>
                        </div>
                    )}

                    {Object.entries(groupedLabels).map(([category, labels]) => (
                        <div key={category}>
                            <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                                {category}
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                                {labels.map((label) => {
                                    const isSelected = selectedLabels.some(l => l.id === label.id)
                                    return (
                                        <button
                                            key={label.id}
                                            onClick={() => handleLabelToggle(label)}
                                            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${isSelected
                                                ? 'border-blue-200 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div
                                                className="w-4 h-4 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: label.color }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm">{label.name}</div>
                                                {label.description && (
                                                    <div className="text-xs text-gray-500 truncate">
                                                        {label.description}
                                                    </div>
                                                )}
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// Compact version for use in tables/lists
export function MemberLabels({ labels }: { labels: Label[] }) {
    if (!labels || labels.length === 0) {
        return <span className="text-gray-400 text-sm">No labels</span>
    }

    return (
        <div className="flex flex-wrap gap-1">
            {labels.slice(0, 2).map((label) => (
                <Badge
                    key={label.id}
                    variant="secondary"
                    className="text-xs px-2 py-0.5"
                    style={{ backgroundColor: `${label.color}20`, borderColor: label.color }}
                >
                    <Tag className="w-3 h-3 mr-1" style={{ color: label.color }} />
                    {label.name}
                </Badge>
            ))}
            {labels.length > 2 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                    +{labels.length - 2}
                </Badge>
            )}
        </div>
    )
}
