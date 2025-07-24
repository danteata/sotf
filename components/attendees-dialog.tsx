import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'

interface AttendeesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: any | null
  ministries?: string[]
  ministryId?: string
  regions?: string[]
  source?: string
}

export function AttendeesDialog({
  open,
  onOpenChange,
  record,
  ministries,
  ministryId,
  regions,
  source,
}: AttendeesDialogProps) {
  const [attendees, setAttendees] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !record) return
    const fetchAttendees = async () => {
      setLoading(true)
      setError(null)
      setAttendees([])
      try {
        const attendanceId = record.attendance_id || record.id
        const { data, error } = await supabase
          .from('member_attendance')
          .select('member_id, members(name, email, region, region_id)')
          .eq('attendance_id', attendanceId)
        if (error) throw error
        let filtered = data
        if (
          (source === 'ministry' && ministries && ministries.length > 0) ||
          ministryId
        ) {
          console.log('check ministry id', ministryId, ministries)
          // Step 1: Get all member_ids for the ministry (or ministries)
          const filterIds: string[] = ministryId
            ? [ministryId]
            : ministries ?? []
          const { data: mmData, error: mmError } = await supabase
            .from('member_ministries')
            .select('member_id')
            .in('ministry_id', filterIds)
          if (mmError) throw mmError
          const ministryMemberIds = (mmData ?? []).map(
            (mm: any) => mm.member_id
          )
          // Step 2: Filter attendees to those member_ids
          filtered = data.filter((a: any) =>
            ministryMemberIds.includes(a.member_id)
          )
          // Optionally, fetch ministry name for display (if needed)
          if (filterIds.length === 1 && filtered.length > 0) {
            const { data: ministriesData, error: ministriesError } =
              await supabase
                .from('ministries')
                .select('id, name')
                .eq('id', filterIds[0])
            if (
              !ministriesError &&
              ministriesData &&
              ministriesData.length > 0
            ) {
              filtered = filtered.map((a: any) => ({
                ...a,
                ministry_names: [ministriesData[0].name],
              }))
            }
          }
        } else if (source === 'region' && regions && regions.length > 0) {
          // Filter by region_id (not legacy region name)
          filtered = data.filter((a: any) =>
            regions.includes(a.members?.region_id)
          )
        }
        setAttendees(filtered)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAttendees()
  }, [open, record, ministries, regions, source])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attendees ({attendees.length})</DialogTitle>
          <DialogDescription>
            {record && (
              <>
                Event:{' '}
                <b>
                  {record.event_type_label ||
                    record.event_type_value ||
                    'Unknown'}
                </b>
                <br />
                Date: <b>{record.date}</b>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="text-center py-4">Loading attendees...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-4">{error}</div>
        ) : attendees.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No attendees found
          </div>
        ) : (
          <div className="max-h-64 overflow-auto">
            <ul className="space-y-2">
              {attendees.map((a, idx) => (
                <li key={a.member_id} className="border-b pb-1 flex gap-2">
                  <span className="text-xs text-muted-foreground w-6 text-right select-none">
                    {idx + 1}.
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">
                      {a.members?.name || 'Unknown'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.members?.email}
                    </div>
                    {source === 'region' && (
                      <div className="text-xs text-muted-foreground">
                        Region:{' '}
                        {a.members?.region || a.members?.region_id || 'Unknown'}
                      </div>
                    )}
                    {source === 'ministry' &&
                      Array.isArray(a.ministry_names) &&
                      a.ministry_names.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Ministries: {a.ministry_names.join(', ')}
                        </div>
                      )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
