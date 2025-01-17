import { db } from '@/lib/db'

export async function getUpcomingLiveCount(userId: string): Promise<number> {
  try {
    const upcomingLiveCount = await db.course.count({
      where: {
        purchases: {
          some: {
            userId: userId
          }
        },
        courseType: 'LIVE'
      }
    })

    return upcomingLiveCount
  } catch {
    return 0
  }
}
