import { db } from '@/lib/db'
import { getProgress } from './get-progress'
import { CourseWithProgressAndCategory } from './get-courses'
import { clerkClient } from '@clerk/nextjs'

type Schedule = {
  id: string
  scheduledDate: Date
}

type PurchasedCourse = {
  course: {
    id: string
    title: string
    description: string | null
    imageUrl: string | null
    price: number | null
    isPublished: boolean
    courseType: 'RECORDED' | 'LIVE'
    categoryId: string | null
    category: { id: string; name: string } | null
    chapters: { id: string }[]
    schedules: Schedule[]
    createdById: string
    createdAt: Date
    updatedAt: Date
    agoraChannelName: string | null
    agoraToken: string | null
    isLiveActive: boolean
    maxParticipants: number | null
  }
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
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            price: true,
            isPublished: true,
            courseType: true,
            createdById: true,
            createdAt: true,
            updatedAt: true,
            category: true,
            chapters: {
              where: { isPublished: true }
            },
            categoryId: true,
            agoraChannelName: true,
            agoraToken: true,
            isLiveActive: true,
            maxParticipants: true,
            schedules: true
          }
        }
      }
    })

    const courses = await Promise.all(
      purchasedCourses.map(async (purchase: PurchasedCourse) => {
        const course = purchase.course;
        let teacher;
        try {
          teacher = await clerkClient.users.getUser(course.createdById);
        } catch (error) {
          console.error(`Error fetching teacher for course ${course.id}:`, error);
          teacher = null;
        }
        return {
          ...course,
          schedules: course.schedules
            .filter((schedule: Schedule) => new Date(schedule.scheduledDate) > new Date())
            .sort((a: Schedule, b: Schedule) => 
              new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
            ),
          nextLiveDate: course.schedules
            .filter((schedule: Schedule) => new Date(schedule.scheduledDate) > new Date())
            .sort((a: Schedule, b: Schedule) => 
              new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
            )[0]?.scheduledDate || null,
          teacher: {
            name: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown Teacher',
            image: teacher?.imageUrl || '/placeholder-avatar.png'
          }
        };
      })
    ) as CourseWithProgressAndCategory[]

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
  } catch (error) {
    console.error('Error fetching dashboard courses:', error)
    return {
      completedCourses: [],
      coursesInProgress: [],
      allCourses: [],
    }
  }
}
