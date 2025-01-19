import { auth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { DataTable } from './_component/data-table'
import { columns, CourseWithSchedule } from './_component/columns'
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
      },
      purchases: true
    }
  })

  // Transform the data to include nextSchedule directly on the course object
  const transformedCourses: CourseWithSchedule[] = courses.map(course => ({
    ...course,
    nextSchedule: course.schedules[0] || null,
    isCourseLive: (course as any).isCourseLive || false,
    purchases: course.purchases || []
  }))

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Courses</h1>
      <DataTable columns={columns} data={transformedCourses} />
    </div>
  )
}
