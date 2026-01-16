'use client'

import { useState } from "react"
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
    DialogDescription,
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
import { useUserRole } from "@/hooks/use-user-role"
import { useToast } from "@/hooks/use-toast"
import { Plus, Edit, Trash2, Tag, Users, Palette, Info, Check } from "lucide-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import { useOrganization } from "@/hooks/use-organization"

interface LabelManagementProps {
    onLabelsChange?: () => void
}

export function LabelManagement({ onLabelsChange }: LabelManagementProps) {
    const { user, isAdmin } = useUserRole()
    const { toast } = useToast()
    const { context } = useOrganization()

    // Convex Queries
    const labels = useQuery(api.labels.list, {
        organization_id: context?.organization?._id as Id<"organizations">
    }) || []

    // Convex Mutations
    const createLabel = useMutation(api.labels.create)
    const updateLabel = useMutation(api.labels.update)
    const removeLabel = useMutation(api.labels.remove)

    const [loading, setLoading] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingLabel, setEditingLabel] = useState<any | null>(null)
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        color: "#3B82F6",
        category: "custom",
    })

    const predefinedColors = [
        "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16",
        "#22C55E", "#10B981", "#14B8A6", "#06B6D4", "#0EA5E9",
        "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7", "#D946EF",
        "#EC4899", "#F43F5E", "#000000", "#6B7280", "#374151"
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isAdmin) return
        setLoading(true)

        try {
            if (editingLabel) {
                await updateLabel({
                    id: editingLabel._id,
                    updates: {
                        name: formData.name.trim(),
                        description: formData.description.trim(),
                        color: formData.color,
                        category: formData.category,
                    }
                })
                toast({ title: "Success", description: "Label updated successfully" })
            } else {
                await createLabel({
                    name: formData.name.trim(),
                    description: formData.description.trim(),
                    color: formData.color,
                    category: formData.category,
                    is_system_label: false,
                    organization_id: context?.organization?._id as Id<"organizations">,
                    created_by: user?.clerk_user_id,
                    created_by_name: user?.name,
                })
                toast({ title: "Success", description: "Label created successfully" })
            }

            onLabelsChange?.()
            resetForm()
            setDialogOpen(false)
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (label: any) => {
        if (!isAdmin) return
        try {
            await removeLabel({ id: label._id })
            toast({ title: "Success", description: "Label deleted successfully" })
            onLabelsChange?.()
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        }
    }

    const handleEdit = (label: any) => {
        setEditingLabel(label)
        setFormData({
            name: label.name,
            description: label.description || "",
            color: label.color,
            category: label.category || "custom",
        })
        setDialogOpen(true)
    }

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            color: "#3B82F6",
            category: "custom",
        })
        setEditingLabel(null)
    }

    const groupedLabels = labels.reduce((acc, label: any) => {
        const category = label.category || 'other'
        if (!acc[category]) acc[category] = []
        acc[category].push(label)
        return acc
    }, {} as Record<string, any[]>)

    if (!isAdmin) {
        return (
            <div className="text-center py-20 bg-muted/20 border-4 border-dashed border-black rounded-3xl">
                <Tag className="mx-auto h-16 w-16 mb-6 text-black/20" />
                <h3 className="text-xl font-black uppercase mb-2">RESTRICTED AREA</h3>
                <p className="font-bold text-muted-foreground uppercase text-xs">You need administrator privileges to manage member labels</p>
            </div>
        )
    }

    return (
        <div className="space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h2 className="text-4xl font-black uppercase tracking-tighter">Label Control</h2>
                    <p className="text-muted-foreground font-bold uppercase text-xs flex items-center gap-2">
                        <Palette className="h-4 w-4" /> Architect the taxonomy of your community
                    </p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={(open) => {
                    setDialogOpen(open)
                    if (!open) resetForm()
                }}>
                    <DialogTrigger asChild>
                        <Button
                            className="h-14 px-8 border-4 border-black bg-primary text-black hover:bg-primary shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all rounded-2xl font-black uppercase"
                        >
                            <Plus className="w-6 h-6 mr-3 stroke-[3px]" />
                            Create New Label
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[550px] p-0 border-4 border-black shadow-brutal rounded-3xl overflow-hidden">
                        <DialogHeader className="p-8 bg-black text-white">
                            <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                                {editingLabel ? <Edit className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                                {editingLabel ? 'Update Label' : 'New Label Identity'}
                            </DialogTitle>
                            <DialogDescription className="text-white/60 font-bold uppercase text-[10px]">
                                Configure labels to categorize and track member engagement
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <FormLabel className="font-black uppercase text-[10px] tracking-widest pl-1">Label Name</FormLabel>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. CORE TEAM"
                                        className="border-3 border-black h-12 font-bold uppercase text-sm"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <FormLabel className="font-black uppercase text-[10px] tracking-widest pl-1">Category</FormLabel>
                                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                                        <SelectTrigger className="border-3 border-black h-12 font-bold uppercase text-sm">
                                            <SelectValue placeholder="CATEGORY" />
                                        </SelectTrigger>
                                        <SelectContent className="border-3 border-black shadow-brutal rounded-xl">
                                            {categories.map(category => (
                                                <SelectItem key={category} value={category} className="font-bold uppercase text-xs">
                                                    {category}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <FormLabel className="font-black uppercase text-[10px] tracking-widest pl-1">Description</FormLabel>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Briefly explain the criteria for this label"
                                    rows={3}
                                    className="border-3 border-black font-bold text-sm resize-none"
                                />
                            </div>

                            <div className="space-y-4">
                                <FormLabel className="font-black uppercase text-[10px] tracking-widest pl-1">Visual Identity</FormLabel>
                                <div className="p-4 border-3 border-black rounded-xl bg-muted/30">
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {predefinedColors.map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, color })}
                                                className={cn(
                                                    "w-10 h-10 rounded-lg border-3 transition-all",
                                                    formData.color === color ? "border-black scale-110 shadow-brutal-sm ring-4 ring-primary/20" : "border-black/10 hover:border-black/40"
                                                )}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <Palette className="h-4 w-4 text-white drop-shadow-md" />
                                            </div>
                                            <Input
                                                type="color"
                                                value={formData.color}
                                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                                className="w-10 h-10 p-0 border-3 border-black rounded-lg cursor-pointer overflow-hidden"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="pt-4">
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-14 border-4 border-black shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all rounded-2xl font-black uppercase text-lg"
                                >
                                    {loading ? "PROCESSING..." : editingLabel ? 'UPDATE LABEL' : 'SAVE LABEL IDENTITY'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="all" className="w-full space-y-8">
                <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-2">
                    <TabsTrigger value="all" className="border-3 border-black data-[state=active]:bg-black data-[state=active]:text-white font-black uppercase text-xs h-10 px-6 rounded-xl shadow-brutal-sm hover:translate-y-[-2px] transition-all">All Inventory</TabsTrigger>
                    <TabsTrigger value="system" className="border-3 border-black data-[state=active]:bg-black data-[state=active]:text-white font-black uppercase text-xs h-10 px-6 rounded-xl shadow-brutal-sm hover:translate-y-[-2px] transition-all">Core Protocols</TabsTrigger>
                    <TabsTrigger value="custom" className="border-3 border-black data-[state=active]:bg-black data-[state=active]:text-white font-black uppercase text-xs h-10 px-6 rounded-xl shadow-brutal-sm hover:translate-y-[-2px] transition-all">Custom Deployments</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-8 animate-in fade-in duration-500">
                    {Object.entries(groupedLabels).length === 0 ? (
                        <div className="text-center py-20 border-4 border-dashed border-black/10 rounded-3xl opacity-50">
                            <Info className="mx-auto h-12 w-12 mb-4" />
                            <p className="font-black uppercase text-sm italic">No labels detected in central inventory</p>
                        </div>
                    ) : (
                        Object.entries(groupedLabels).map(([category, categoryLabels]) => (
                            <section key={category} className="space-y-4">
                                <div className="flex items-center gap-3 pl-1">
                                    <div className="h-1.5 w-8 bg-black rounded-full" />
                                    <h3 className="text-xl font-black uppercase tracking-tight">{category} LABELS</h3>
                                    <Badge className="bg-muted border-2 border-black text-black font-black uppercase text-[10px]">{categoryLabels.length}</Badge>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {categoryLabels.map(label => (
                                        <Card key={label._id} className="border-4 border-black shadow-brutal-sm hover:shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all overflow-hidden rounded-2xl group">
                                            <CardHeader className="p-0 border-b-4 border-black">
                                                <div className="h-3 w-full" style={{ backgroundColor: label.color }} />
                                            </CardHeader>
                                            <CardContent className="p-5 flex items-center justify-between">
                                                <div className="space-y-1 min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-sm uppercase truncate">{label.name}</span>
                                                        {label.is_system_label && <Shield className="h-3 w-3 text-muted-foreground" />}
                                                    </div>
                                                    {label.description && (
                                                        <p className="text-[10px] font-bold text-muted-foreground leading-tight line-clamp-2 uppercase">
                                                            {label.description}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-2 pt-2">
                                                        <div className="flex items-center gap-1 text-[10px] font-black text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-black/5 uppercase">
                                                            <Users className="h-3 w-3" /> {label.usage_count || 0}
                                                        </div>
                                                        <Badge variant="outline" className="text-[8px] font-black border-black/20 uppercase tracking-widest">{label.category}</Badge>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1 pl-4">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(label)}
                                                        className="h-9 w-9 border-2 border-transparent hover:border-black hover:bg-primary transition-all rounded-lg"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    {!label.is_system_label && (
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-9 w-9 border-2 border-transparent hover:border-black hover:bg-destructive hover:text-white transition-all rounded-lg"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent className="border-4 border-black shadow-brutal rounded-3xl">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle className="font-black uppercase text-2xl">PURGE LABEL?</AlertDialogTitle>
                                                                    <AlertDialogDescription className="font-bold text-black uppercase text-xs">
                                                                        You are about to delete <span className="underline decoration-destructive">"{label.name}"</span>.
                                                                        This action will strip this label from all assigned members.
                                                                        <span className="block mt-4 text-destructive p-3 bg-destructive/10 border-2 border-dashed border-destructive rounded-xl">
                                                                            WARNING: DATA LOSS IS IRREVERSIBLE.
                                                                        </span>
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter className="gap-2">
                                                                    <AlertDialogCancel className="border-3 border-black font-black uppercase rounded-xl">ABORT</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={() => handleDelete(label)}
                                                                        className="bg-destructive text-white border-3 border-black font-black uppercase rounded-xl hover:bg-destructive shadow-brutal-sm"
                                                                    >
                                                                        CONFIRM DELETE
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </section>
                        ))
                    )}
                </TabsContent>

                {/* Other Tabs content would follow similar pattern with different filters */}
                <TabsContent value="system" className="animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {labels.filter((l: any) => l.is_system_label).map((label: any) => (
                            <Card key={label._id} className="border-4 border-black shadow-brutal-sm hover:shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all overflow-hidden rounded-2xl group">
                                <CardHeader className="p-0 border-b-4 border-black">
                                    <div className="h-3 w-full" style={{ backgroundColor: label.color }} />
                                </CardHeader>
                                <CardContent className="p-5 flex items-center justify-between">
                                    <div className="space-y-1 min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-sm uppercase truncate">{label.name}</span>
                                            <Shield className="h-3 w-3 text-primary" />
                                        </div>
                                        <p className="text-[10px] font-bold text-muted-foreground leading-tight line-clamp-2 uppercase">System generated protocol</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="custom" className="animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {labels.filter((l: any) => !l.is_system_label).map((label: any) => (
                            <Card key={label._id} className="border-4 border-black shadow-brutal-sm hover:shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all overflow-hidden rounded-2xl group">
                                <CardHeader className="p-0 border-b-4 border-black">
                                    <div className="h-3 w-full" style={{ backgroundColor: label.color }} />
                                </CardHeader>
                                <CardContent className="p-5 flex items-center justify-between">
                                    <div className="space-y-1 min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-sm uppercase truncate">{label.name}</span>
                                        </div>
                                        {label.description && (
                                            <p className="text-[10px] font-bold text-muted-foreground leading-tight line-clamp-2 uppercase">
                                                {label.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1 pl-4">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(label)}
                                            className="h-9 w-9 border-2 border-transparent hover:border-black hover:bg-primary transition-all rounded-lg"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}

function Shield({ className }: { className?: string }) {
    return (
        <div className={cn("flex items-center justify-center rounded-full bg-black/5 p-1", className)}>
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
                className="h-full w-full"
            >
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            </svg>
        </div>
    )
}
