import { db } from '@/lib/db'
import { CourseWithProgressAndCategory } from './get-courses'
import { getProgress } from './get-progress'
import { clerkClient } from '@clerk/nextjs'

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
        chapters: true,
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
        }
      }
    })

    const coursesWithProgress: CourseWithProgressAndCategory[] = await Promise.all(
      courses.map(async (course: typeof courses[0]) => {
        let progressPercentage;
        let teacher;
        
        try {
          [progressPercentage, teacher] = await Promise.all([
            getProgress(userId, course.id),
            clerkClient.users.getUser(course.createdById)
          ]);
        } catch (error) {
          console.error(`Error fetching data for course ${course.id}:`, error);
          progressPercentage = null;
          teacher = null;
        }

        const nextLiveDate = course.schedules.length > 0 
          ? course.schedules[0].scheduledDate
          : null;

        return {
          ...course,
          progress: progressPercentage,
          nextLiveDate,
          teacher: {
            name: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown Teacher',
            image: teacher?.imageUrl || '/placeholder-avatar.png'
          }
        }
      })
    )

    return coursesWithProgress
  } catch (error) {
    console.error('Error fetching upcoming live courses:', error)
    return []
  }
}
