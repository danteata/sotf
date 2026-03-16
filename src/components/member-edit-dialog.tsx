"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { getUnitLabels, useTerminology } from "@/hooks/use-terminology"
import { useToast } from "@/components/ui/use-toast"
import { convertPlusCodeToLatLng } from "@/lib/google-maps-utils"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useOrganization } from "@/hooks/use-organization"

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
import { Member, UserRole, Unit } from "@/types/database"
import { Badge } from "./ui/badge"
import { MemberLabels, LabelSelector } from "./label-selector"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FileUploader } from "@/components/file-uploader"
import { Upload, X, Shield, Crown } from "lucide-react"
import { cn } from "@/lib/utils"

const memberSchema = z.object({
  title: z.string().optional(),
  unit_ids: z.array(z.string()).optional(),
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
  avatar: z.string().optional(),
  skills: z.string().optional(),
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
  const [availableUnits, setAvailableUnits] = useState<any[]>([])
  const [memberUnitIds, setMemberUnitIds] = useState<string[]>([])
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const { toast } = useToast()
  const { terminology } = useTerminology()
  const unitLabels = getUnitLabels(terminology)

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
      country: member.country || "Ghana",
      plus_code: member.plus_code || "",
      unit_ids: memberUnitIds,
      avatar: member.avatar || "",
    },
  });

  const { organization } = useOrganization()
  // Load all units using Convex
  const unitsData = useQuery(api.units.listByOrg, open && organization?._id ? {
    organization_id: organization._id
  } : "skip");
  const updateMember = useMutation(api.members.update);

  useEffect(() => {
    if (unitsData) setAvailableUnits(unitsData.map((u: any) => ({ ...u, id: u._id })));
  }, [unitsData]);

  // Initial loading of member data into form
  useEffect(() => {
    if (open && member) {
      const m = member as any;
      const currentUnitIds = m.unit_ids || [];
      setMemberUnitIds(currentUnitIds);

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
        country: member.country || "Ghana",
        plus_code: member.plus_code || "",
        unit_ids: currentUnitIds,
        avatar: member.avatar_url || member.avatar || "",
        skills: (member as any).skills || "",
      });
    }
  }, [open, member, form]);

  const handlePhotoUpload = (storageId: string, previewUrl?: string) => {
    setUploadedImageUrl(previewUrl || storageId)
    form.setValue("avatar", storageId)
  }

  const removePhoto = () => {
    setUploadedImageUrl(null)
    form.setValue("avatar", "")
  }

  async function onSubmit(data: MemberFormValues) {
    setIsLoading(true)
    try {
      let latLng: { lat: number; lng: number } | null = null;
      if (data.plus_code) {
        latLng = await convertPlusCodeToLatLng(data.plus_code);
      }
      const normalizedPhone = (data.phone || "").replace(/\D/g, "")

      await updateMember({
        id: member._id || (member as any).id,
        updates: {
          name: `${data.first_name} ${data.last_name}`,
          email: data.email,
          phone: normalizedPhone,
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
          plus_code: data.plus_code,
          latitude: latLng?.lat,
          longitude: latLng?.lng,
          avatar_url: data.avatar,
          skills: data.skills,
        },
        unit_ids: data.unit_ids ? data.unit_ids.map(id => id as any) : [],
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
        className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[calc(100%-2rem)] sm:w-[700px] max-h-[90vh] overflow-y-auto p-0 border border-border/50 shadow-soft-xl overflow-hidden"
      >
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl tracking-tight">Edit Member Profile</DialogTitle>
          <DialogDescription className="text-slate-500">
            Update personal information, unit assignments, and classification labels.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-0">
            <div className="px-6 pb-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 h-12 bg-slate-100/50 p-1 rounded-xl mb-6">
                  <TabsTrigger value="basic" className="rounded-lg data-[state=active]:shadow-sm data-[state=active]:bg-white text-xs">General</TabsTrigger>
                  <TabsTrigger value="contact" className="rounded-lg data-[state=active]:shadow-sm data-[state=active]:bg-white text-xs">Contact</TabsTrigger>
                  <TabsTrigger value="photo" className="rounded-lg data-[state=active]:shadow-sm data-[state=active]:bg-white text-xs">Media</TabsTrigger>
                  <TabsTrigger value="unit" className="rounded-lg data-[state=active]:shadow-sm data-[state=active]:bg-white text-xs">{unitLabels.single}</TabsTrigger>
                  <TabsTrigger value="labels" className="rounded-lg data-[state=active]:shadow-sm data-[state=active]:bg-white text-xs">Tags</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control as any}
                      name="title"
                      render={({ field }) => (
                        <FormItem className="md:col-span-1">
                          <FormLabel className="text-[10px] text-slate-400 tracking-wider">Title</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl border-slate-200">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-border/50 shadow-soft">
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
                      control={form.control as any}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem className="md:col-span-3">
                          <FormLabel className="text-[10px] text-slate-400 tracking-wider">First Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="rounded-xl border-slate-200 focus:ring-slate-400" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control as any}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] text-slate-400 tracking-wider">Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="rounded-xl border-slate-200 focus:ring-slate-400" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as any}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] text-slate-400 tracking-wider">Gender</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl border-slate-200">
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-border/50 shadow-soft">
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
                    control={form.control as any}
                    name="dob"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] text-slate-400 tracking-wider">Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="rounded-xl border-slate-200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control as any}
                      name="birth_month"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] text-slate-400 tracking-wider">Birth Month</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl border-slate-200">
                                <SelectValue placeholder="Select month" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-border/50 shadow-soft">
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
                      control={form.control as any}
                      name="birth_day"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] text-slate-400 tracking-wider">Birth Day</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl border-slate-200">
                                <SelectValue placeholder="Select day" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-border/50 shadow-soft">
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

                  <FormField
                    control={form.control as any}
                    name="skills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] text-slate-400 tracking-wider">Skills / Talents</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Singing, Playing instrument, Teaching..." className="rounded-xl border-slate-200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </TabsContent>

                <TabsContent value="contact" className="space-y-4 mt-0">
                  <FormField
                    control={form.control as any}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] text-slate-400 tracking-wider">Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} className="rounded-xl border-slate-200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control as any}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] text-slate-400 tracking-wider">Contact Number</FormLabel>
                        <FormControl>
                          <Input {...field} className="rounded-xl border-slate-200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control as any}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] text-slate-400 tracking-wider">Physical Address</FormLabel>
                        <FormControl>
                          <Input {...field} className="rounded-xl border-slate-200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control as any}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] text-slate-400 tracking-wider">City</FormLabel>
                          <FormControl>
                            <Input {...field} className="rounded-xl border-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as any}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] text-slate-400 tracking-wider">State / Region</FormLabel>
                          <FormControl>
                            <Input {...field} className="rounded-xl border-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control as any}
                      name="zip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] text-slate-400 tracking-wider">Postal Code</FormLabel>
                          <FormControl>
                            <Input {...field} className="rounded-xl border-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as any}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] text-slate-400 tracking-wider">Country</FormLabel>
                          <FormControl>
                            <Input {...field} className="rounded-xl border-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control as any}
                    name="plus_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] text-slate-400 tracking-wider">Maps Location (Plus Code)</FormLabel>
                        <FormControl>
                          <Input {...field} className="rounded-xl border-slate-200 font-mono text-xs" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="photo" className="space-y-4 mt-0">
                  <div className="space-y-6 flex flex-col items-center pt-2">
                    <div className="relative group">
                      <Avatar className="w-40 h-40 border-8 border-slate-50 shadow-soft ring-1 ring-slate-100">
                        <AvatarImage src={uploadedImageUrl || ""} alt="Member photo" />
                        <AvatarFallback className="bg-slate-50 text-slate-400 text-3xl">
                          {form.watch("first_name") && form.watch("last_name")
                            ? `${form.watch("first_name")[0]}${form.watch("last_name")[0]}`.toUpperCase()
                            : "MP"}
                        </AvatarFallback>
                      </Avatar>
                      {uploadedImageUrl && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute bottom-2 right-2 rounded-full w-8 h-8 p-0 shadow-lg border-2 border-white scale-0 group-hover:scale-100 transition-transform"
                          onClick={removePhoto}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="w-full">
                      <FileUploader onUploadComplete={handlePhotoUpload} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="unit" className="space-y-6 mt-0">
                  <FormField
                    control={form.control as any}
                    name="joined_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] text-slate-400 tracking-wider">Onboarding Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="rounded-xl border-slate-200" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="unit_ids"
                    control={form.control as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] text-slate-400 tracking-wider">{unitLabels.plural}</FormLabel>
                        <div className="space-y-2 border border-slate-100 rounded-2xl p-4 max-h-[250px] overflow-y-auto bg-slate-50/50">
                          {availableUnits.map(unit => (
                            <div key={unit.id}
                              className={cn(
                                "flex items-center space-x-3 p-3 rounded-xl transition-all border border-transparent hover:bg-white hover:border-slate-100 hover:shadow-sm cursor-pointer",
                                field.value?.includes(unit.id) ? "bg-white border-slate-200 shadow-sm" : ""
                              )}
                              onClick={() => {
                                const current = field.value || [];
                                if (current.includes(unit.id)) {
                                  field.onChange(current.filter((m: string) => m !== unit.id));
                                } else {
                                  field.onChange([...current, unit.id]);
                                }
                              }}
                            >
                              <div className={cn(
                                "h-5 w-5 rounded border-2 flex items-center justify-center transition-all",
                                field.value?.includes(unit.id) ? "bg-slate-900 border-slate-900" : "bg-white border-slate-200"
                              )}>
                                {field.value?.includes(unit.id) && <div className="h-1.5 w-1.5 bg-white rounded-full" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-900 truncate">{unit.name}</p>
                                <p className="text-[10px] text-slate-400">{unit.type}</p>
                              </div>
                            </div>
                          ))}
                          {availableUnits.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-6 italic">All units deployed.</p>
                          )}
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Units Led Section */}
                  <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Crown className="h-4 w-4 text-purple-600" />
                      <h4 className="text-[10px] text-purple-600 tracking-wider">Units Led</h4>
                    </div>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto">
                      {availableUnits.filter(u => {
                        const memberId = (member as any)._id || (member as any).id;
                        if (!u.leader_id) return false;
                        if (typeof u.leader_id === 'object' && u.leader_id !== null) {
                          return u.leader_id.toString() === memberId?.toString();
                        }
                        return u.leader_id === memberId;
                      }).length > 0 ? (
                        availableUnits
                          .filter(u => {
                            const memberId = (member as any)._id || (member as any).id;
                            if (!u.leader_id) return false;
                            if (typeof u.leader_id === 'object' && u.leader_id !== null) {
                              return u.leader_id.toString() === memberId?.toString();
                            }
                            return u.leader_id === memberId;
                          })
                          .map(unit => (
                            <div key={unit.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-purple-100">
                              <div className="flex-1">
                                <p className="text-sm text-slate-900">{unit.name}</p>
                                <p className="text-[10px] text-slate-400">{unit.type}</p>
                              </div>
                              <Badge className="bg-purple-600 text-white text-[10px]">Leader</Badge>
                            </div>
                          ))
                      ) : (
                        <p className="text-sm text-purple-400 italic py-2">This member is not leading any units.</p>
                      )}
                    </div>
                    <p className="text-[10px] text-purple-400 mt-3 italic">
                      To assign this member as leader of a unit, go to Unit Management.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="labels" className="space-y-6 mt-0">
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-amber-900 text-[11px] flex items-start gap-3">
                    <Shield className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <p className="uppercase tracking-wider mb-1 text-amber-700">TAGGING_SYSTEM_OVERRIDE</p>
                      <p className="font-medium text-amber-800/80 leading-relaxed font-sans">
                        Labels categorize entities for rapid retrieval. Changes are committed to the encrypted registry in real-time.
                      </p>
                    </div>
                  </div>
                  <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/30 shadow-none ring-1 ring-slate-100/50">
                    <h4 className="text-[10px] text-slate-400 tracking-widest mb-4">Registry Controls</h4>
                    <LabelSelector
                      memberId={(member as any)._id || (member as any).id || ''}
                      variant="full"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="bg-slate-50/80 px-6 py-4 flex items-center justify-between border-t border-slate-100">
              <Button
                variant="ghost"
                type="button"
                onClick={() => onOpenChange(false)}
                className="font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 rounded-xl"
              >
                Cancel
              </Button>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-6 shadow-soft"
                >
                  {isLoading ? "Saving..." : "Submit"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
