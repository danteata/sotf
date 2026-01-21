'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'

interface AttendeesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: any | null
}

export function AttendeesDialog({
  open,
  onOpenChange,
  record,
}: AttendeesDialogProps) {
  const attendanceId = record?.attendance_id || record?._id || record?.id;

  const rawAttendees = useQuery(
    api.attendance.getAttendeesWithDetails,
    open && attendanceId ? { attendanceId: attendanceId as Id<"attendance"> } : "skip"
  );

  const loading = open && rawAttendees === undefined;

  // No frontend filtering for source-specific views needed anymore
  const attendees = (rawAttendees || []).filter((a): a is NonNullable<typeof a> => !!a);

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
                      {a.name || 'Unknown'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.email}
                    </div>
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
