"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTerminology } from '@/hooks/use-terminology'

export interface EventType {
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

const defaultEventTypes: EventType[] = [
  { value: 'sunday-service', label: 'Sunday Service', color: 'default', icon: 'church' },
  { value: 'bible-study', label: 'Bible Study', color: 'secondary', icon: 'book' },
  { value: 'youth-group', label: 'Youth Group', color: 'outline', icon: 'users' },
  { value: 'children-ministry', label: 'Children Ministry', color: 'secondary', icon: 'heart' },
  { value: 'prayer-meeting', label: 'Prayer Meeting', color: 'outline', icon: 'hands' },
  { value: 'worship-night', label: 'Worship Night', color: 'default', icon: 'music' },
  { value: 'community-outreach', label: 'Community Outreach', color: 'outline', icon: 'globe' },
  { value: 'fellowship', label: 'Fellowship', color: 'secondary', icon: 'coffee' },
  { value: 'conference', label: 'Conference', color: 'default', icon: 'presentation' },
  { value: 'other', label: 'Other', color: 'outline', icon: 'calendar' },
]

const defaultCategories: EventTypeCategory[] = [
  { id: 'worship', name: 'Worship & Service', description: 'Regular worship services and spiritual gatherings' },
  { id: 'education', name: 'Education & Study', description: 'Bible studies, classes, and educational programs' },
  { id: 'fellowship', name: 'Fellowship & Community', description: 'Social gatherings and community building events' },
  { id: 'ministry', name: 'Ministry & Outreach', description: 'Ministry activities and community outreach' },
  { id: 'special', name: 'Special Events', description: 'Conferences, special services, and unique events' },
]

export function useEventTypes() {
  const [eventTypes, setEventTypes] = useState<EventType[]>(defaultEventTypes)
  const [categories, setCategories] = useState<EventTypeCategory[]>(defaultCategories)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { terminology } = useTerminology()

  useEffect(() => {
    const loadEventTypes = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Load event types from database table
        const { data: eventTypesData, error: eventTypesError } = await supabase
          .from('event_types')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })

        if (eventTypesError) {
          throw eventTypesError
        }

        // Load categories from app_config (fallback to defaults)
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'event_type_categories')
          .single()

        let loadedCategories = defaultCategories
        if (!categoriesError && categoriesData?.value) {
          try {
            const parsed = JSON.parse(categoriesData.value)
            if (Array.isArray(parsed)) {
              loadedCategories = parsed
            }
          } catch (parseError) {
            console.error('Error parsing categories config:', parseError)
          }
        }

        // Convert database records to EventType interface and apply terminology
        const loadedEventTypes = (eventTypesData || []).map(dbType => {
          let label = dbType.label

          // Apply ministry terminology to children-ministry type
          if (dbType.value === 'children-ministry') {
            label = `Children ${terminology.ministry_term}`
          }

          return {
            value: dbType.value,
            label,
            color: dbType.color || 'outline',
            icon: dbType.icon,
            category: dbType.category,
            description: dbType.description,
          } as EventType
        })

