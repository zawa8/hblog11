'use client'

import Image from 'next/image'
import { format } from 'date-fns'
import { File, Loader2 } from 'lucide-react'
import { Attachment, Category, Course, Purchase } from '@prisma/client'
import { useAuth } from '@clerk/nextjs'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Schedule {
  id: string;
  time: string;
  topic: string;
  speaker: string;
  position: number;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
}

type CourseWithRelations = Course & {
  attachments: Attachment[];
  schedules: Schedule[];
  category: Category | null;
  purchases: Purchase[];
  maxParticipants: number | null;
}

const LiveCoursePage = ({ params }: { params: { courseId: string } }) => {
  const { userId } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [courseData, setCourseData] = useState<CourseWithRelations | null>(null)

  const fetchCourseData = useCallback(async () => {
    try {
      setIsInitialLoading(true)

      // Fetch course details
      const courseResponse = await axios.get(`/api/courses/${params.courseId}`)
      const course = courseResponse.data

      if (!course) {
        toast.error('Course not found')
        return
      }

      // Fetch schedules
      const schedulesResponse = await axios.get(`/api/courses/${params.courseId}/schedules`)
      const schedules = schedulesResponse.data

      setCourseData({
        ...course,
        schedules,
      })
    } catch (error: any) {
      const errorMessage = error?.response?.data || error?.message || 'Failed to load course data'
      toast.error(errorMessage)
      console.error('[FETCH_COURSE_ERROR]:', error)
    } finally {
      setIsInitialLoading(false)
    }
  }, [params.courseId])

  useEffect(() => {
    fetchCourseData()
  }, [fetchCourseData])

  const handleBooking = async () => {
    try {
      setIsLoading(true)
      await axios.post(`/api/courses/${params.courseId}/book`)
      toast.success('Successfully booked!')
      fetchCourseData() // Refresh data
    } catch (error: any) {
      toast.error(error?.response?.data || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-600">Loading course details...</p>
        </div>
      </div>
    )
  }

  if (!courseData && !isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-slate-600">
          <p className="text-xl font-semibold mb-2">Course Not Found</p>
          <p className="text-sm">This course may have been removed or is no longer available.</p>
        </div>
      </div>
    )
  }

  // At this point courseData is guaranteed to be non-null
  const course = courseData!

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Column - Course Details */}
        <div className="flex-1">
          <div className="relative aspect-video rounded-lg overflow-hidden mb-4">
            <Image
              src={course.imageUrl || '/placeholder.jpg'}
              alt={course.title}
              fill
              className="object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold mb-2">{course.title}</h1>
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
            <div className="bg-slate-200 px-2 py-1 rounded">
              {course.category?.name}
            </div>
            <div className="bg-slate-200 px-2 py-1 rounded">
              ${course.price}
            </div>
            {course.nextLiveDate && (
              <div className="bg-slate-200 px-2 py-1 rounded">
                Next Live: {format(new Date(course.nextLiveDate), 'PPP')}
              </div>
            )}
          </div>
          <p className="text-slate-700 mb-4">{course.description}</p>

          {/* Attachments Section */}
          {course.attachments.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Course Materials</h2>
              <div className="space-y-2">
                {course.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-3 bg-sky-100 border border-sky-200 rounded-md hover:bg-sky-200 transition"
                  >
                    <File className="h-4 w-4 mr-2 flex-shrink-0" />
                    <p className="text-sm line-clamp-1">{attachment.name}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Booking and Schedule */}
        <div className="flex-1">
          {/* Booking Section */}
          <div className="bg-slate-100 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold">Available Seats</h3>
                <p className="text-sm text-slate-600">
                  {course.maxParticipants
                    ? `${course.maxParticipants - course.purchases.length} of ${course.maxParticipants} seats remaining`
                    : 'Unlimited seats available'}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {course.purchases.some(p => p.userId === userId) ? (
                  <Button
                    size="lg"
                    variant="outline"
                    disabled={!course.isLiveActive}
                    onClick={() => router.push(`/courses/${params.courseId}/live-classroom`)}
                    className="w-full"
                  >
                   {course.isLiveActive
                   ? 'Join Live Session' : 'Waiting for Live Session'}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    disabled={
                      isLoading ||
                      !userId ||
                      (course.maxParticipants
                        ? course.purchases.length >= course.maxParticipants
                        : false)
                    }
                    onClick={handleBooking}
                  >
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {!userId ? 'Sign in to Book' : isLoading ? 'Booking...' : 'Book Seat'}
                  </Button>
                )}
              </div>
            </div>
            {course.maxParticipants && course.purchases.length >= course.maxParticipants && (
              <p className="text-sm text-red-500">
                This course is currently full. Please check back later.
              </p>
            )}
          </div>

          {/* Schedule Section */}
          <h2 className="text-xl font-semibold mb-4">Course Schedule</h2>
          <div className="space-y-4">
            {course.schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="bg-slate-100 rounded-lg p-4"
              >
                <div className="font-medium text-lg mb-1">{schedule.topic}</div>
                <div className="text-sm text-slate-600 mb-2">
                  Speaker: {schedule.speaker}
                </div>
                <div className="text-sm text-slate-500">
                  Time: {schedule.time}
                </div>
              </div>
            ))}
            {course.schedules.length === 0 && (
              <div className="text-center text-slate-500 p-4 bg-slate-100 rounded-lg">
                No schedule entries found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveCoursePage
