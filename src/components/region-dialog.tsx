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

const regionSchema = z.object({
  name: z.string().min(1, 'Region name is required'),
  description: z.string().optional(),
  regional_minister_id: z.string().optional(),
  active: z.boolean().default(true),
})

type RegionFormData = z.infer<typeof regionSchema>

interface Region {
  id: string
  name: string
  description?: string
  regional_minister_id?: string
  active: boolean
  created_at?: string | number
}

interface RegionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  region?: Region | null
  onSuccess?: () => void
}

export function RegionDialog({
  open,
  onOpenChange,
  region,
  onSuccess,
}: RegionDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  // Fetch data
  const membersData = useQuery(api.members.getAll, {});
  const regionTermData = useQuery(api.app_config.getKey, { key: 'region_term' });
  const regionalLeaderTermData = useQuery(api.app_config.getKey, { key: 'regional_leader_term' });

  const createRegion = useMutation(api.regions.create);
  const updateRegion = useMutation(api.regions.update);

  const members = membersData || [];
  const regionTerm = (regionTermData?.value as string) || 'Region';
  const regionalLeaderTerm = (regionalLeaderTermData?.value as string) || 'Regional Minister';

  const form = useForm<RegionFormData>({
    resolver: zodResolver(regionSchema),
    defaultValues: {
      name: '',
      description: '',
      regional_minister_id: 'none',
      active: true,
    },
  })

  // Reset form when dialog opens/closes or region changes
  useEffect(() => {
    if (open) {
      if (region) {
        form.reset({
          name: region.name,
          description: region.description || '',
          regional_minister_id: region.regional_minister_id || 'none',
          active: region.active,
        })
      } else {
        form.reset({
          name: '',
          description: '',
          regional_minister_id: 'none',
          active: true,
        })
      }
    }
  }, [open, region, form])

  const onSubmit = async (data: RegionFormData) => {
    setIsLoading(true)
    try {
      const ministerId = data.regional_minister_id === 'none' ? undefined : data.regional_minister_id;

      if (region) {
        // Update existing region
        await updateRegion({
          id: region.id as any,
          updates: {
            name: data.name,
            description: data.description,
            regional_minister_id: ministerId as any,
            active: data.active,
          }
        });
      } else {
        // Create new region
        await createRegion({
          name: data.name,
          description: data.description,
          regional_minister_id: ministerId as any,
          active: data.active,
        });
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error saving region:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {region ? `Edit ${regionTerm}` : `Add New ${regionTerm}`}
          </DialogTitle>
          <DialogDescription>
            {region
              ? `Update the ${regionTerm.toLowerCase()} information below.`
              : `Create a new ${regionTerm.toLowerCase()} for your organization.`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{regionTerm} Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={`e.g., Northern ${regionTerm}`}
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
                      placeholder={`Brief description of the ${regionTerm.toLowerCase()}...`}
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
              name="regional_minister_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{regionalLeaderTerm}</FormLabel>
                  <FormControl>
                    <MemberCombobox
                      members={members}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={`Search and select ${regionalLeaderTerm.toLowerCase()}...`}
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
                      Enable this {regionTerm.toLowerCase()} for member
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
                {isLoading ? 'Saving...' : region ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