        setEventTypes(loadedEventTypes.length > 0 ? loadedEventTypes : defaultEventTypes)
        setCategories(loadedCategories)
      } catch (err) {
        console.error('Error loading event types:', err)
        setError(err instanceof Error ? err.message : 'Failed to load event types')
        // Use defaults on error
        setEventTypes(defaultEventTypes)
        setCategories(defaultCategories)
      } finally {
        setIsLoading(false)
      }
    }

    loadEventTypes()
  }, [terminology])

  const saveEventTypes = async (newEventTypes: EventType[]) => {
    try {
      // This function is now handled by individual CRUD operations
      // Refresh the data from database
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error

      const loadedEventTypes = (data || []).map(dbType => ({
        value: dbType.value,
        label: dbType.value === 'children-ministry' ? `Children ${terminology.ministry_term}` : dbType.label,
        color: dbType.color || 'outline',
        icon: dbType.icon,
        category: dbType.category,
        description: dbType.description,
      } as EventType))

      setEventTypes(loadedEventTypes)
      return { success: true }
    } catch (error) {
      console.error('Error refreshing event types:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to refresh event types' }
    }
  }

  const saveCategories = async (newCategories: EventTypeCategory[]) => {
    try {
      const { error } = await supabase
        .from('app_config')
        .upsert({
          key: 'event_type_categories',
          value: JSON.stringify(newCategories),
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setCategories(newCategories)
      return { success: true }
    } catch (error) {
      console.error('Error saving categories:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to save categories' }
    }
  }

  const addEventType = async (eventType: Omit<EventType, 'value'> & { value?: string }) => {
    try {
      const newEventType = {
        value: eventType.value || eventType.label.toLowerCase().replace(/\s+/g, '-'),
        label: eventType.label,
        color: eventType.color || 'outline',
        icon: eventType.icon || 'calendar',
        category: eventType.category,
        description: eventType.description,
        is_active: true,
        sort_order: eventTypes.length + 1,
      }

      const { error } = await supabase
        .from('event_types')
        .insert(newEventType)

      if (error) throw error

      // Refresh the event types
      return await saveEventTypes([])
    } catch (error) {
      console.error('Error adding event type:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to add event type' }
    }
  }

  const updateEventType = async (value: string, updates: Partial<EventType>) => {
    try {
      const { error } = await supabase
        .from('event_types')
        .update({
          label: updates.label,
          color: updates.color,
          icon: updates.icon,
          category: updates.category,
          description: updates.description,
          updated_at: new Date().toISOString()
        })
        .eq('value', value)

      if (error) throw error

      // Refresh the event types
      return await saveEventTypes([])
    } catch (error) {
      console.error('Error updating event type:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update event type' }
    }
  }

  const removeEventType = async (value: string) => {
    try {
      // Use the safe delete function that checks for references
      const { data, error } = await supabase.rpc('safe_delete_event_type', {
        event_type_value: value
      })

      if (error) throw error

      // Refresh the event types
      await saveEventTypes([])

      return { success: true, result: data }
    } catch (error) {
      console.error('Error removing event type:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to remove event type' }
    }
  }

  const getEventTypeByValue = (value: string): EventType | undefined => {
    return eventTypes.find(type => type.value === value)
  }

  const getEventTypesByCategory = (categoryId: string): EventType[] => {
    return eventTypes.filter(type => type.category === categoryId)
  }

  const resetToDefaults = async () => {
    try {
      // Delete all existing event types and insert defaults
      const { error: deleteError } = await supabase
        .from('event_types')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

      if (deleteError) throw deleteError

      // Insert default event types
      const defaultDbTypes = defaultEventTypes.map((type, index) => ({
        value: type.value,
        label: type.label,
        color: type.color || 'outline',
        icon: type.icon || 'calendar',
        category: type.category,
        description: type.description,
        is_active: true,
        sort_order: index + 1,
      }))

      const { error: insertError } = await supabase
        .from('event_types')
        .insert(defaultDbTypes)

      if (insertError) throw insertError

      // Refresh the event types
      return await saveEventTypes([])
    } catch (error) {
      console.error('Error resetting to defaults:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to reset to defaults' }
    }
  }

  const loadTemplate = async (templateName: 'traditional' | 'contemporary' | 'multicultural') => {
    try {
      // Get template from app_config
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'event_types_templates')
        .single()

      if (error || !data?.value) {
        return { success: false, error: 'Template configuration not found' }
      }

      const templates = JSON.parse(data.value)
      const template = templates[templateName]

      if (!template || !Array.isArray(template)) {
        return { success: false, error: 'Template not found' }
      }

      // Delete existing event types and insert template
      const { error: deleteError } = await supabase
        .from('event_types')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

      if (deleteError) throw deleteError

      // Insert template event types
      const templateDbTypes = template.map((type: any, index: number) => ({
        value: type.value,
        label: type.label,
        color: type.color || 'outline',
        icon: type.icon || 'calendar',
        category: type.category,
        description: type.description,
        is_active: true,
        sort_order: index + 1,
      }))

      const { error: insertError } = await supabase
        .from('event_types')
        .insert(templateDbTypes)

      if (insertError) throw insertError

      // Refresh the event types
      return await saveEventTypes([])
    } catch (error) {
      console.error('Error loading template:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to load template' }
    }
  }

  return {
    eventTypes,
    categories,
    isLoading,
    error,
    saveEventTypes,
    saveCategories,
    addEventType,
    updateEventType,
    removeEventType,
    getEventTypeByValue,
    getEventTypesByCategory,
    resetToDefaults,
    loadTemplate,
  }
}

// Helper function to get badge variant for event type
export function getEventTypeBadgeVariant(eventType?: EventType): 'default' | 'secondary' | 'outline' | 'destructive' {
  return eventType?.color || 'outline'
}

// Helper function to get event type display name with fallback
export function getEventTypeDisplayName(value: string, eventTypes: EventType[]): string {
  const eventType = eventTypes.find(type => type.value === value)
  return eventType?.label || value.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}
