"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label as FormLabel } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { useUserRole } from "@/hooks/use-user-role"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Edit, Trash2, Tag, Users, Palette } from "lucide-react"
import type { Label } from "@/types/database"

interface LabelManagementProps {
    onLabelsChange?: () => void
}

export function LabelManagement({ onLabelsChange }: LabelManagementProps) {
    const { user, isAdmin } = useUserRole()
    const { toast } = useToast()
    const [labels, setLabels] = useState<Label[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingLabel, setEditingLabel] = useState<Label | null>(null)
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        color: "#3B82F6",
        category: "",
    })

    const predefinedColors = [
        "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16",
        "#22C55E", "#10B981", "#14B8A6", "#06B6D4", "#0EA5E9",
        "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7", "#D946EF",
        "#EC4899", "#F43F5E", "#64748B", "#6B7280", "#374151"
    ]

    const categories = [
        "status",
        "ministry",
        "demographic",
        "leadership",
        "skill",
        "interest",
        "custom"
    ]

    useEffect(() => {
        loadLabels()
    }, [])

    const loadLabels = async () => {
        try {
            const { data, error } = await supabase
                .from('labels')
                .select('*')
                .order('category', { ascending: true })
                .order('name', { ascending: true })

            if (error) throw error
            setLabels(data || [])
        } catch (error) {
            console.error('Error loading labels:', error)
            toast({
                title: "Error",
                description: "Failed to load labels",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isAdmin) return

        try {
            const labelData = {
                name: formData.name.trim(),
                description: formData.description.trim(),
                color: formData.color,
                category: formData.category,
                is_system_label: false,
                created_by: user?.id,
                created_by_name: user?.name,
                is_active: true,
            }

            if (editingLabel) {
                const { error } = await supabase
                    .from('labels')
                    .update(labelData)
                    .eq('id', editingLabel.id)

                if (error) throw error

                toast({
                    title: "Success",
                    description: "Label updated successfully",
                })
            } else {
                const { error } = await supabase
                    .from('labels')
                    .insert(labelData)

                if (error) throw error

                toast({
                    title: "Success",
                    description: "Label created successfully",
                })
            }

            loadLabels()
            onLabelsChange?.()
            resetForm()
            setDialogOpen(false)
        } catch (error: any) {
            console.error('Error saving label:', error)
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            })
        }
    }

    const handleDelete = async (label: Label) => {
        if (!isAdmin) return

        try {
            const { error } = await supabase
                .from('labels')
                .delete()
                .eq('id', label.id)

            if (error) throw error

            toast({
                title: "Success",
                description: "Label deleted successfully",
            })

            loadLabels()
            onLabelsChange?.()
        } catch (error: any) {
            console.error('Error deleting label:', error)
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            })
        }
    }

    const handleEdit = (label: Label) => {
        setEditingLabel(label)
        setFormData({
            name: label.name,
            description: label.description || "",
            color: label.color,
            category: label.category || "",
        })
        setDialogOpen(true)
    }

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            color: "#3B82F6",
            category: "",
        })
        setEditingLabel(null)
    }

    const groupedLabels = labels.reduce((acc, label) => {
        const category = label.category || 'other'
        if (!acc[category]) acc[category] = []
        acc[category].push(label)
        return acc
    }, {} as Record<string, Label[]>)

    if (!isAdmin) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <Tag className="mx-auto h-12 w-12 mb-4" />
                <p>You need admin privileges to manage labels</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Label Management</h2>
                    <p className="text-muted-foreground">Create and manage custom labels for your church members</p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Label
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>
                                {editingLabel ? 'Edit Label' : 'Create New Label'}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <FormLabel htmlFor="name">Label Name *</FormLabel>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Enter label name"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <FormLabel htmlFor="category">Category</FormLabel>
                                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(category => (
                                                <SelectItem key={category} value={category}>
                                                    {category.charAt(0).toUpperCase() + category.slice(1)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <FormLabel htmlFor="description">Description</FormLabel>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Optional description"
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <FormLabel>Color</FormLabel>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-16 h-10 p-1 border rounded"
                                    />
                                    <div className="flex flex-wrap gap-1">
                                        {predefinedColors.map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, color })}
                                                className={`w-6 h-6 rounded border-2 ${formData.color === color ? 'border-gray-900' : 'border-gray-300'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    {editingLabel ? 'Update' : 'Create'} Label
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="all" className="w-full">
                <TabsList>
                    <TabsTrigger value="all">All Labels</TabsTrigger>
                    <TabsTrigger value="system">System Labels</TabsTrigger>
                    <TabsTrigger value="custom">Custom Labels</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                    {Object.entries(groupedLabels).map(([category, categoryLabels]) => (
                        <Card key={category}>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Tag className="w-5 h-5" />
                                    {category.charAt(0).toUpperCase() + category.slice(1)} Labels
                                    <Badge variant="secondary">{categoryLabels.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {categoryLabels.map(label => (
                                        <div key={label.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-4 h-4 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: label.color }}
                                                />
                                                <div>
                                                    <div className="font-medium">{label.name}</div>
                                                    {label.description && (
                                                        <div className="text-sm text-muted-foreground">{label.description}</div>
                                                    )}
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Users className="w-3 h-3" />
                                                        {label.usage_count || 0} members
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(label)}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                {!label.is_system_label && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete Label</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Are you sure you want to delete "{label.name}"? This will remove it from all members who have this label.
                                                                    This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleDelete(label)}
                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                >
                                                                    Delete
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>

                <TabsContent value="system" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Labels</CardTitle>
                            <p className="text-sm text-muted-foreground">These are pre-built labels that come with the system</p>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {labels.filter(label => label.is_system_label).map(label => (
                                    <div key={label.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                        <div
                                            className="w-4 h-4 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: label.color }}
                                        />
                                        <div>
                                            <div className="font-medium">{label.name}</div>
                                            {label.description && (
                                                <div className="text-sm text-muted-foreground">{label.description}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="custom" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Custom Labels</CardTitle>
                            <p className="text-sm text-muted-foreground">Labels you have created for your church</p>
                        </CardHeader>
                        <CardContent>
                            {labels.filter(label => !label.is_system_label).length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Tag className="mx-auto h-12 w-12 mb-4" />
                                    <p>No custom labels yet</p>
                                    <p className="text-sm">Click "Add Label" to create your first custom label</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {labels.filter(label => !label.is_system_label).map(label => (
                                        <div key={label.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-4 h-4 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: label.color }}
                                                />
                                                <div>
                                                    <div className="font-medium">{label.name}</div>
                                                    {label.description && (
                                                        <div className="text-sm text-muted-foreground">{label.description}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(label)}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Label</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to delete "{label.name}"? This will remove it from all members who have this label.
                                                                This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(label)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
