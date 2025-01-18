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
        nextLiveDate: true,
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

        // Combine nextLiveDate with first schedule's time
        const combinedNextLiveDate = course.nextLiveDate && course.schedules[0]?.scheduledDate ? (() => {
          const date = new Date(course.nextLiveDate);
          const firstScheduleTime = new Date(course.schedules[0].scheduledDate);
          date.setHours(firstScheduleTime.getHours());
          date.setMinutes(firstScheduleTime.getMinutes());
          return date;
        })() : null;

        return {
          ...course,
          progress: progressPercentage,
          nextLiveDate: combinedNextLiveDate,
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
