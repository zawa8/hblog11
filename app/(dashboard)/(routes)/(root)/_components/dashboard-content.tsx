'use client'

import { useState } from 'react'
import CoursesList from '@/components/course-list'
import { WelcomeBanner } from '@/components/welcome-banner'
import { CourseWithProgressAndCategory } from '@/actions/get-courses'

interface DashboardContentProps {
  initialData: {
    userId: string
    fullName: string
    completedCourses: CourseWithProgressAndCategory[]
    coursesInProgress: CourseWithProgressAndCategory[]
    upcomingLiveCount: number
    upcomingLiveCourses: CourseWithProgressAndCategory[]
  }
}

export function DashboardContent({ initialData }: DashboardContentProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  const getFilteredCourses = () => {
    switch (activeFilter) {
      case 'in-progress':
        return initialData.coursesInProgress
      case 'completed':
        return initialData.completedCourses
      case 'upcoming':
        return initialData.upcomingLiveCourses
      default:
        return [...initialData.coursesInProgress, ...initialData.completedCourses]
    }
  }

  return (
    <div className="space-y-6 p-6">
      <WelcomeBanner
        userId={initialData.userId}
        fullName={initialData.fullName}
        completedCourses={initialData.completedCourses}
        coursesInProgress={initialData.coursesInProgress}
        upcomingLiveCount={initialData.upcomingLiveCount}
        onFilterChange={setActiveFilter}
        activeFilter={activeFilter}
      />
      <CoursesList items={getFilteredCourses()} />
    </div>
  )
}
