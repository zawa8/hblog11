'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ScheduleForm } from '@/components/schedule-form'
import { Button } from '@/components/ui/button'

interface Schedule {
  id: string
  time: string
  topic: string
  speaker: string
  position: number
}

const SchedulePage = ({ params }: { params: { courseId: string } }) => {
  const router = useRouter()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const response = await axios.get(`/api/courses/${params.courseId}/schedules`)
        const sortedSchedules = response.data.sort((a: Schedule, b: Schedule) => a.position - b.position)
        setSchedules(sortedSchedules)
      } catch (error) {
        toast.error('Failed to load schedules')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSchedules()
  }, [params.courseId])

  const handleScheduleChange = async (scheduleEntries: { time: string; topic: string; speaker: string }[]) => {
    try {
      setIsSaving(true)
      await axios.put(`/api/courses/${params.courseId}/schedules`, {
        schedules: scheduleEntries.map((entry, index) => ({
          ...entry,
          position: index
        }))
      })
      toast.success('Schedule updated')
      router.refresh()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        Loading...
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Course Schedule</h1>
          <p className="text-sm text-slate-600">
            Manage your live course schedule by adding, removing, or reordering sessions.
          </p>
        </div>
        <Button
          onClick={() => router.push(`/teacher/courses/${params.courseId}`)}
          variant="ghost"
        >
          Back to Course
        </Button>
      </div>

      <div className="space-y-4">
        <ScheduleForm
          initialSchedule={schedules.map(({ time, topic, speaker }) => ({
            time,
            topic,
            speaker
          }))}
          onScheduleChange={handleScheduleChange}
          isSaving={isSaving} // Pass isSaving to ScheduleForm
        />
      </div>
    </div>
  )
}

export default SchedulePage
