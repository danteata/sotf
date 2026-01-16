'use client'

import { useState, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { MemberCombobox } from '@/components/ui/member-combobox'

const ministrySchema = z.object({
  name: z.string().min(1, 'Ministry name is required'),
  description: z.string().optional(),
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
  created_at?: string | number
}

interface MinistryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ministry?: Ministry | null
  onSuccess?: () => void
}

export function MinistryDialog({
  open,
  onOpenChange,
  ministry,
  onSuccess,
}: MinistryDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  // Fetch data using Convex
  const membersData = useQuery(api.members.getAll, {});
  const ministryTermData = useQuery(api.app_config.getKey, { key: 'ministry_term' });
  const leaderTermData = useQuery(api.app_config.getKey, { key: 'ministry_leader_term' });

  const createMinistry = useMutation(api.ministries.create);
  const updateMinistry = useMutation(api.ministries.update);

  const members = membersData || [];
  const ministryTerm = (ministryTermData?.value as string) || 'Ministry';
  const leaderTerm = (leaderTermData?.value as string) || 'Ministry Leader';

  const form = useForm<MinistryFormData>({
    resolver: zodResolver(ministrySchema),
    defaultValues: {
      name: '',
      description: '',
      leader_id: 'none',
      active: true,
    },
  })

  // Reset form when dialog opens/closes or ministry changes
  useEffect(() => {
    if (open) {
      if (ministry) {
        form.reset({
          name: ministry.name,
          description: ministry.description || '',
          leader_id: ministry.leader_id || (ministry.leader ? undefined : 'none'), // naming mismatch potential
          active: ministry.active,
        })
      } else {
        form.reset({
          name: '',
          description: '',
          leader_id: 'none',
          active: true,
        })
      }
    }
  }, [open, ministry, form])

  const onSubmit = async (data: MinistryFormData) => {
    setIsLoading(true)
    try {
      const leaderId = data.leader_id === 'none' ? undefined : data.leader_id;

      if (ministry) {
        // Update existing ministry
        await updateMinistry({
          id: ministry.id as any,
          updates: {
            name: data.name,
            description: data.description,
            leader_id: leaderId as any,
            active: data.active,
          }
        });
      } else {
        // Create new ministry
        await createMinistry({
          name: data.name,
          description: data.description,
          leader_id: leaderId as any,
          active: data.active,
        });
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error saving ministry:', error)
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
              : `Create a new ${ministryTerm.toLowerCase()} for your organization.`}
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
                    <Input
                      placeholder={`e.g., Youth ${ministryTerm}`}
                      {...field}
                    />
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
                      Enable this {ministryTerm.toLowerCase()} for member
                      assignments
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
                {isLoading ? 'Saving...' : ministry ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
