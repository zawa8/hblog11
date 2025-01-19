import { db } from '@/lib/db'
import { getProgress } from './get-progress'
import { clerkClient } from '@clerk/nextjs'
import { Prisma, Course } from '@prisma/client'

interface RawQueryResult extends Omit<QueryResult, 'createdAt' | 'updatedAt' | 'schedules'> {
  createdAt: string | Date;
  updatedAt: string | Date;
  schedules: Array<{
    id: string;
    scheduledDate: string | Date;
  }>;
}

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
  category: { id: string; name: string } | null;
  chapters: { id: string }[];
  schedules: { id: string; scheduledDate: Date }[];
  purchases: { id: string }[];
}

export interface CourseWithProgressAndCategory extends QueryResult {
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
                'scheduledDate', s.scheduled_date
              )
            ) FILTER (WHERE s.id IS NOT NULL AND s.scheduled_date >= NOW()),
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
      LEFT JOIN "Schedule" s ON s."courseId" = c.id
      LEFT JOIN "Purchase" p ON p."courseId" = c.id AND p."userId" = ${userId}
      WHERE c."isPublished" = true
      ${categoryId ? Prisma.sql`AND c."categoryId" = ${categoryId}` : Prisma.empty}
      ${title ? Prisma.sql`AND c.title ILIKE ${`%${title}%`}` : Prisma.empty}
      ${type ? Prisma.sql`AND c."courseType" = ${type === 'live' ? 'LIVE' : 'RECORDED'}` : Prisma.empty}
      GROUP BY c.id, cat.id, cat.name
      ORDER BY c."createdAt" DESC
    `;

    const rawCourses = await db.$queryRaw<RawQueryResult[]>(query);

    // Parse dates and ensure proper typing
    const courses = rawCourses.map(course => ({
      ...course,
      createdAt: new Date(course.createdAt),
      updatedAt: new Date(course.updatedAt),
      schedules: Array.isArray(course.schedules) ? course.schedules.map(s => ({
        ...s,
        scheduledDate: new Date(s.scheduledDate)
      })) : [],
      chapters: Array.isArray(course.chapters) ? course.chapters : [],
      purchases: Array.isArray(course.purchases) ? course.purchases : [],
      category: course.category || null
    }));

    const coursesWithProgress = await Promise.all(
      courses.map(async (course) => {
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

    return coursesWithProgress;
  } catch (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
}
