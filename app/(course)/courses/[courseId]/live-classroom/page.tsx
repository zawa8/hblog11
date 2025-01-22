'use client'

import { useAuth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { LiveClassroom } from '@/components/live-classroom'

interface PageProps {
  params: {
    courseId: string
  }
}

const LiveClassroomPage = ({ params }: PageProps) => {
  const { userId } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isTeacher, setIsTeacher] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        if (!userId) {
          return redirect('/')
        }

        const response = await axios.get(`/api/courses/${params.courseId}`)
        const course = response.data

        if (!course) {
          return redirect('/')
        }

        // Check if user is teacher or has purchased the course
        const isTeacher = course.createdById === userId
        const hasPurchased = course.purchases.some((purchase: any) => purchase.userId === userId)

        if (!isTeacher && !hasPurchased) {
          return redirect('/')
        }

        setIsTeacher(isTeacher)
        setHasAccess(true)
      } catch (error: any) {
        toast.error('Failed to verify access')
        return redirect('/')
      } finally {
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [userId, params.courseId])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!hasAccess) {
    return redirect('/')
  }

  return (
    <div className="p-6">
      <LiveClassroom
        courseId={params.courseId}
        isTeacher={isTeacher}
      />
    </div>
  )
}

export default LiveClassroomPage
