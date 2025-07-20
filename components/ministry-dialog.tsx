"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { supabase } from "@/lib/supabase"
import { getMembersLegacyFormat, getAppConfig } from "@/lib/database-utils"

import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { MemberCombobox } from "@/components/ui/member-combobox"

const ministrySchema = z.object({
  name: z.string().min(1, "Ministry name is required"),
  description: z.string().optional(),
  leader: z.string().optional(),
  leader_id: z.string().optional(),
  active: z.boolean().default(true),
})

type MinistryFormData = z.infer<typeof ministrySchema>

interface Ministry {
  id: string
  name: string
  description?: string
  leader?: string
  leader_id?: string
  active: boolean
  created_at: string
}

interface MinistryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ministry?: Ministry | null
  onSuccess?: () => void
}

export function MinistryDialog({ open, onOpenChange, ministry, onSuccess }: MinistryDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [ministryTerm, setMinistryTerm] = useState('Ministry')
  const [leaderTerm, setLeaderTerm] = useState('Ministry Leader')

  const form = useForm<MinistryFormData>({
    resolver: zodResolver(ministrySchema),
    defaultValues: {
      name: "",
      description: "",
      leader: "",
      leader_id: "none",
      active: true,
    },
  })

  // Reset form when dialog opens/closes or ministry changes
  useEffect(() => {
    if (open) {
      if (ministry) {
        form.reset({
          name: ministry.name,
          description: ministry.description || "",
          leader: ministry.leader || "",
          leader_id: ministry.leader_id || "none",
          active: ministry.active,
        })
      } else {
        form.reset({
          name: "",
          description: "",
          leader: "",
          leader_id: "none",
          active: true,
        })
      }
    }
  }, [open, ministry, form])

  // Load members and terminology when dialog opens
  useEffect(() => {
    const loadData = async () => {
      if (!open) return

      try {
        const [membersData, ministryTermData, leaderTermData] = await Promise.all([
          getMembersLegacyFormat(),
          getAppConfig('ministry_term'),
          getAppConfig('ministry_leader_term')
        ])

        setMembers(membersData)
        setMinistryTerm(ministryTermData || 'Ministry')
        setLeaderTerm(leaderTermData || 'Ministry Leader')
      } catch (error) {
        console.error('Error loading ministry dialog data:', error)
      }
    }

    loadData()
  }, [open])

  const onSubmit = async (data: MinistryFormData) => {
    setIsLoading(true)
    try {
      if (ministry) {
        // Update existing ministry
        const { error } = await supabase
          .from("ministries")
          .update({
            name: data.name,
            description: data.description || null,
            leader: data.leader || null,
            leader_id: data.leader_id === "none" ? null : data.leader_id || null,
            active: data.active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ministry.id)

        if (error) throw error
      } else {
        // Create new ministry
        const { error } = await supabase
          .from("ministries")
          .insert({
            name: data.name,
            description: data.description || null,
            leader: data.leader || null,
            leader_id: data.leader_id === "none" ? null : data.leader_id || null,
            active: data.active,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

        if (error) throw error
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error saving ministry:", error)
      // You could add toast notification here
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {ministry ? `Edit ${ministryTerm}` : `Add New ${ministryTerm}`}
          </DialogTitle>
          <DialogDescription>
            {ministry
              ? `Update the ${ministryTerm.toLowerCase()} information below.`
              : `Create a new ${ministryTerm.toLowerCase()} for your organization.`
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{ministryTerm} Name</FormLabel>
                  <FormControl>
                    <Input placeholder={`e.g., Youth ${ministryTerm}`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Brief description of the ${ministryTerm.toLowerCase()}...`}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="leader_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{leaderTerm}</FormLabel>
                  <FormControl>
                    <MemberCombobox
                      members={members}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={`Search and select ${leaderTerm.toLowerCase()}...`}
                      emptyText="No members found."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active Status</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable this {ministryTerm.toLowerCase()} for member assignments
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : ministry ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
