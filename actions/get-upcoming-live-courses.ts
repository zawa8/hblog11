import { db } from '@/lib/db'
import { Course, Prisma } from '@prisma/client'
import { CourseWithProgressAndCategory } from './get-courses'
import { getProgress } from './get-progress'
import { clerkClient } from '@clerk/nextjs'

interface QueryResult {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  isPublished: boolean;
  courseType: Course['courseType'];
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  categoryId: string | null;
  agoraChannelName: string | null;
  agoraToken: string | null;
  isLiveActive: boolean;
  maxParticipants: number | null;
  isCourseLive: boolean;
  nextLiveDate: Date | null;
  category: { id: string; name: string } | null;
  chapters: { id: string }[];
  schedules: { id: string; scheduledDate: Date }[];
  purchases: { id: string }[];
}

interface RawQueryResult extends Omit<QueryResult, 'createdAt' | 'updatedAt' | 'schedules' | 'nextLiveDate'> {
  createdAt: string | Date;
  updatedAt: string | Date;
  nextLiveDate: string | Date | null;
  schedules: Array<{
    id: string;
    scheduledDate: string | Date;
  }>;
}

export async function getUpcomingLiveCourses(userId: string): Promise<CourseWithProgressAndCategory[]> {
  try {
    const now = new Date()
    
    const query = Prisma.sql`
      SELECT 
        c.*,
        CAST(
          CASE 
            WHEN cat.id IS NOT NULL THEN 
              json_build_object('id', cat.id, 'name', cat.name)
            ELSE NULL 
          END 
        AS jsonb) as category,
        CAST(
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object('id', ch.id)
            ) FILTER (WHERE ch.id IS NOT NULL),
            '[]'
          ) AS jsonb
        ) as chapters,
        CAST(
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', s.id,
                'scheduledDate', s."scheduledDate"
              )
            ) FILTER (WHERE s.id IS NOT NULL AND s."scheduledDate" > ${now}),
            '[]'
          ) AS jsonb
        ) as schedules,
        CAST(
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object('id', p.id)
            ) FILTER (WHERE p.id IS NOT NULL),
            '[]'
          ) AS jsonb
        ) as purchases
      FROM "Course" c
      LEFT JOIN "Category" cat ON c."categoryId" = cat.id
      LEFT JOIN "Chapter" ch ON ch."courseId" = c.id AND ch."isPublished" = true
      LEFT JOIN "Schedule" s ON s."courseId" = c.id AND s."scheduledDate" > ${now}
      LEFT JOIN "Purchase" p ON p."courseId" = c.id AND p."userId" = ${userId}
      WHERE c."courseType" = 'LIVE'
      AND c."isCourseLive" = false
      AND c."isPublished" = true
      AND EXISTS (
        SELECT 1 FROM "Purchase" 
        WHERE "courseId" = c.id 
        AND "userId" = ${userId}
      )
      AND (
        c."nextLiveDate" > ${now}
        OR EXISTS (
          SELECT 1 FROM "Schedule"
          WHERE "courseId" = c.id
          AND "scheduledDate" > ${now}
        )
      )
      GROUP BY c.id, cat.id, cat.name
      ORDER BY c."createdAt" DESC
    `;

    const rawCourses = await db.$queryRaw<RawQueryResult[]>(query);

    // Parse dates and ensure proper typing
    const courses = rawCourses.map(course => ({
      ...course,
      createdAt: new Date(course.createdAt),
      updatedAt: new Date(course.updatedAt),
      nextLiveDate: course.nextLiveDate ? new Date(course.nextLiveDate) : null,
      schedules: Array.isArray(course.schedules) ? course.schedules.map((s: { id: string; scheduledDate: string | Date }) => ({
        ...s,
        scheduledDate: new Date(s.scheduledDate)
      })) : [],
      chapters: Array.isArray(course.chapters) ? course.chapters : [],
      purchases: Array.isArray(course.purchases) ? course.purchases : [],
      category: course.category || null
    }));

    const coursesWithProgress: CourseWithProgressAndCategory[] = await Promise.all(
      courses.map(async (course) => {
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
          id: course.id,
          title: course.title,
          description: course.description,
          imageUrl: course.imageUrl,
          price: course.price,
          isPublished: course.isPublished,
          courseType: course.courseType,
          createdById: course.createdById,
          createdAt: course.createdAt,
          updatedAt: course.updatedAt,
          categoryId: course.categoryId,
          agoraChannelName: course.agoraChannelName,
          agoraToken: course.agoraToken,
          isLiveActive: course.isLiveActive,
          maxParticipants: course.maxParticipants,
          isCourseLive: course.isCourseLive,
          category: course.category,
          chapters: course.chapters,
          schedules: course.schedules,
          purchases: course.purchases,
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
