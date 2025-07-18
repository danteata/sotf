"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { supabase } from "@/lib/supabase"

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

const regionSchema = z.object({
  name: z.string().min(1, "Region name is required"),
  description: z.string().optional(),
  active: z.boolean().default(true),
})

type RegionFormData = z.infer<typeof regionSchema>

interface Region {
  id: string
  name: string
  description?: string
  active: boolean
  created_at: string
}

interface RegionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  region?: Region | null
  onSuccess?: () => void
}

export function RegionDialog({ open, onOpenChange, region, onSuccess }: RegionDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<RegionFormData>({
    resolver: zodResolver(regionSchema),
    defaultValues: {
      name: "",
      description: "",
      active: true,
    },
  })

  // Reset form when dialog opens/closes or region changes
  useEffect(() => {
    if (open) {
      if (region) {
        form.reset({
          name: region.name,
          description: region.description || "",
          active: region.active,
        })
      } else {
        form.reset({
          name: "",
          description: "",
          active: true,
        })
      }
    }
  }, [open, region, form])

  const onSubmit = async (data: RegionFormData) => {
    setIsLoading(true)
    try {
      if (region) {
        // Update existing region
        const { error } = await supabase
          .from("regions")
          .update({
            name: data.name,
            description: data.description || null,
            active: data.active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", region.id)

        if (error) throw error
      } else {
        // Create new region
        const { error } = await supabase
          .from("regions")
          .insert({
            name: data.name,
            description: data.description || null,
            active: data.active,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

        if (error) throw error
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error saving region:", error)
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
            {region ? "Edit Region" : "Add New Region"}
          </DialogTitle>
          <DialogDescription>
            {region 
              ? "Update the region information below."
              : "Create a new region for your organization."
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
                  <FormLabel>Region Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Northern Region" {...field} />
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
                      placeholder="Brief description of the region..."
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
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active Status</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable this region for member assignments
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
                {isLoading ? "Saving..." : region ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
