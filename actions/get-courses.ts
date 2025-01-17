import { db } from '@/lib/db'
import { getProgress } from './get-progress'
import { clerkClient } from '@clerk/nextjs'

export type CourseWithProgressAndCategory = Awaited<ReturnType<typeof db.course.findFirst>> & {
  category: { id: string; name: string } | null
  chapters: { id: string }[]
  schedules: { id: string; scheduledDate: Date }[]
  progress: number | null
  teacher: {
    name: string
    image: string | null
  }
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
        categoryId: true,
        category: true,
        agoraChannelName: true,
        agoraToken: true,
        isLiveActive: true,
        maxParticipants: true,
        chapters: { 
          where: { isPublished: true }, 
          select: { id: true } 
        },
        schedules: { 
          select: { 
            id: true,
            scheduledDate: true 
          },
          orderBy: {
            scheduledDate: 'asc'
          },
          where: {
            scheduledDate: {
              gte: new Date()
            }
          }
        },
        purchases: { 
          where: { userId },
          select: { id: true }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const coursesWithProgress: CourseWithProgressAndCategory[] = await Promise.all(
      courses.map(async (course: typeof courses[0]) => {
        const progressPercentage = course.purchases.length === 0 ? null : await getProgress(userId, course.id);
        let teacher;
        try {
          teacher = await clerkClient.users.getUser(course.createdById);
        } catch (error) {
          console.error(`Error fetching teacher for course ${course.id}:`, error);
          teacher = null;
        }

        return {
          ...course,
          progress: progressPercentage,
          teacher: {
            name: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown Teacher',
            image: teacher?.imageUrl || '/placeholder-avatar.png'
          }
        }
      }),
    )

    return coursesWithProgress
  } catch (error) {
    console.error('Error fetching courses:', error)
    return []
  }
}
