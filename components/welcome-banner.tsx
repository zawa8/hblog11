'use client'

import Image from 'next/image'
import { Calendar, CheckCircle, Clock } from 'lucide-react'
import { InfoCard } from '@/app/(dashboard)/(routes)/(root)/_components/info-card'
import { CourseWithProgressAndCategory } from '@/actions/get-courses'

interface StatsCardsProps {
  userId: string
  completedCourses: CourseWithProgressAndCategory[]
  coursesInProgress: CourseWithProgressAndCategory[]
  upcomingLiveCount: number
  onFilterChange: (filter: string | null) => void
  activeFilter: string | null
}

const StatsCards = ({
  completedCourses,
  coursesInProgress,
  upcomingLiveCount,
  onFilterChange,
  activeFilter
}: StatsCardsProps) => {
  return (
    <>
      <div onClick={() => onFilterChange(activeFilter === 'in-progress' ? null : 'in-progress')} className="cursor-pointer">
        <InfoCard
          icon={Clock}
          label="In Progress"
          numberOfItems={coursesInProgress.length}
          isActive={activeFilter === 'in-progress'}
        />
      </div>
      <div onClick={() => onFilterChange(activeFilter === 'completed' ? null : 'completed')} className="cursor-pointer">
        <InfoCard
          icon={CheckCircle}
          label="Completed"
          numberOfItems={completedCourses.length}
          variant="success"
          isActive={activeFilter === 'completed'}
        />
      </div>
      <div onClick={() => onFilterChange(activeFilter === 'upcoming' ? null : 'upcoming')} className="cursor-pointer">
        <InfoCard
          icon={Calendar}
          label="Upcoming Live"
          numberOfItems={upcomingLiveCount}
          isActive={activeFilter === 'upcoming'}
        />
      </div>
    </>
  )
}

interface WelcomeBannerProps {
  userId: string
  fullName: string
  completedCourses: CourseWithProgressAndCategory[]
  coursesInProgress: CourseWithProgressAndCategory[]
  upcomingLiveCount: number
  onFilterChange: (filter: string | null) => void
  activeFilter: string | null
}

export const WelcomeBanner = ({
  userId,
  fullName,
  completedCourses,
  coursesInProgress,
  upcomingLiveCount,
  onFilterChange,
  activeFilter
}: WelcomeBannerProps) => {
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full md:w-auto md:flex-1 md:max-w-[800px] lg:max-w-[1000px]">
        <StatsCards
          userId={userId}
          completedCourses={completedCourses}
          coursesInProgress={coursesInProgress}
          upcomingLiveCount={upcomingLiveCount}
          onFilterChange={onFilterChange}
          activeFilter={activeFilter}
        />
      </div>
    </div>
  )
}
