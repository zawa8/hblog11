'use client'

import axios from 'axios'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Schedule {
  id: string
  time: string
  topic: string
  speaker: string
  position: number
}

interface ScheduleFormProps {
  courseId: string
  initialSchedules?: Schedule[]
}

export const ScheduleForm = ({
  courseId,
  initialSchedules = [],
}: ScheduleFormProps) => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [schedules, setSchedules] = useState<Array<{
    time: string
    topic: string
    speaker: string
  }>>(initialSchedules.map(({ time, topic, speaker }) => ({
    time,
    topic,
    speaker
  })))

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
      await axios.put(`/api/courses/${courseId}/schedules`, {
        schedules: schedules.map((entry, index) => ({
          ...entry,
          position: index
        }))
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
              <Input
                type="time"
                value={entry.time}
                onChange={(e) => updateEntry(index, 'time', e.target.value)}
                placeholder="Time"
                disabled={isLoading}
              />
            </div>
            <div className="flex-[2]">
              <Input
                value={entry.topic}
                onChange={(e) => updateEntry(index, 'topic', e.target.value)}
                placeholder="Topic"
                disabled={isLoading}
              />
            </div>
            <div className="flex-[2]">
              <Input
                value={entry.speaker}
                onChange={(e) => updateEntry(index, 'speaker', e.target.value)}
                placeholder="Speaker"
                disabled={isLoading}
              />
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
