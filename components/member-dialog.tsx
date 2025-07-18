"use client"

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
  ministries: z.array(z.string()).optional(),
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

  const onSubmit = async (data: MemberFormData) => {
    console.log("Form submitted with data:", data); // Debug log
    setIsSubmitting(true)
    try {
      // Generate initials from first and last name
      const initials = `${data.first_name[0]}${data.last_name[0]}`.toUpperCase()

      // Format the data for insertion
      const memberData = {
        id: uuidv4(), // Add this line to generate a unique ID
        ...data,
        name: `${data.first_name} ${data.last_name}`,
        initials,
        joined_date: data.joined_date || format(new Date(), "yyyy-MM-dd"),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("members")
        .insert([memberData])

      if (error) throw error

      toast({
        title: "Success",
        description: "Member added successfully",
      })

      // Reset form and close dialog
      reset()
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="text-xs sm:text-sm">Basic Info</TabsTrigger>
              <TabsTrigger value="contact" className="text-xs sm:text-sm">Contact</TabsTrigger>
              <TabsTrigger value="ministry" className="text-xs sm:text-sm">Ministry</TabsTrigger>
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
                  <Label htmlFor="region">Region</Label>
                  <Select onValueChange={(value) => setValue("region", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Northern">Northern</SelectItem>
                      <SelectItem value="Southern">Southern</SelectItem>
                      <SelectItem value="Eastern">Eastern</SelectItem>
                      <SelectItem value="Western">Western</SelectItem>
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

            <TabsContent value="ministry" className="space-y-4 pt-4">
              <div>
                <Label htmlFor="ministries">Ministries</Label>
                <input
                  type="hidden"
                  {...register("ministries")}
                  value={watch("ministries")?.join(",")}
                />
                <Select
                  onValueChange={(value) => {
                    const currentMinistries = watch("ministries") || [];
                    if (currentMinistries.includes(value)) {
                      setValue(
                        "ministries",
                        currentMinistries.filter((m) => m !== value)
                      );
                    } else {
                      setValue("ministries", [...currentMinistries, value]);
                    }
                  }}
                >
                  <SelectTrigger id="ministries">
                    <SelectValue placeholder="Select ministries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="music">
                      <input
                        type="checkbox"
                        checked={watch("ministries")?.includes("music")}
                        className="mr-2"
                        readOnly
                      />
                      Music
                    </SelectItem>
                    <SelectItem value="youth">
                      <input
                        type="checkbox"
                        checked={watch("ministries")?.includes("youth")}
                        className="mr-2"
                        readOnly
                      />
                      Youth
                    </SelectItem>
                    <SelectItem value="children">
                      <input
                        type="checkbox"
                        checked={watch("ministries")?.includes("children")}
                        className="mr-2"
                        readOnly
                      />
                      Children
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {watch("ministries")?.map((ministry) => (
                    <span key={ministry} className="bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                      {ministry}
                    </span>
                  ))}
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
