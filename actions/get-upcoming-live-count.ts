import { db } from '@/lib/db'

export async function getUpcomingLiveCount(userId: string): Promise<number> {
  try {
    const now = new Date()
    
    console.log('Checking upcoming live count...')
    console.log('User ID:', userId)
    console.log('Current time:', now)

    // First check if we have any LIVE courses at all
    const allLiveCourses = await db.course.findMany({
      where: {
        courseType: 'LIVE'
      }
    })
    console.log('All LIVE courses:', allLiveCourses.map(c => ({ id: c.id, title: c.title })))

    // Then check purchased courses
    const purchasedCourses = await db.course.findMany({
      where: {
        purchases: {
          some: {
            userId: userId
          }
        },
        courseType: 'LIVE'
      }
    })
    console.log('Purchased LIVE courses:', purchasedCourses.map(c => ({ id: c.id, title: c.title })))

    // Finally check with chapter time filter
    const upcomingLiveCount = await db.course.count({
      where: {
        purchases: {
          some: {
            userId: userId
          }
        },
        courseType: 'LIVE',
        chapters: {
          some: {
            startTime: {
              gt: now
            }
          }
        }
      }
    })

    console.log('Upcoming live count:', upcomingLiveCount)
    return upcomingLiveCount
  } catch {
    return 0
  }
}
