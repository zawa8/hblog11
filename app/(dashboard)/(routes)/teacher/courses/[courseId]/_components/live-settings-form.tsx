'use client'

import * as z from 'zod'
import axios from 'axios'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface LiveSettingsFormProps {
  initialData: {
    id: string;
    maxParticipants?: number | null;
    nextLiveDate?: Date | null;
  };
  courseId: string;
}

const formSchema = z.object({
  maxParticipants: z.coerce.number().min(1, {
    message: 'Maximum participants is required',
  }),
  nextLiveDate: z.string().min(1, {
    message: 'Next live session date is required',
  }),
});

export const LiveSettingsForm = ({
  initialData,
  courseId,
}: LiveSettingsFormProps) => {
  const router = useRouter()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      maxParticipants: initialData?.maxParticipants || undefined,
      nextLiveDate: initialData?.nextLiveDate ? format(new Date(initialData.nextLiveDate), "yyyy-MM-dd'T'HH:mm") : undefined,
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
      router.refresh()
    } catch {
      toast.error('Something went wrong')
    }
  }

  // Check live availability and update status
  useEffect(() => {
    const checkLiveAvailability = () => {
      if (!initialData.nextLiveDate) return

      const nextLive = new Date(initialData.nextLiveDate)
      const now = new Date()

      // Update live status if within 15 minutes of start time
      if (Math.abs(nextLive.getTime() - now.getTime()) <= 15 * 60 * 1000) {
        axios.patch(`/api/courses/${courseId}`, {
          isLiveActive: true
        }).catch(console.error)
      }
    }

    const interval = setInterval(checkLiveAvailability, 60 * 1000) // Check every minute
    checkLiveAvailability() // Initial check

    return () => clearInterval(interval)
  }, [initialData.nextLiveDate, courseId])

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        Live Settings
      </div>
      <div>
        <div className="mt-1">
          Next Live Session: {initialData.nextLiveDate
            ? format(new Date(initialData.nextLiveDate), 'PPpp')
            : 'Not scheduled'}
        </div>
        {initialData.nextLiveDate && (
          <div className="mt-4">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 mt-4"
              >
                <FormField
                  control={form.control}
                  name="maxParticipants"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          disabled={isSubmitting}
                          placeholder="Maximum participants"
                          {...field}
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
                    Save changes
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}
      </div>
    </div>
  )
}
