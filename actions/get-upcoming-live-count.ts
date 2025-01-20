import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

type CountResult = {
  count: bigint;
}

export async function getUpcomingLiveCount(userId: string): Promise<number> {
  try {
    const currentDate = new Date();
    
    // Using Prisma.sql for raw query to handle the isCourseLive field
    const result = await db.$queryRaw<CountResult[]>`
      SELECT COUNT(DISTINCT c.id)
      FROM "Course" c
      LEFT JOIN "Purchase" p ON c.id = p."courseId"
      LEFT JOIN "Schedule" s ON c.id = s."courseId"
      WHERE p."userId" = ${userId}
      AND c."courseType" = 'LIVE'
      AND c."isCourseLive" = false
      AND c."isPublished" = true
      AND (
        c."nextLiveDate" > ${currentDate}
        OR s."scheduledDate" > ${currentDate}
      )
    `;

    // result is an array with a single count object
    return Number(result[0].count) || 0;
  } catch {
    return 0
  }
}
