import { db } from '@/lib/db'
import { CourseWithProgressAndCategory } from './get-courses'
import { getProgress } from './get-progress'

export async function getUpcomingLiveCourses(userId: string): Promise<CourseWithProgressAndCategory[]> {
  try {
    const now = new Date()
    
    const courses = await db.course.findMany({
      where: {
        purchases: {
          some: {
            userId: userId
          }
        },
        courseType: 'LIVE'
      },
      include: {
        category: true,
        chapters: true,
        schedules: {
          select: { id: true }
        }
      }
    })

    const coursesWithProgress: CourseWithProgressAndCategory[] = await Promise.all(
      courses.map(async (course) => {
        const progressPercentage = await getProgress(userId, course.id)
        return {
          ...course,
          progress: progressPercentage
        }
      })
    )

    return coursesWithProgress
  } catch {
    return []
  }
}
