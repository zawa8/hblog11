'use client'

import axios from 'axios'
import { useState } from 'react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ScheduleInput {
  time: string
  topic: string
  speaker: string
}

interface Schedule {
  id: string
  topic: string
  speaker: string
  position: number
  scheduledDate: string
}

interface ScheduleFormProps {
  courseId: string
  initialSchedules?: Schedule[]
  nextLiveDate?: Date | null
}

export const ScheduleForm = ({
  courseId,
  initialSchedules = [],
  nextLiveDate,
}: ScheduleFormProps) => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [schedules, setSchedules] = useState<ScheduleInput[]>(
    initialSchedules?.map((schedule) => ({
      time: format(new Date(schedule.scheduledDate), 'HH:mm'),
      topic: schedule.topic,
      speaker: schedule.speaker
    })) || []
  )

  if (!nextLiveDate) {
    return (
      <div className="relative mt-6 border bg-slate-100 rounded-md p-4">
        <div className="text-sm text-muted-foreground">
          Please set the next live session date first in the Live Course Settings above.
        </div>
      </div>
    )
  }

  const addEntry = () => {
    setSchedules([...schedules, { time: '', topic: '', speaker: '' }])
  }

  const removeEntry = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index))
  }

  const updateEntry = (index: number, field: 'time' | 'topic' | 'speaker', value: string) => {
    const newSchedules = schedules.map((entry, i) => {
      if (i === index) {
        return { ...entry, [field]: value }
      }
      return entry
    })
    setSchedules(newSchedules)
  }

  const onSubmit = async () => {
    try {
      setIsLoading(true)

      // Check for empty fields and collect them
      const emptyFields = schedules.reduce((acc: string[], entry, index) => {
        const missing = []
        if (!entry.time) missing.push('time')
        if (!entry.topic) missing.push('topic')
        if (!entry.speaker) missing.push('speaker')
        if (missing.length > 0) {
          acc.push(`Entry ${index + 1}: ${missing.join(', ')}`)
        }
        return acc
      }, [])

      if (emptyFields.length > 0) {
        toast.error(`Please fill in all required fields:\n${emptyFields.join('\n')}`)
        return
      }
      // Calculate scheduledDate for each entry based on nextLiveDate and time
      const schedulesWithDates = schedules.map((entry, index) => {
        const [hours, minutes] = entry.time.split(':').map(Number)
        const scheduleDate = new Date(nextLiveDate!)
        // Set time in UTC+8 (Asia/Singapore)
        scheduleDate.setHours(hours)
        scheduleDate.setMinutes(minutes)
        return {
          topic: entry.topic,
          speaker: entry.speaker,
          position: index,
          scheduledDate: scheduleDate.toISOString()
        }
      })

      await axios.put(`/api/courses/${courseId}/schedules`, {
        schedules: schedulesWithDates
      })
      toast.success('Schedule updated')
      router.refresh()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative mt-6 border bg-slate-100 rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        Course Schedule
        <Button onClick={addEntry} variant="ghost">
          Add Schedule Entry
        </Button>
      </div>
      <div className="space-y-4 mt-4">
        {schedules.map((entry, index) => (
          <div key={index} className="flex gap-x-4">
            <div className="flex-1">
              <div className="flex flex-col gap-1">
                <Input
                  type="time"
                  value={entry.time}
                  onChange={(e) => updateEntry(index, 'time', e.target.value)}
                  placeholder="Time"
                  disabled={isLoading}
                />
                {!entry.time && (
                  <span className="text-xs text-muted-foreground">
                    Select a time
                  </span>
                )}
              </div>
            </div>
            <div className="flex-[2]">
              <div className="flex flex-col gap-1">
                <Input
                  value={entry.topic}
                  onChange={(e) => updateEntry(index, 'topic', e.target.value)}
                  placeholder="Topic"
                  disabled={isLoading}
                />
                {!entry.topic && (
                  <span className="text-xs text-muted-foreground">
                    Enter topic
                  </span>
                )}
              </div>
            </div>
            <div className="flex-[2]">
              <div className="flex flex-col gap-1">
                <Input
                  value={entry.speaker}
                  onChange={(e) => updateEntry(index, 'speaker', e.target.value)}
                  placeholder="Speaker"
                  disabled={isLoading}
                />
                {!entry.speaker && (
                  <span className="text-xs text-muted-foreground">
                    Enter speaker name
                  </span>
                )}
              </div>
            </div>
            <div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => removeEntry(index)}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      {schedules.length > 0 && (
        <div className="flex justify-end mt-4">
          <Button
            onClick={onSubmit}
            disabled={isLoading}
          >
            Save Schedule
          </Button>
        </div>
      )}
    </div>
  )
}
