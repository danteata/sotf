"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { getRegionLabels, getMinistryLabels, useTerminology } from "@/hooks/use-terminology"
import { useToast } from "@/components/ui/use-toast"
import { convertPlusCodeToLatLng } from "@/lib/google-maps-utils"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Member, Ministry, Region } from "@/types/database"
import { Badge } from "./ui/badge"
import { MemberLabels, LabelSelector } from "./label-selector"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FileUploader } from "@/components/file-uploader"
import { Upload, X } from "lucide-react"

const memberSchema = z.object({
  title: z.string().optional(),
  region: z.string().optional(),
  ministries: z.array(z.string()).optional(), // Ministry IDs
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
  plus_code: z.string().optional(),
  // skills: z.string().optional(),
  avatar: z.string().optional(),
})

type MemberFormValues = z.infer<typeof memberSchema>

interface MemberEditDialogProps {
  member: Member
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function MemberEditDialog({
  member,
  open,
  onOpenChange,
  onSuccess,
}: MemberEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")
  const [ministries, setMinistries] = useState<any[]>([])
  const [regions, setRegions] = useState<any[]>([])
  const [memberMinistryIds, setMemberMinistryIds] = useState<string[]>([])
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const { toast } = useToast()
  const { terminology } = useTerminology()
  const ministryLabels = getMinistryLabels(terminology)
  const regionLabels = getRegionLabels(terminology)

  // Split the name into first and last name
  let firstName: string = ""
  let lastName: string = ""
  if (member.name) {
    const nameParts = member.name.split(" ")
    firstName = nameParts[0]
    lastName = nameParts.slice(1).join(" ")
  }

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      title: member.title || "",
      first_name: member.first_name || firstName,
      last_name: member.last_name || lastName,
      email: member.email,
      phone: member.phone,
      dob: member.dob || "",
      birth_month: member.birth_month || undefined,
      birth_day: member.birth_day || undefined,
      gender: member.gender || "",
      status: member.status,
      joined_date: member.joined_date,
      address: member.address || "",
      city: member.city || "",
      state: member.state || "",
      zip: member.zip || "",
      country: member.country || "United States",
      plus_code: member.plus_code || "",
      ministries: memberMinistryIds,
      region: member.region || "",
      avatar: member.avatar || "",
    },
  });

  form.register("region")

  // Load ministries and regions using Convex
  const ministriesData = useQuery(api.ministries.getAll, open ? { activeOnly: true } : "skip");
  const regionsData = useQuery(api.regions.getAll, open ? { activeOnly: true } : "skip");
  const updateMember = useMutation(api.members.update);

  useEffect(() => {
    if (ministriesData) setMinistries(ministriesData);
    if (regionsData) setRegions(regionsData);
  }, [ministriesData, regionsData]);

  // Initial loading of member data into form
  useEffect(() => {
    if (open && member) {
      // Use passed member data. 
      // Note: member.ministry_ids comes from the updated getAll query.
      // If it's missing (e.g. legacy type), might need a fallback or ensure type includes it.
      // Casting member to include ministry_ids for now if not in type.
      const m = member as any;
      const currentMinistryIds = m.ministry_ids || [];
      setMemberMinistryIds(currentMinistryIds);

      setUploadedImageUrl(member.avatar_url || member.avatar || null);

      form.reset({
        title: member.title || "",
        first_name: member.first_name || firstName,
        last_name: member.last_name || lastName,
        email: member.email,
        phone: member.phone,
        dob: member.dob || "",
        birth_month: member.birth_month || undefined,
        birth_day: member.birth_day || undefined,
        gender: member.gender || "",
        status: member.status,
        joined_date: member.joined_date,
        address: member.address || "",
        city: member.city || "",
        state: member.state || "",
        zip: member.zip || "",
        country: member.country || "United States",
        plus_code: member.plus_code || "",
        ministries: currentMinistryIds,
        region: member.region || "", // This might be name. We prefer IDs but form uses names?
        // Wait, In MemberDialog we switched to IDs. Here we should check if 'member.region' is name or ID.
        // In formatMember: region: regionName. So it is NAME.
        // But our Select uses ID now (if we updated it? We updated MemberDialog, NOT MemberEditDialog yet).
        // We SHOULD update MemberEditDialog to use IDs for region too.
        // But formatMember returns region NAME.
        // Does it return region_id? Yes, member object has region_id (from db).
        // formatMember spreads ...member. So region_id is present!
        // So we should use member.region_id.
        avatar: member.avatar_url || member.avatar || "",
      });

      // If we want to set region by ID:
      if (member.region_id) {
        form.setValue("region", member.region_id as any);
      }
    }
  }, [open, member, form]);

  // Handle photo upload completion
  const handlePhotoUpload = (url: string) => {
    setUploadedImageUrl(url)
    form.setValue("avatar", url)
  }

  // Remove uploaded photo
  const removePhoto = () => {
    setUploadedImageUrl(null)
    form.setValue("avatar", "")
  }

  async function onSubmit(data: MemberFormValues) {
    console.log("Edit form submitted with data:", data);
    setIsLoading(true)
    try {
      // Find region ID if data.region is a name, but if we switched to IDs it's an ID.
      // If we use member.region_id, it's an ID.
      // Let's assume we update the Select to use IDs.

      let latLng: { lat: number; lng: number } | null = null;
      if (data.plus_code) {
        latLng = await convertPlusCodeToLatLng(data.plus_code);
      }

      await updateMember({
        id: member.id as any, // Cast id
        updates: {
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
          region_id: data.region as any,
          plus_code: data.plus_code,
          latitude: latLng?.lat,
          longitude: latLng?.lng,
          avatar_url: data.avatar,
        },
        ministry_ids: data.ministries ? data.ministries.map(id => id as any) : [],
      });

      toast({
        title: "Success",
        description: "Member updated successfully",
      })

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error("Error updating member:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[calc(100%-2rem)] sm:w-[700px] max-h-[90vh] overflow-y-auto p-4 sm:p-6"
      >
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription>
            Update member information. Click save when done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic" className="text-xs sm:text-sm">Basic Info</TabsTrigger>
                <TabsTrigger value="contact" className="text-xs sm:text-sm">Contact</TabsTrigger>
                <TabsTrigger value="photo" className="text-xs sm:text-sm">Photo</TabsTrigger>
                <TabsTrigger value="ministry" className="text-xs sm:text-sm">{ministryLabels.single}</TabsTrigger>
                <TabsTrigger value="labels" className="text-xs sm:text-sm">Labels</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="md:col-span-1">
                        <FormLabel>Title</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select title" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Mr">Mr</SelectItem>
                            <SelectItem value="Mrs">Mrs</SelectItem>
                            <SelectItem value="Ms">Ms</SelectItem>
                            <SelectItem value="Dr">Dr</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-3">
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="birth_month"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Birth Month (for notifications)</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                          </FormControl>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birth_day"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Birth Day (for notifications)</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                              <SelectItem key={day} value={day.toString()}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{regionLabels.single}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select region" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {regions.map(region => (
                              <SelectItem key={region.id} value={region.id}>
                                {region.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="plus_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Plus Code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                            {form.watch("first_name") && form.watch("last_name")
                              ? `${form.watch("first_name")[0]}${form.watch("last_name")[0]}`.toUpperCase()
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

              <TabsContent value="ministry" className="space-y-4">
                <FormField
                  control={form.control}
                  name="joined_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Join Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="ministries"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ministryLabels.plural}</FormLabel>
                      <div className="space-y-2">
                        {ministries.map(ministry => (
                          <div key={ministry.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`ministry-${ministry.id}`}
                              checked={field.value?.includes(ministry.id) || false}
                              onChange={(e) => {
                                const currentMinistries = field.value || [];
                                console.log('Current ministries before change:', currentMinistries);
                                console.log('Checkbox checked:', e.target.checked, 'for ministry:', ministry.name, 'ID:', ministry.id);

                                if (e.target.checked) {
                                  const newMinistries = [...currentMinistries, ministry.id];
                                  console.log('New ministries after adding:', newMinistries);
                                  field.onChange(newMinistries);
                                } else {
                                  const newMinistries = currentMinistries.filter((m: string) => m !== ministry.id);
                                  console.log('New ministries after removing:', newMinistries);
                                  field.onChange(newMinistries);
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
                        {field.value?.map((ministryId: string) => {
                          const ministry = ministries.find(m => m.id === ministryId);
                          return ministry ? (
                            <Badge key={ministryId} variant="secondary">
                              {ministry.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="labels" className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Assign labels to categorize this member. Labels help you organize and filter your church members.
                </div>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-3">Member Labels</h4>
                  <LabelSelector
                    memberId={member.id || ''}
                    variant="full"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
