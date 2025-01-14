'use client'

import * as z from 'zod'
import axios from 'axios'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Pencil } from 'lucide-react'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { Course } from '@prisma/client'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// Extend Course type to include live course fields
type CourseWithLive = Course & {
  maxParticipants?: number | null;
  nextLiveDate?: Date | null;
}

interface LiveSettingsFormProps {
  initialData: CourseWithLive
  courseId: string
}

const formSchema = z.object({
  maxParticipants: z.number().min(1, {
    message: 'Maximum participants must be at least 1',
  }),
  nextLiveDate: z.string().min(1, {
    message: 'Next live session date is required',
  }),
})

export const LiveSettingsForm = ({ initialData, courseId }: LiveSettingsFormProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [canStartLive, setCanStartLive] = useState(false)
  const toggleEdit = () => setIsEditing((current) => !current)
  const router = useRouter()

  useEffect(() => {
    const checkLiveAvailability = () => {
      if (!initialData.nextLiveDate) return
      const nextLive = new Date(initialData.nextLiveDate)
      const now = new Date()
      const timeDiff = nextLive.getTime() - now.getTime()
      const minutesDiff = Math.floor(timeDiff / (1000 * 60))
      // Enable button 5 minutes before scheduled time
      setCanStartLive(minutesDiff <= 5 && minutesDiff >= -120) // Allow starting up to 2 hours after scheduled time
    }
    checkLiveAvailability()
    const interval = setInterval(checkLiveAvailability, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [initialData.nextLiveDate])

  const startLiveSession = async () => {
    try {
      await axios.patch(`/api/courses/${courseId}/live`, {
        isLiveActive: true
      })
      toast.success('Live session started')
      router.push(`/courses/${courseId}/live`)
    } catch {
      toast.error('Failed to start live session')
    }
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      maxParticipants: initialData?.maxParticipants || undefined,
      nextLiveDate: initialData?.nextLiveDate ? new Date(initialData.nextLiveDate).toISOString().slice(0, 16) : undefined,
    },
  })

  const { isSubmitting, isValid } = form.formState

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await axios.patch(`/api/courses/${courseId}`, {
        ...values,
        nextLiveDate: new Date(values.nextLiveDate)
      })
      toast.success('Course updated')
      toggleEdit()
      router.refresh()
    } catch {
      toast.error('Something went wrong')
    }
  }

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        Live Course Settings
        <Button onClick={toggleEdit} variant="ghost">
          {isEditing ? (
            <>Cancel</>
          ) : (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              Edit settings
            </>
          )}
        </Button>
      </div>
      {!isEditing ? (
        <div className={cn('text-sm mt-2', !initialData.maxParticipants && 'text-slate-500 italic')}>
          <div>
            Maximum Participants: {initialData.maxParticipants || 'No limit set'}
          </div>
          <div className="mt-1">
            Next Live Session: {initialData.nextLiveDate
              ? new Date(initialData.nextLiveDate).toLocaleString()
              : 'Not scheduled'}
          </div>
          {initialData.nextLiveDate && (
            <div className="mt-4">
              <Button
                onClick={startLiveSession}
                disabled={!canStartLive || initialData.isLiveActive}
                variant="outline"
                className="w-full"
              >
                {initialData.isLiveActive
                  ? 'Live Session in Progress'
                  : canStartLive
                    ? 'Start Live Session'
                    : 'Live Session Not Available Yet'}
              </Button>
              {!canStartLive && !initialData.isLiveActive && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Live session can be started 5 minutes before scheduled time
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="maxParticipants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Participants</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      disabled={isSubmitting}
                      placeholder="e.g. 20"
                      {...field}
                      onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nextLiveDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next Live Session Date & Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-x-2">
              <Button
                disabled={!isValid || isSubmitting}
                type="submit"
              >
                Save
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  )
}
