import Image from 'next/image'
import { currentUser } from '@clerk/nextjs'
import { Calendar, CheckCircle, Clock } from 'lucide-react'
import { InfoCard } from '@/app/(dashboard)/(routes)/(root)/_components/info-card'
import { getDashboardCourses } from '@/actions/get-dashboard-courses'
import { getUpcomingLiveCount } from '@/actions/get-upcoming-live-count'

const StatsCards = async ({ userId }: { userId: string }) => {
  const { completedCourses, coursesInProgress } = await getDashboardCourses(userId)
  const upcomingLiveCount = await getUpcomingLiveCount(userId)

  return (
    <>
      <InfoCard icon={Clock} label="In Progress" numberOfItems={coursesInProgress.length} />
      <InfoCard icon={CheckCircle} label="Completed" numberOfItems={completedCourses.length} variant="success" />
      <InfoCard icon={Calendar} label="Upcoming Live" numberOfItems={upcomingLiveCount} />
    </>
  )
}

export const WelcomeBanner = async () => {
  const user = await currentUser()
  const userId = user?.id
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Student'

  return (
    <div className="relative w-full min-h-[200px] bg-violet-50 rounded-xl p-8 flex flex-col md:flex-row justify-between items-start gap-8">
      <div className="flex items-center gap-x-8">
        <div className="h-[200px] aspect-square relative">
          <Image
            src="/mascot-doctor.png"
            alt="Panda Doctor Mascot"
            fill
            className="object-contain"
          />
        </div>
        <div className="space-y-2">
          <div className="space-y-1">
            <p className="text-2xl font-medium">
              Welcome Back
            </p>
            <h1 className="text-3xl font-bold">
              <span className="text-violet-600">
                {fullName}
              </span>
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Let&apos;s Begin Learning where you left off,
          </p>
          <p className="text-muted-foreground text-lg">
            Keep it up and improve your progress
          </p>
        </div>
      </div>
      {userId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full md:w-auto md:flex-1 md:max-w-[800px] lg:max-w-[1000px]">
          <StatsCards userId={userId} />
        </div>
      )}
    </div>
  )
}
