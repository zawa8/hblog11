'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ScheduleEntry {
  time: string
  topic: string
  speaker: string
  isSaving?: boolean; // Add isSaving prop
}
interface ScheduleFormProps {
  initialSchedule?: ScheduleEntry[]
  onScheduleChange: (schedule: ScheduleEntry[]) => void
  isSaving?: boolean;
}

export const ScheduleForm = ({
  initialSchedule = [],
  onScheduleChange,
}: ScheduleFormProps) => {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>(initialSchedule)

  const addEntry = () => {
    const newSchedule = [...schedule, { time: '', topic: '', speaker: '' }]
    setSchedule(newSchedule)
    onScheduleChange(newSchedule)
  }

  const removeEntry = (index: number) => {
    const newSchedule = schedule.filter((_, i) => i !== index)
    setSchedule(newSchedule)
    onScheduleChange(newSchedule)
  }

  const updateEntry = (index: number, field: keyof ScheduleEntry, value: string) => {
    const newSchedule = schedule.map((entry, i) => {
      if (i === index) {
        return { ...entry, [field]: value }
      }
      return entry
    })
    setSchedule(newSchedule)
    onScheduleChange(newSchedule)
  }

  return (
    <div className="space-y-4">
      {schedule.map((entry, index) => (
        <div key={index} className="flex gap-4 items-start">
          <div className="flex-1">
            <Input
              type="time"
              value={entry.time}
              onChange={(e) => updateEntry(index, 'time', e.target.value)}
              placeholder="Time"
            />
          </div>
          <div className="flex-[2]">
            <Input
              value={entry.topic}
              onChange={(e) => updateEntry(index, 'topic', e.target.value)}
              placeholder="Topic"
            />
          </div>
          <div className="flex-[2]">
            <Input
              value={entry.speaker}
              onChange={(e) => updateEntry(index, 'speaker', e.target.value)}
              placeholder="Speaker"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => removeEntry(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={addEntry}
        className="mt-4"
      >
        Add Schedule Entry
      </Button>
    </div>
  )
}
