import { db } from '@/lib/db'
import { getProgress } from './get-progress'
import { clerkClient } from '@clerk/nextjs'
import { Prisma, Course } from '@prisma/client'

export interface CourseWithProgressAndCategory extends Course {
  category: { id: string; name: string } | null;
  chapters: { id: string }[];
  schedules: { id: string; scheduledDate: Date }[];
  purchases: { id: string }[];
  progress: number | null;
  nextLiveDate: Date | null;
  teacher: {
    name: string;
    image: string | null;
  };
}

type GetCoursesArgs = {
  userId: string;
  title?: string;
  categoryId?: string;
  type?: string;
}

export async function getCourses({
  userId,
  title,
  categoryId,
  type,
}: GetCoursesArgs): Promise<CourseWithProgressAndCategory[]> {
  try {
    // Input validation
    if (!userId?.trim()) {
      throw new Error('userId is required');
    }

    console.log('Filtering courses with params:', { userId, title, categoryId, type });

    const courses = await db.course.findMany({
      where: {
        isPublished: true,
        ...(title && { title: { contains: title, mode: 'insensitive' } }),
        ...(categoryId && { categoryId }),
        ...(type && { courseType: type as 'LIVE' | 'RECORDED' }),
      },
      include: {
        category: true,
        chapters: {
          where: {
            isPublished: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
        schedules: {
          where: {
            scheduledDate: {
              gte: new Date(),
            },
          },
          orderBy: {
            scheduledDate: 'asc',
          },
        },
        purchases: {
          where: {
            userId,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const coursesWithProgress = await Promise.all(
      courses.map(async (course): Promise<CourseWithProgressAndCategory> => {
        const progressPercentage = course.purchases.length === 0 ? null : await getProgress(userId, course.id);
        let teacher;
        try {
          teacher = await clerkClient.users.getUser(course.createdById);
        } catch (error) {
          console.error(`Error fetching teacher for course ${course.id}:`, error);
          teacher = null;
        }

        const nextLiveDate = course.schedules[0]?.scheduledDate || null;

        return {
          ...course,
          progress: progressPercentage,
          nextLiveDate,
          teacher: {
            name: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown Teacher',
            image: teacher?.imageUrl || '/placeholder-avatar.png'
          }
        };
      })
    );

    console.log('Found courses:', courses.map(c => ({ id: c.id, title: c.title, type: c.courseType })));
    return coursesWithProgress;
  } catch (error) {
    console.error('Error fetching courses:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return [];
  }
}
