import { auth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { CircleDollarSign, File, LayoutDashboard, ListChecks } from 'lucide-react'
import { toZonedTime } from 'date-fns-tz'
import { db } from '@/lib/db'
import { IconBadge } from '@/components/icon-badge'
import { TitleForm } from './_components/title-form'
import { DescriptionForm } from './_components/description-form'
import { ImageForm } from './_components/image-form'
import CategoryForm from './_components/category-form'
import { PriceForm } from './_components/price-form'
import { AttachmentForm } from './_components/attachment-form'
import { ChaptersForm } from './_components/chapters-form'
import { ScheduleForm } from './_components/schedule-form'
import { LiveSettingsForm } from './_components/live-settings-form'
import { Banner } from '@/components/banner'
import Actions from './_components/actions'

import { CourseWithRelations, Schedule } from '@/types'

const CourseIdPage = async ({ params }: { params: { courseId: string } }) => {
  const { userId } = auth()

  if (!userId) {
    return redirect('/')
  }

  const course = await db.course.findUnique({
    where: { id: params.courseId, createdById: userId },
    include: {
      attachments: {
        orderBy: { createdAt: 'desc' }
      },
      chapters: {
        orderBy: { position: 'asc' },
        include: {
          muxData: true
        }
      }
    }
  }) as unknown as CourseWithRelations | null

  // Fetch schedules separately
  type ScheduleWithDateObj = Omit<Schedule, 'scheduledDate'> & { scheduledDate: Date };
  const schedules = course ? await (async () => {
    const rawSchedules = await db.$queryRaw<ScheduleWithDateObj[]>`
      SELECT * FROM "Schedule"
      WHERE "courseId" = ${course.id}
      ORDER BY position ASC
    `
    return rawSchedules.map((schedule: ScheduleWithDateObj) => {
      return {
        id: schedule.id,
        topic: schedule.topic,
        speaker: schedule.speaker,
        position: schedule.position,
        courseId: schedule.courseId,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
        scheduledDate: toZonedTime(schedule.scheduledDate, 'Asia/Singapore').toISOString()
      }
    })
  })() : []

  if (course) {
    // Convert nextLiveDate to Asia/Singapore timezone if it exists
    if (course.nextLiveDate) {
      course.nextLiveDate = toZonedTime(course.nextLiveDate, 'Asia/Singapore')
    }
    course.schedules = schedules
  }

  if (!course) {
    return redirect('/')
  }

  const categories = await db.category.findMany({
    orderBy: {
      name: 'asc',
    },
  })

  const requiredFields = [
    course.title,
    course.description,
    course.imageUrl,
    course.price,
    course.categoryId,
    course.courseType === 'LIVE'
      ? course.schedules.length > 0 // Check if there are schedule entries for live courses
      : course.chapters.some((chapter: { isPublished: boolean }) => chapter.isPublished), // Check for published chapters for recorded courses
  ]

  const totalFields = requiredFields.length
  const completedFields = requiredFields.filter(Boolean).length

  const completionText = `(${completedFields}/${totalFields})`

  const isComplete = requiredFields.every(Boolean)

  return (
    <>
      {!course.isPublished && <Banner label="qis course is unpublished. It will not be wisible to q students." />}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-y-2">
            <h1 className="text-2xl font-medium">Course setup</h1>
            <span className="text-sm text-slate-700">Complete all fields {completionText}</span>
          </div>
          <Actions disabled={!isComplete} courseId={params.courseId} isPublished={course.isPublished} />
        </div>
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-x-2">
              <IconBadge icon={LayoutDashboard} />
              <h2 className="text-xl">Customize your course</h2>
            </div>
            <TitleForm initialData={course} courseId={course.id} />
            <DescriptionForm initialData={course} courseId={course.id} />
            <ImageForm initialData={course} courseId={course.id} />
            <CategoryForm
              initialData={course}
              courseId={course.id}
              options={categories.map((category: { name: string, id: string }) => ({
                label: category.name,
                value: category.id,
              }))}
            />
          </div>
          <div className="space-y-6">
            {course.courseType === 'LIVE' ? (
              <>
                <div>
                  <div className="flex items-center gap-x-2">
                    <IconBadge icon={ListChecks} />
                    <h2 className="text-xl">Live Course Settings</h2>
                  </div>
                  <LiveSettingsForm
                    initialData={course}
                    courseId={course.id}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-x-2">
                    <IconBadge icon={ListChecks} />
                    <h2 className="text-xl">Course Schedule</h2>
                  </div>
                  <ScheduleForm
                    courseId={course.id}
                    initialSchedules={course.schedules}
                    nextLiveDate={course.nextLiveDate}
                  />
                </div>
              </>
            ) : (
              <div>
                <div className="flex items-center gap-x-2">
                  <IconBadge icon={ListChecks} />
                  <h2 className="text-xl">Course chapters</h2>
                </div>
                <ChaptersForm initialData={course} courseId={course.id} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-x-2">
                <IconBadge icon={CircleDollarSign} />
                <h2 className="text-xl">Sell your course</h2>
              </div>
              <PriceForm initialData={course} courseId={course.id} />
            </div>
            <div>
              <div className="flex items-center gap-x-2">
                <IconBadge icon={File} />
                <h2 className="text-xl">Resources & Attachments</h2>
              </div>
              <AttachmentForm initialData={course} courseId={course.id} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default CourseIdPage
