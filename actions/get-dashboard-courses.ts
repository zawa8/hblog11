import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getProgress } from './get-progress'

type CourseWithProgressAndCategory = Prisma.CourseGetPayload<{
  include: {
    category: true;
    chapters: true;
    schedules: true;
  }
}> & {
  progress: number;
}

type DashboardCourses = {
  completedCourses: CourseWithProgressAndCategory[]
  coursesInProgress: CourseWithProgressAndCategory[]
}

export async function getDashboardCourses(userId: string): Promise<DashboardCourses> {
  try {
    const purchasedCourses = await db.purchase.findMany({
      where: { userId },
      select: {
        course: {
          include: {
            category: true,
            chapters: {
              where: { isPublished: true }
            },
            schedules: true
          }
        }
      },
    })

    const courses = purchasedCourses.map((purchase) => purchase.course) as CourseWithProgressAndCategory[]

    for (const course of courses) {
      if (course.courseType === 'RECORDED') {
        const progress = await getProgress(userId, course.id)
        course.progress = progress
      } else {
        // For live courses, if they have schedules, they are in progress
        course.progress = course.schedules?.length > 0 ? 0 : 100
      }
    }

    const completedCourses = courses.filter((course) => 
      course.courseType === 'RECORDED' ? course.progress === 100 : false
    )
    const coursesInProgress = courses.filter((course) => 
      course.courseType === 'RECORDED' ? (course?.progress ?? 0) < 100 : true
    )

    return {
      completedCourses,
      coursesInProgress,
    }
  } catch {
    return {
      completedCourses: [],
      coursesInProgress: [],
    }
  }
}
