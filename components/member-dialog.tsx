import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
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
import { supabase } from "@/lib/supabase"
import { v4 as uuidv4 } from 'uuid'
import { cn } from "@/lib/utils"
import { getMinistries, getRegions, saveMemberWithMinistries } from "@/lib/database-utils"
import { useTerminology, getMinistryLabels, getRegionLabels } from "@/hooks/use-terminology"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, X } from "lucide-react"

const memberSchema = z.object({
  title: z.string().optional(),
  region: z.string().optional(),
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
  ministries: z.array(z.string()).optional(), // Ministry IDs
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
  const [ministries, setMinistries] = useState<any[]>([])
  const [regions, setRegions] = useState<any[]>([])
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const { toast } = useToast()
  const { terminology } = useTerminology()
  const ministryLabels = getMinistryLabels(terminology)
  const regionLabels = getRegionLabels(terminology)

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
      ministries: [],
    },
  })

  // Register all select fields with react-hook-form
  useEffect(() => {
    register("title")
    register("gender")
    register("status")
    register("region")
    register("birth_month")
    register("birth_day")
  }, [register])

  useEffect(() => {
    register("ministries")
  }, [register])

  // Load ministries and regions when dialog opens
  useEffect(() => {
    const loadData = async () => {
      if (!open) return

      try {
        const [ministriesData, regionsData] = await Promise.all([
          getMinistries(true), // Only active ministries
          getRegions(true)     // Only active regions
        ])

        setMinistries(ministriesData)
        setRegions(regionsData)
      } catch (error) {
        console.error('Error loading ministries and regions:', error)
        toast({
          title: "Error",
          description: "Failed to load ministries and regions",
          variant: "destructive",
        })
      }
    }

    loadData()
  }, [open, toast])

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

  const onSubmit = async (data: MemberFormData) => {
    console.log("Form submitted with data:", data); // Debug log
    console.log("Ministries from form:", data.ministries); // Debug ministries
    setIsSubmitting(true)
    try {
      // Generate initials from first and last name
      const initials = `${data.first_name[0]}${data.last_name[0]}`.toUpperCase()

      // Format the data for insertion
      const memberData = {
        id: uuidv4(), // Add this line to generate a unique ID
        title: data.title,
        first_name: data.first_name,
        last_name: data.last_name,
        name: `${data.first_name} ${data.last_name}`,
        email: data.email,
        phone: data.phone,
        dob: data.dob,
        birth_month: data.birth_month,
        birth_day: data.birth_day,
        gender: data.gender,
        status: data.status,
        joined_date: data.joined_date || format(new Date(), "yyyy-MM-dd"),
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        country: data.country,
        region: data.region,
        skills: data.skills,
        avatar_url: data.avatar_url,
        initials,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Use the helper function to save member with ministries (pass ministry IDs)
      await saveMemberWithMinistries(memberData, data.ministries || [])

      toast({
        title: "Success",
        description: "Member added successfully",
      })

      // Reset form and close dialog
      reset()
      setUploadedImageUrl(null)
      onOpenChange(false)
    } catch (error: any) {
      console.error("Submission error:", error) // Debug log
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
              <TabsTrigger value="photo" className="text-xs sm:text-sm">Photo</TabsTrigger>
              <TabsTrigger value="ministry" className="text-xs sm:text-sm">{ministryLabels.single}</TabsTrigger>
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
                  <Label htmlFor="birth_month">Birth Month (for notifications)</Label>
                  <Select onValueChange={(value) => setValue("birth_month", parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">January</SelectItem>
                      <SelectItem value="2">February</SelectItem>
                      <SelectItem value="3">March</SelectItem>
                      <SelectItem value="4">April</SelectItem>
                      <SelectItem value="5">May</SelectItem>
                      <SelectItem value="6">June</SelectItem>
                      <SelectItem value="7">July</SelectItem>
                      <SelectItem value="8">August</SelectItem>
                      <SelectItem value="9">September</SelectItem>
                      <SelectItem value="10">October</SelectItem>
                      <SelectItem value="11">November</SelectItem>
                      <SelectItem value="12">December</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="birth_day">Birth Day (for notifications)</Label>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status" className="after:content-['*'] after:text-red-500 after:ml-0.5">
                    Membership Status
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
                <div>
                  <Label htmlFor="region">{regionLabels.single}</Label>
                  <Select onValueChange={(value) => setValue("region", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((region) => (
                        <SelectItem key={region.id} value={region.name}>
                          {region.name}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input {...register("address")} />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input {...register("city")} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input {...register("zip")} />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input {...register("country")} defaultValue="United States" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="photo" className="space-y-4 pt-4">
              <div className="space-y-4">
                <Label>Member Photo</Label>
                <div className="flex flex-col items-center space-y-4">
                  {uploadedImageUrl ? (
                    <div className="relative">
                      <Avatar className="w-32 h-32">
                        <AvatarImage src={uploadedImageUrl} alt="Member photo" />
                        <AvatarFallback>
                          {watch("first_name") && watch("last_name")
                            ? `${watch("first_name")[0]}${watch("last_name")[0]}`.toUpperCase()
                            : "MP"}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 rounded-full w-6 h-6 p-0"
                        onClick={removePhoto}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                  )}

                  <div className="w-full max-w-md">
                    <FileUploader onUploadComplete={handlePhotoUpload} />
                  </div>

                  <p className="text-sm text-muted-foreground text-center">
                    Upload a photo for this member. Supported formats: JPG, PNG, GIF. Max size: 4MB.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ministry" className="space-y-4 pt-4">
              <div>
                <Label htmlFor="ministries">{ministryLabels.plural}</Label>
                <input
                  type="hidden"
                  {...register("ministries")}
                  value={watch("ministries")?.join(",")}
                />
                <div className="space-y-2 mt-2">
                  {ministries.map((ministry) => (
                    <div key={ministry.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`ministry-${ministry.id}`}
                        checked={watch("ministries")?.includes(ministry.id) || false}
                        onChange={(e) => {
                          const currentMinistries = watch("ministries") || [];
                          console.log('Add dialog - Current ministries before change:', currentMinistries);
                          console.log('Add dialog - Checkbox checked:', e.target.checked, 'for ministry:', ministry.name, 'ID:', ministry.id);

                          if (e.target.checked) {
                            const newMinistries = [...currentMinistries, ministry.id];
                            console.log('Add dialog - New ministries after adding:', newMinistries);
                            setValue("ministries", newMinistries);
                          } else {
                            const newMinistries = currentMinistries.filter((m) => m !== ministry.id);
                            console.log('Add dialog - New ministries after removing:', newMinistries);
                            setValue("ministries", newMinistries);
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor={`ministry-${ministry.id}`}
                        className="text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        {ministry.name}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {watch("ministries")?.map((ministryId) => {
                    const ministry = ministries.find(m => m.id === ministryId);
                    return ministry ? (
                      <Badge key={ministryId} variant="secondary">
                        {ministry.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
