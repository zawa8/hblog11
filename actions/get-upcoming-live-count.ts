import { db } from '@/lib/db'

export async function getUpcomingLiveCount(userId: string): Promise<number> {
  try {
    const now = new Date()
    
    const upcomingLiveCount = await db.chapter.count({
      where: {
        course: {
          purchases: {
            some: {
              userId: userId
            }
          },
          courseType: 'LIVE'
        },
        startTime: {
          gt: now
        }
      }
    })

    return upcomingLiveCount
  } catch {
    return 0
  }
}
