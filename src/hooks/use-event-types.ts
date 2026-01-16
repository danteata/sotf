'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { useTerminology } from '@/hooks/use-terminology'

export interface EventType {
  _id: string
  id?: string
  value: string
  label: string
  color?: 'default' | 'secondary' | 'outline' | 'destructive'
  icon?: string
  category?: string
  description?: string
}

export interface EventTypeCategory {
  id: string
  name: string
  description: string
}

const defaultCategories: EventTypeCategory[] = [
  { id: 'worship', name: 'Worship & Service', description: 'Regular worship services and spiritual gatherings' },
  { id: 'education', name: 'Education & Study', description: 'Bible studies, classes, and educational programs' },
  { id: 'fellowship', name: 'Fellowship & Community', description: 'Social gatherings and community building events' },
  { id: 'ministry', name: 'Ministry & Outreach', description: 'Ministry activities and community outreach' },
  { id: 'special', name: 'Special Events', description: 'Conferences, special services, and unique events' },
]

export function useEventTypes() {
  const { terminology } = useTerminology()

  // Convex Queries
  const rawEventTypes = useQuery(api.event_types.getAll);
  const categoriesConfig = useQuery(api.app_config.getKey, { key: 'event_type_categories' })

  // Convex Mutations
  const createEventType = useMutation(api.event_types.create)
  const updateEventTypeMut = useMutation(api.event_types.update)
  const removeEventTypeMut = useMutation(api.event_types.remove)
  const resetToDefaultsMut = useMutation(api.event_types.resetToDefaults)
  const loadTemplateMut = useMutation(api.event_types.loadTemplate)

  const isLoading = rawEventTypes === undefined
  const eventTypesList = rawEventTypes || []

  // Parse categories from app_config or use defaults
  let categories = defaultCategories
  if (categoriesConfig) {
    try {
      const parsed = typeof categoriesConfig === 'string' ? JSON.parse(categoriesConfig) : categoriesConfig
      if (Array.isArray(parsed)) {
        categories = parsed
      }
    } catch (e) {
      console.error('Error parsing categories:', e)
    }
  }

  // Map Convex data to EventType interface and apply terminology
  const eventTypes: EventType[] = eventTypesList.map((dbType: any) => {
    let label = dbType.label
    if (dbType.value === 'children-ministry') {
      label = `Children ${terminology.ministry_term}`
    }
    return {
      _id: dbType._id,
      id: dbType._id,
      value: dbType.value,
      label,
      color: (dbType.color || 'outline') as any,
      icon: dbType.icon,
      category: dbType.category,
      description: dbType.description,
    }
  })

  const addEventType = async (eventType: Omit<EventType, 'value'> & { value?: string }) => {
    try {
      await createEventType({
        value: eventType.value || eventType.label.toLowerCase().replace(/\s+/g, '-'),
        label: eventType.label,
        color: eventType.color,
        icon: eventType.icon,
        category: eventType.category,
        description: eventType.description,
        is_active: true,
        sort_order: eventTypes.length + 1,
      })
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  const updateEventType = async (id: string, updates: Partial<EventType>) => {
    try {
      await updateEventTypeMut({
        id: id as Id<"event_types">,
        updates: {
          label: updates.label,
          color: updates.color,
          icon: updates.icon,
          category: updates.category,
          description: updates.description,
        }
      })
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  const removeEventType = async (id: string) => {
    try {
      await removeEventTypeMut({ id: id as Id<"event_types"> })
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  const resetToDefaults = async () => {
    try {
      await resetToDefaultsMut();
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  const loadTemplate = async (templateName: string) => {
    try {
      await loadTemplateMut({ templateName });
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  return {
    eventTypes,
    categories,
    isLoading,
    error: null,
    addEventType,
    updateEventType,
    removeEventType,
    resetToDefaults,
    loadTemplate,
  }
}

export function getEventTypeBadgeVariant(eventType?: EventType): 'default' | 'secondary' | 'outline' | 'destructive' {
  return eventType?.color || 'outline'
}

export function getEventTypeDisplayName(value: string, eventTypes: EventType[]): string {
  const eventType = eventTypes.find(type => type.value === value)
  return eventType?.label || value.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}
