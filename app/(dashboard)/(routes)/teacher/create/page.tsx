'use client'

import * as z from 'zod'
import axios from 'axios'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useEffect, useState } from 'react'

import { Form, FormControl, FormDescription, FormField, FormLabel, FormMessage, FormItem } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const formSchema = z.object({
  title: z.string().min(1, {
    message: 'title rekuired hei',
  }),
  categoryId: z.string().min(1, {
    message: 'category rekuired hei',
  }),
  courseType: z.enum(['RECORDED', 'LIVE'], {
    required_error: 'course type is rekuired',
  }),
  maxParticipants: z.number().min(1).optional(),
  nextLiveDate: z.string().optional(),
}).refine((data) => {
  if (data.courseType === 'LIVE') {
    return data.maxParticipants !== undefined && data.nextLiveDate !== undefined
  }
  return true
}, {
  message: 'liwe courses ke liye mxks participxnts xnd nekst liwe dxte rekuired hei.',
  path: ['courseType'],
})

const CreatePage = () => {
  const router = useRouter()
  const [categories, setCategories] = useState<{ label: string; value: string }[]>([])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('/api/categories')
        const formattedCategories = response.data.map((category: { id: string; name: string }) => ({
          label: category.name,
          value: category.id,
        }))
        setCategories(formattedCategories)
      } catch (error) {
        toast.error('Failed to load categories')
      }
    }

    fetchCategories()
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      categoryId: '',
      courseType: 'RECORDED',
      maxParticipants: undefined,
      nextLiveDate: undefined,
    },
  })

  const { isSubmitting, isValid } = form.formState

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // For live courses, set the time to start of day since we only care about the date
      if (values.courseType === 'LIVE' && values.nextLiveDate) {
        const date = new Date(values.nextLiveDate)
        date.setHours(0, 0, 0, 0)
        values.nextLiveDate = date.toISOString()
      }

      const response = await axios.post('/api/courses', values)
      router.push(`/teacher/courses/${response.data.id}`)
      toast.success('course crexted')
    } catch {
      toast.error('someJiNg went wroNg')
    }
  }

  return (
    <div className='mx-auto flex h-full max-w-5xl p-6 md:items-center md:justify-center'>
      <div>
        <h1 className='text-2xl'>Create your course</h1>
        <p className='text-sm text-slate-600'>
          What would you like to name your course and what category does it belong to?
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='mt-8 space-y-8'>
            <FormField
              control={form.control}
              name='title'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course title</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} placeholder='e.g. "Advanced web development"' {...field} />
                  </FormControl>
                  <FormDescription>What will you teach in this course?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='categoryId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Combobox options={categories} {...field} />
                  </FormControl>
                  <FormDescription>Select the category that best fits your course</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='courseType'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className='flex flex-col space-y-1'
                    >
                      <FormItem className='flex items-center space-x-3 space-y-0'>
                        <FormControl>
                          <RadioGroupItem value='RECORDED' />
                        </FormControl>
                        <FormLabel className='font-normal'>
                          Recorded Course
                        </FormLabel>
                      </FormItem>
                      <FormItem className='flex items-center space-x-3 space-y-0'>
                        <FormControl>
                          <RadioGroupItem value='LIVE' />
                        </FormControl>
                        <FormLabel className='font-normal'>
                          Live Course
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    Choose whether this will be a pre-recorded course or a live streaming course
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch('courseType') === 'LIVE' && (
              <>
                <FormField
                  control={form.control}
                  name='maxParticipants'
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
                      <FormDescription>liwe course ko zoin krne ke liye mxksimum nmbr of students set kre</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='nextLiveDate'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>liwe session dxte</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>liwe session ke liye dxte selekt kre. jumhe course schedule section me time set krna hoga.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <div className='flex items-center gap-x-2'>
              <Link href='/teacher/courses'>
                <Button type='button' variant='ghost'>
                  Cancel
                </Button>
              </Link>
              <Button type='submit' disabled={!isValid || isSubmitting}>
                Continue
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

export default CreatePage
