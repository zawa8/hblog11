'use client'

import { useAuth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LiveClassroom } from '@/components/live-classroom'

const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY: 1000,
  MAX_JITTER: 1000
} as const

interface Course {
  id: string;
  createdById: string;
  purchases: Array<{ userId: string }>;
}

interface PageProps {
  params: {
    courseId: string;
  }
}

const LiveClassroomPage = ({ params }: PageProps) => {
  const { userId, getToken } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isTeacher, setIsTeacher] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    let mounted = true
    const checkAccess = async (retryCount = 0): Promise<void | never> => {
      try {
        if (!userId) {
          return redirect('/?error=unauthorized')
        }

        const token = await getToken()
        if (!token) {
          return redirect('/?error=no_token')
        }

        let response
        try {
          response = await fetch(`/api/courses/${params.courseId}`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            }
          })
        } catch (error) {
          console.error('Network error:', error)
          // Retry with exponential backoff and jitter
          if (retryCount < RETRY_CONFIG.MAX_ATTEMPTS && mounted) {
            const baseDelay = Math.pow(2, retryCount) * RETRY_CONFIG.BASE_DELAY
            const jitter = Math.random() * RETRY_CONFIG.MAX_JITTER
            const delay = baseDelay + jitter
            console.log(`Retrying in ${Math.round(delay)}ms... (Attempt ${retryCount + 1}/${RETRY_CONFIG.MAX_ATTEMPTS})`)
            await new Promise(resolve => setTimeout(resolve, delay))
            return checkAccess(retryCount + 1)
          }
          return redirect('/?error=network_error')
        }

        if (!response.ok) {
          const errorText = await response.text()
          console.error('API Error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          })

          if (response.status === 401) {
            if (errorText.includes('token')) {
              console.error('Token expired, attempting refresh...')
              try {
                const newToken = await getToken({ skipCache: true })
                if (newToken && mounted) {
                  console.log('Token refreshed, retrying request...')
                  return checkAccess()
                }
              } catch (refreshError) {
                console.error('Token refresh failed:', refreshError)
              }
              return redirect('/?error=token_expired')
            }
            console.error('Unauthorized access')
            return redirect('/?error=unauthorized')
          }
          if (response.status === 404) {
            return redirect('/?error=not_found')
          }
          throw new Error(`Failed to fetch course: ${response.statusText} - ${errorText}`)
        }

        const course: Course = await response.json()

        if (!course) {
          console.error('Course not found')
          return redirect('/?error=not_found')
        }

        // Check if user is teacher or has purchased the course
        const isTeacher = course.createdById === userId
        const hasPurchased = course.purchases.some((purchase: { userId: string }) => purchase.userId === userId)

        if (!isTeacher && !hasPurchased) {
          console.error('User not enrolled:', {
            userId,
            courseId: params.courseId,
            isTeacher,
            hasPurchased
          })
          return redirect('/?error=not_enrolled')
        }

        if (mounted) {
          setIsTeacher(isTeacher)
          setHasAccess(true)
        }
      } catch (error) {
        console.error('Failed to verify access:', error)
        if (error instanceof Error) {
          console.error('Error details:', error.message)
        }
        return redirect('/?error=access_denied')
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    checkAccess()
    return () => {
      mounted = false
    }
  }, [userId, params.courseId, getToken])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!hasAccess) {
    return redirect('/?error=no_access')
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
