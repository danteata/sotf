import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUploader } from "@/components/file-uploader"
import { useToast } from "@/components/ui/use-toast"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useOrganization } from "@/hooks/use-organization"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, X, Check } from "lucide-react"
import { Checkbox } from "@radix-ui/react-checkbox"

const memberSchema = z.object({
  title: z.string().optional(),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  dob: z.string().optional(),
  birth_month: z.number().min(1).max(12).optional(),
  birth_day: z.number().min(1).max(31).optional(),
  gender: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  joined_date: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  unit_ids: z.array(z.string()).optional(),
  skills: z.string().optional(),
  avatar_url: z.string().optional(),
})

type MemberFormData = z.infer<typeof memberSchema>

interface MemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function MemberDialog({ open, onOpenChange, onSuccess }: MemberDialogProps) {
  const [activeTab, setActiveTab] = useState("basic")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      title: "",
      status: "visitor",
      country: "Ghana",
      unit_ids: [],
    },
  })

  // Register all select fields with react-hook-form
  useEffect(() => {
    register("title")
    register("gender")
    register("status")
    register("birth_month")
    register("birth_day")
    register("unit_ids")
  }, [register])

  // Load units when dialog opens
  const { organization } = useOrganization()
  const unitsData = useQuery(api.units.list, open && organization ? {} : "skip");

  const createMember = useMutation(api.members.create);

  const functionalUnits = unitsData?.filter(unit => unit.type === "functional" || unit.type === "ministry") || [];
  const adminUnits = unitsData?.filter(unit => unit.type === "administrative" || unit.type === "geographic") || [];

  // Handle photo upload completion
  const handlePhotoUpload = (url: string) => {
    setUploadedImageUrl(url)
    setValue("avatar_url", url)
  }

  // Remove uploaded photo
  const removePhoto = () => {
    setUploadedImageUrl(null)
    setValue("avatar_url", "")
  }

  // Handle unit selection changes
  const handleUnitToggle = (unitId: string, checked: boolean) => {
    const currentUnits = watch("unit_ids") || [];
    if (checked) {
      setValue("unit_ids", [...currentUnits, unitId]);
    } else {
      setValue("unit_ids", currentUnits.filter(id => id !== unitId));
    }
  };

  const onSubmit = async (data: MemberFormData) => {
    setIsSubmitting(true)
    try {
      await createMember({
        name: `${data.first_name} ${data.last_name}`,
        email: data.email,
        phone: data.phone,
        status: data.status,
        dob: data.dob,
        birth_month: data.birth_month,
        birth_day: data.birth_day,
        gender: data.gender,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        country: data.country,
        organization_id: organization?._id,
        unit_ids: (data.unit_ids || []).map(id => id as any),
        avatar_url: data.avatar_url,
      });

      toast({
        title: "Success",
        description: "Member added successfully",
      })

      // Reset form and close dialog
      reset()
      setUploadedImageUrl(null)
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error("Submission error:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Create a wrapper function for handleSubmit
  const onSubmitWrapper = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    handleSubmit(onSubmit)(e)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[calc(100%-2rem)] sm:w-[800px] max-h-[90vh] p-0 overflow-hidden border-neon glass-card"
      >
        <form onSubmit={onSubmitWrapper} className="flex flex-col h-full max-h-[90vh]">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-2xl font-bold tracking-tight text-gradient">Add New Member</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter the member's information. All fields marked with <span className="text-destructive">*</span> are required.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-4 p-1 bg-muted/50 rounded-xl border border-border/50">
                <TabsTrigger value="basic" className="rounded-lg data-active:bg-background data-active:shadow-soft transition-all text-xs sm:text-sm">Basic</TabsTrigger>
                <TabsTrigger value="contact" className="rounded-lg data-active:bg-background data-active:shadow-soft transition-all text-xs sm:text-sm">Contact</TabsTrigger>
                <TabsTrigger value="units" className="rounded-lg data-active:bg-background data-active:shadow-soft transition-all text-xs sm:text-sm">Units</TabsTrigger>
                <TabsTrigger value="photo" className="rounded-lg data-active:bg-background data-active:shadow-soft transition-all text-xs sm:text-sm">Photo</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <TabsContent value="basic" className="space-y-6 mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-1 space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">Title</Label>
                    <Select onValueChange={(value) => setValue("title", value)}>
                      <SelectTrigger id="title" className="rounded-lg bg-background/50 border-input-border">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl border-border/50">
                        <SelectItem value="mr">Mr.</SelectItem>
                        <SelectItem value="mrs">Mrs.</SelectItem>
                        <SelectItem value="ms">Ms.</SelectItem>
                        <SelectItem value="dr">Dr.</SelectItem>
                        <SelectItem value="rev">Rev.</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <Label htmlFor="first_name" className="text-sm font-medium after:content-['*'] after:text-destructive after:ml-0.5">
                      First Name
                    </Label>
                    <Input id="first_name" {...register("first_name")} className="rounded-lg bg-background/50 border-input-border focus-visible:ring-primary/20" />
                    {errors.first_name && (
                      <p className="text-xs font-medium text-destructive mt-1">{errors.first_name.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="text-sm font-medium after:content-['*'] after:text-destructive after:ml-0.5">
                      Last Name
                    </Label>
                    <Input {...register("last_name")} className="rounded-lg bg-background/50 border-input-border focus-visible:ring-primary/20" />
                    {errors.last_name && (
                      <p className="text-xs font-medium text-destructive mt-1">{errors.last_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-medium after:content-['*'] after:text-destructive after:ml-0.5">
                      Status
                    </Label>
                    <Select onValueChange={(value) => setValue("status", value)} defaultValue="visitor">
                      <SelectTrigger className="rounded-lg bg-background/50 border-input-border">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl border-border/50">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="visitor">Visitor</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.status && (
                      <p className="text-xs font-medium text-destructive mt-1">{errors.status.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="dob" className="text-sm font-medium">Date of Birth</Label>
                    <Input type="date" {...register("dob")} className="rounded-lg bg-background/50 border-input-border focus-visible:ring-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender" className="text-sm font-medium">Gender</Label>
                    <Select onValueChange={(value) => setValue("gender", value)}>
                      <SelectTrigger className="rounded-lg bg-background/50 border-input-border">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl border-border/50">
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="birth_month" className="text-sm font-medium">Birth Month</Label>
                    <Select onValueChange={(value) => setValue("birth_month", parseInt(value))}>
                      <SelectTrigger className="rounded-lg bg-background/50 border-input-border">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl border-border/50">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                          <SelectItem key={month} value={month.toString()}>
                            {new Date(0, month - 1).toLocaleString('en', { month: 'long' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_day" className="text-sm font-medium">Birth Day</Label>
                    <Select onValueChange={(value) => setValue("birth_day", parseInt(value))}>
                      <SelectTrigger className="rounded-lg bg-background/50 border-input-border">
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl border-border/50">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-6 mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium after:content-['*'] after:text-destructive after:ml-0.5">
                      Email address
                    </Label>
                    <Input {...register("email")} type="email" placeholder="example@email.com" className="rounded-lg bg-background/50 border-input-border focus-visible:ring-primary/20" />
                    {errors.email && (
                      <p className="text-xs font-medium text-destructive mt-1">{errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium after:content-['*'] after:text-destructive after:ml-0.5">
                      Phone number
                    </Label>
                    <Input {...register("phone")} placeholder="+233..." className="rounded-lg bg-background/50 border-input-border focus-visible:ring-primary/20" />
                    {errors.phone && (
                      <p className="text-xs font-medium text-destructive mt-1">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium">Residential Address</Label>
                  <Input {...register("address")} placeholder="123 Street Name" className="rounded-lg bg-background/50 border-input-border focus-visible:ring-primary/20" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-medium">City</Label>
                    <Input {...register("city")} className="rounded-lg bg-background/50 border-input-border focus-visible:ring-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-sm font-medium">State / Region</Label>
                    <Input {...register("state")} className="rounded-lg bg-background/50 border-input-border focus-visible:ring-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip" className="text-sm font-medium">ZIP / Postal Code</Label>
                    <Input {...register("zip")} className="rounded-lg bg-background/50 border-input-border focus-visible:ring-primary/20" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="units" className="space-y-8 mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold text-gradient">Functional Units</Label>
                      <Badge variant="outline" className="rounded-full bg-muted/30 text-[10px] uppercase tracking-wider">Departmental</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Select functional units such as departments, teams, or specialty groups.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-border/50 rounded-xl p-4 bg-muted/20 scrollbar-thin">
                      {functionalUnits.map((unit) => (
                        <div key={unit._id} className="flex items-center space-x-3 p-2.5 hover:bg-background/80 rounded-lg transition-all border border-transparent hover:border-border/50 group">
                          <Checkbox
                            id={`unit-${unit._id}`}
                            checked={watch("unit_ids")?.includes(unit._id) || false}
                            onCheckedChange={(checked) => handleUnitToggle(unit._id, !!checked)}
                            className="h-4 w-4 rounded-md border-primary/50 data-[state=checked]:bg-primary"
                          />
                          <label htmlFor={`unit-${unit._id}`} className="text-sm font-medium cursor-pointer flex-1 group-hover:text-primary transition-colors">
                            {unit.name}
                          </label>
                        </div>
                      ))}
                      {functionalUnits.length === 0 && (
                        <div className="col-span-2 text-center py-6 text-muted-foreground italic text-sm">
                          No functional units available.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold text-gradient">Administrative Units</Label>
                      <Badge variant="outline" className="rounded-full bg-muted/30 text-[10px] uppercase tracking-wider">Geographic</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Select administrative or geographic units for organizational structuring.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-border/50 rounded-xl p-4 bg-muted/20 scrollbar-thin">
                      {adminUnits.map((unit) => (
                        <div key={unit._id} className="flex items-center space-x-3 p-2.5 hover:bg-background/80 rounded-lg transition-all border border-transparent hover:border-border/50 group">
                          <Checkbox
                            id={`unit-${unit._id}`}
                            checked={watch("unit_ids")?.includes(unit._id) || false}
                            onCheckedChange={(checked) => handleUnitToggle(unit._id, !!checked)}
                            className="h-4 w-4 rounded-md border-primary/50 data-[state=checked]:bg-primary"
                          />
                          <label htmlFor={`unit-${unit._id}`} className="text-sm font-medium cursor-pointer flex-1 group-hover:text-primary transition-colors">
                            {unit.name}
                          </label>
                        </div>
                      ))}
                      {adminUnits.length === 0 && (
                        <div className="col-span-2 text-center py-6 text-muted-foreground italic text-sm">
                          No administrative units available.
                        </div>
                      )}
                    </div>
                  </div>

                  {watch("unit_ids") && watch("unit_ids")!.length > 0 && (
                    <div className="pt-4 border-t border-border/50">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-3">Selected Units</Label>
                      <div className="flex flex-wrap gap-2">
                        {watch("unit_ids")?.map((unitId) => {
                          const unit = unitsData?.find(u => u._id === unitId);
                          return unit ? (
                            <Badge key={unitId} variant="secondary" className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-all cursor-default">
                              <Check className="h-3 w-3" />
                              <span className="text-xs font-semibold">{unit.name}</span>
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="photo" className="mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col items-center space-y-6 pt-4">
                  <div className="relative group">
                    <Avatar className="w-40 h-40 border-4 border-muted/50 rounded-3xl shadow-xl transition-transform group-hover:scale-105 duration-500">
                      <AvatarImage src={uploadedImageUrl || ""} className="object-cover" />
                      <AvatarFallback className="bg-muted/30 rounded-3xl">
                        <Upload className="w-10 h-10 text-muted-foreground/50" />
                      </AvatarFallback>
                    </Avatar>
                    {uploadedImageUrl && (
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={removePhoto}
                        className="absolute -top-2 -right-2 h-8 w-8 rounded-full shadow-lg hover:scale-110 transition-transform"
                        title="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="w-full max-w-sm space-y-4">
                    <FileUploader onUploadComplete={handlePhotoUpload} />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        Supported formats: <span className="font-semibold">JPG, PNG, GIF</span>.
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Recommended size: 400x400px. Max size: 2MB.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="p-6 pt-4 border-t border-border/50 bg-muted/10">
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="rounded-lg hover:bg-muted font-medium">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[140px] rounded-lg shadow-soft hover:shadow-soft-lg transition-all font-semibold"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Saving...
                </span>
              ) : (
                "Create Member"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
