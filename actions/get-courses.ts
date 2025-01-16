import { Category, Course } from '@prisma/client'
import { db } from '@/lib/db'
import { getProgress } from './get-progress'

export type CourseWithProgressAndCategory = Course & {
  category: Category | null
  chapters: { id: string }[]
  schedules: { id: string }[]
  progress: number | null
}

type GetCoursesArgs = {
  userId: string
  title?: string
  categoryId?: string
  type?: string
}

export async function getCourses({
  userId,
  title,
  categoryId,
  type,
}: GetCoursesArgs): Promise<CourseWithProgressAndCategory[]> {
  try {
    const courses = await db.course.findMany({
      where: {
        isPublished: true,
        title: { contains: title, mode: 'insensitive' },
        categoryId,
        ...(type && {
          courseType: type === 'live' ? 'LIVE' : 'RECORDED'
        })
      },
      include: {
        category: true,
        chapters: { where: { isPublished: true }, select: { id: true } },
        schedules: { select: { id: true } },
        purchases: { where: { userId } },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const coursesWithProgress: CourseWithProgressAndCategory[] = await Promise.all(
      courses.map(async (course) => {
        if (course.purchases.length === 0) {
          return { ...course, progress: null }
        }

        const progressPercentage = await getProgress(userId, course.id)
        return {
          ...course,
          progress: progressPercentage,
        }
      }),
    )

    return coursesWithProgress
  } catch {
    return []
  }
}
