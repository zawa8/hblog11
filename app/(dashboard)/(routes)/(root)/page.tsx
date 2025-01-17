import { auth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import CoursesList from '@/components/course-list'
import { getDashboardCourses } from '@/actions/get-dashboard-courses'
import { WelcomeBanner } from '@/components/welcome-banner'

export default async function Dashboard() {
  const { userId } = auth()

  if (!userId) {
    return redirect('/sign-in')
  }

  const { completedCourses, coursesInProgress } = await getDashboardCourses(userId)

  return (
    <div className="space-y-6 p-6">
      <WelcomeBanner />
      <CoursesList items={[...coursesInProgress, ...completedCourses]} />
    </div>
  )
}
