import { db } from '@/lib/db'
import { getProgress } from './get-progress'

interface Course {
  id: string
  title: string
  imageUrl: string
  courseType: 'RECORDED' | 'LIVE'
  category: { id: string; name: string }
  chapters: { id: string }[]
  schedules: { id: string; scheduledDate: Date }[]
}

interface PurchasedCourse {
  course: Course
}

interface CourseWithProgressAndCategory extends Course {
  progress: number
}

type DashboardCourses = {
  completedCourses: CourseWithProgressAndCategory[]
  coursesInProgress: CourseWithProgressAndCategory[]
  allCourses: CourseWithProgressAndCategory[]
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
      }
    })

    const courses = purchasedCourses.map((purchase: PurchasedCourse) => {
      const course = purchase.course;
      return {
        ...course,
        schedules: course.schedules
          .filter((schedule: { scheduledDate: Date }) => new Date(schedule.scheduledDate) > new Date())
          .sort((a: { scheduledDate: Date }, b: { scheduledDate: Date }) => 
            new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
          )
      };
    }) as CourseWithProgressAndCategory[]

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
      course.courseType === 'RECORDED' && course.progress === 100
    )
    const coursesInProgress = courses.filter((course) => 
      course.courseType === 'RECORDED' && (course?.progress ?? 0) < 100
    )
    const allCourses = courses

    return {
      completedCourses,
      coursesInProgress,
      allCourses,
    }
  } catch {
    return {
      completedCourses: [],
      coursesInProgress: [],
      allCourses: [],
    }
  }
}
