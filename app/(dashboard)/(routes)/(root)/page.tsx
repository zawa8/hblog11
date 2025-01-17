import { auth, currentUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { getDashboardCourses } from '@/actions/get-dashboard-courses'
import { getUpcomingLiveCount } from '@/actions/get-upcoming-live-count'
import { getUpcomingLiveCourses } from '@/actions/get-upcoming-live-courses'
import { DashboardContent } from '@/app/(dashboard)/(routes)/(root)/_components/dashboard-content'

export default async function Dashboard() {
  const { userId } = auth()
  if (!userId) {
    return redirect('/sign-in')
  }

  const user = await currentUser()
  const [
    { completedCourses, coursesInProgress, allCourses },
    upcomingLiveCount,
    upcomingLiveCourses
  ] = await Promise.all([
    getDashboardCourses(userId),
    getUpcomingLiveCount(userId),
    getUpcomingLiveCourses(userId)
  ])

  const initialData = {
    userId,
    fullName: user ? `${user.firstName} ${user.lastName}` : 'Student',
    completedCourses,
    coursesInProgress,
    upcomingLiveCount,
    upcomingLiveCourses,
    allCourses
  }

  return <DashboardContent initialData={initialData} />
}
