import { auth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { Schedule } from '@prisma/client'

interface Course {
  id: string
  createdById: string
  title: string
  description: string | null
  imageUrl: string | null
  price: number | null
  isPublished: boolean
  categoryId: string | null
  createdAt: Date
  updatedAt: Date
  agoraChannelName: string | null
  agoraToken: string | null
  courseType: 'RECORDED' | 'LIVE'
  isLiveActive: boolean
  isCourseLive: boolean
  nextLiveDate: Date | null
  maxParticipants: number | null
  schedules: Schedule[]
}

type CourseWithSchedule = Course & {
  nextSchedule: Schedule | null
}
import { DataTable } from './_component/data-table'
import { columns } from './_component/columns'

export default async function Courses() {
  const { userId } = auth()

  if (!userId) {
    return redirect('/')
  }

  const courses = await db.course.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      schedules: {
        where: {
          scheduledDate: {
            gte: new Date()
          }
        },
        orderBy: {
          scheduledDate: 'asc'
        },
        take: 1
      }
    }
  })

  // Transform the data to include nextSchedule directly on the course object
  const transformedCourses: CourseWithSchedule[] = courses.map(course => ({
    ...course,
    isCourseLive: false,
    nextSchedule: course.schedules[0] || null
  }))

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Courses</h1>
      <DataTable columns={columns} data={transformedCourses} />
    </div>
  )
}
