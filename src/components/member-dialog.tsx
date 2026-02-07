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
      country: "United States",
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
        className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[calc(100%-2rem)] sm:w-[700px] max-h-[90vh] overflow-y-auto p-4 sm:p-6"
      >
        <form onSubmit={onSubmitWrapper} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription>Enter the member's information. All fields marked with * are required.</DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic" className="text-xs sm:text-sm">Basic Info</TabsTrigger>
              <TabsTrigger value="contact" className="text-xs sm:text-sm">Contact</TabsTrigger>
              <TabsTrigger value="units" className="text-xs sm:text-sm">Unit Assignment</TabsTrigger>
              <TabsTrigger value="photo" className="text-xs sm:text-sm">Photo</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <Label htmlFor="title">Title</Label>
                  <Select onValueChange={(value) => setValue("title", value)}>
                    <SelectTrigger id="title">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mr">Mr.</SelectItem>
                      <SelectItem value="mrs">Mrs.</SelectItem>
                      <SelectItem value="ms">Ms.</SelectItem>
                      <SelectItem value="dr">Dr.</SelectItem>
                      <SelectItem value="rev">Rev.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <Label htmlFor="first_name" className="after:content-['*'] after:text-red-500 after:ml-0.5">
                    First Name
                  </Label>
                  <Input id="first_name" {...register("first_name")} />
                  {errors.first_name && (
                    <span className="text-sm text-destructive">{errors.first_name.message}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="last_name" className="after:content-['*'] after:text-red-500 after:ml-0.5">
                    Last Name
                  </Label>
                  <Input {...register("last_name")} />
                  {errors.last_name && (
                    <span className="text-sm text-destructive">{errors.last_name.message}</span>
                  )}
                </div>
                <div>
                  <Label htmlFor="status" className="after:content-['*'] after:text-red-500 after:ml-0.5">
                    Status
                  </Label>
                  <Select onValueChange={(value) => setValue("status", value)} defaultValue="visitor">
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="visitor">Visitor</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && (
                    <span className="text-sm text-destructive">{errors.status.message}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input type="date" {...register("dob")} />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select onValueChange={(value) => setValue("gender", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="birth_month">Birth Month</Label>
                  <Select onValueChange={(value) => setValue("birth_month", parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                          {new Date(0, month - 1).toLocaleString('en', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="birth_day">Birth Day</Label>
                  <Select onValueChange={(value) => setValue("birth_day", parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
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

            <TabsContent value="contact" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="after:content-['*'] after:text-red-500 after:ml-0.5">
                    Email
                  </Label>
                  <Input {...register("email")} type="email" />
                  {errors.email && (
                    <span className="text-sm text-destructive">{errors.email.message}</span>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone" className="after:content-['*'] after:text-red-500 after:ml-0.5">
                    Phone
                  </Label>
                  <Input {...register("phone")} />
                  {errors.phone && (
                    <span className="text-sm text-destructive">{errors.phone.message}</span>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input {...register("address")} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input {...register("city")} />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input {...register("state")} />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP</Label>
                  <Input {...register("zip")} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="units" className="space-y-6 pt-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Functional Units</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select functional units (e.g., departments, teams, groups)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto border rounded-xl p-4">
                    {functionalUnits.map((unit) => (
                      <div key={unit._id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg transition-colors">
                        <Checkbox
                          id={`unit-${unit._id}`}
                          checked={watch("unit_ids")?.includes(unit._id) || false}
                          onCheckedChange={(checked) => handleUnitToggle(unit._id, !!checked)}
                        />
                        <label htmlFor={`unit-${unit._id}`} className="text-sm font-medium cursor-pointer flex-1">
                          {unit.name}
                        </label>
                      </div>
                    ))}
                    {functionalUnits.length === 0 && (
                      <div className="col-span-2 text-center py-4 text-muted-foreground">
                        No functional units available.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold">Administrative Units</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select administrative or geographic units
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto border rounded-xl p-4">
                    {adminUnits.map((unit) => (
                      <div key={unit._id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg transition-colors">
                        <Checkbox
                          id={`unit-${unit._id}`}
                          checked={watch("unit_ids")?.includes(unit._id) || false}
                          onCheckedChange={(checked) => handleUnitToggle(unit._id, !!checked)}
                        />
                        <label htmlFor={`unit-${unit._id}`} className="text-sm font-medium cursor-pointer flex-1">
                          {unit.name}
                        </label>
                      </div>
                    ))}
                    {adminUnits.length === 0 && (
                      <div className="col-span-2 text-center py-4 text-muted-foreground">
                        No administrative units available.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {watch("unit_ids")?.map((unitId) => {
                    const unit = unitsData?.find(u => u._id === unitId);
                    return unit ? (
                      <Badge key={unitId} variant="secondary" className="flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        {unit.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="photo" className="space-y-4 pt-4">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="w-32 h-32 border-2 border-dashed border-muted">
                  <AvatarImage src={uploadedImageUrl || ""} />
                  <AvatarFallback className="bg-muted">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                {uploadedImageUrl && (
                  <Button variant="ghost" size="sm" onClick={removePhoto} className="text-destructive">
                    <X className="w-4 h-4 mr-1" /> Remove Photo
                  </Button>
                )}
                <div className="w-full max-w-sm">
                  <FileUploader onUploadComplete={handlePhotoUpload} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported formats: JPG, PNG, GIF. Recommended size: 400x400px.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-6 border-t">
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? "Saving..." : "Create Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
