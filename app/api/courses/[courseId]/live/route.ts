import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { RtcRole, RtcTokenBuilder } from 'agora-access-token'
import { db } from '@/lib/db'

const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID || ''
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || ''

if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
  throw new Error('Agora credentials not configured in environment variables')
}

type CourseWithPurchases = {
  id: string;
  createdById: string;
  agoraChannelName: string | null;
  maxParticipants: number | null;
  isCourseLive: boolean;
  courseType: 'RECORDED' | 'LIVE';
  purchases: Array<{ id: string }>;
};
interface LiveSessionRequest {
  maxParticipants?: number;
  nextLiveDate?: string;
}

export async function POST(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const { userId } = auth()
    const { courseId } = params
    let maxParticipants: number | undefined
    let nextLiveDate: string | undefined

    try {
      // Try to parse request body if it exists
      const body = await req.text()
      if (body) {
        const data: LiveSessionRequest = JSON.parse(body)
        maxParticipants = data.maxParticipants
        nextLiveDate = data.nextLiveDate
      }
    } catch (error) {
      console.error('Failed to parse request body:', error)
      // Continue without body data
    }

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    console.log('Request from user:', userId)

    // Validate maxParticipants
    if (maxParticipants && (!Number.isInteger(maxParticipants) || maxParticipants < 1)) {
      return new NextResponse('Invalid maximum participants', { status: 400 })
    }

    // Check if a live session is already in progress
    const existingLiveSession = await db.course.findFirst({
      where: {
        id: courseId,
        isLiveActive: true
      }
    })

    if (existingLiveSession) {
      return new NextResponse('Live session already in progress', { status: 400 })
    }

    console.log('Finding course:', courseId)
    const course = await db.course.findFirst({
      where: {
        id: courseId,
      },
      include: {
        purchases: {
          select: {
            id: true
          }
        },
        schedules: {
          where: {
            scheduledDate: {
              gte: new Date(Date.now() - 1000 * 60 * 10), // Within last 10 minutes
              lte: new Date(Date.now() + 1000 * 60 * 60 * 2) // Up to 2 hours from now
            }
          },
          orderBy: {
            scheduledDate: 'asc'
          },
          take: 1
        }
      }
    }) as unknown as (CourseWithPurchases & { schedules: Array<{ scheduledDate: Date }> }) | null

    console.log('Course found:', {
      ...course,
      purchases: course?.purchases?.length || 0
    })

    if (!course) {
      console.error('Course not found')
      return new NextResponse('Course not found', { status: 404 })
    }

    if (!course.schedules?.[0]) {
      console.error('No upcoming schedule found within time window')
      return new NextResponse('Cannot start live session - no upcoming schedule found', { status: 400 })
    }

    const scheduleDate = new Date(course.schedules[0].scheduledDate)
    const now = new Date()
    const isWithin10Minutes = now.getTime() >= scheduleDate.getTime() - 1000 * 60 * 10

    if (!isWithin10Minutes) {
      console.error('Too early to start session', {
        now: now.toISOString(),
        scheduleDate: scheduleDate.toISOString()
      })
      return new NextResponse('Cannot start live session yet - available 10 minutes before scheduled time', { status: 400 })
    }

    if (course.createdById !== userId) {
      console.error('Unauthorized: User is not course creator', {
        userId,
        createdById: course.createdById
      })
      return new NextResponse('Only the course creator can start a live session', { status: 403 })
    }

    if (course.courseType !== 'LIVE') {
      console.error('Not a live course:', {
        courseId,
        courseType: course.courseType,
        createdById: course.createdById
      })
      return new NextResponse('This course does not support live sessions', { status: 400 })
    }
    // Check participant limit for non-teacher users
    if (course?.createdById !== userId && course?.maxParticipants) {
      const participantCount = course.purchases.length
      if (participantCount >= course.maxParticipants) {
        return new NextResponse('Maximum participants limit reached', { status: 403 })
      }
    }

    // Generate channel name if not exists
    let channelName = course?.agoraChannelName
    if (!channelName) {
      channelName = `course_${courseId}_${Date.now()}`
      const updateData = {
        agoraChannelName: channelName
      } as const

      if (maxParticipants !== undefined) {
        (updateData as any).maxParticipants = maxParticipants
      }
      if (nextLiveDate) {
        (updateData as any).nextLiveDate = new Date(nextLiveDate)
      }

      await db.course.update({
        where: { id: courseId },
        data: updateData
      })
    }

    // Generate Agora token
    const role = course.createdById === userId ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER
    const expirationTimeInSeconds = 3600 // 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000)
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      0, // uid
      role,
      privilegeExpiredTs
    )

    // Update course with token and live status
    await db.course.update({
      where: { id: courseId },
      data: {
        agoraToken: token,
        isLiveActive: true,
        // @ts-ignore - field exists in schema but types need regeneration
        isCourseLive: true,
      },
    })

    return NextResponse.json({
      token,
      channelName,
      appId: AGORA_APP_ID,
      uid: 0,
    })
  } catch (error: any) {
    console.error('Live session error:', error)
    return new NextResponse(error?.message || 'Internal Error', { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const { userId } = auth()
    const { courseId } = params

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const course = await db.course.findUnique({
      where: {
        id: courseId,
        createdById: userId,
      },
    })

    if (!course) {
      return new NextResponse('Course not found', { status: 404 })
    }

    // End live session
    await db.course.update({
      where: { id: courseId },
      data: {
        isLiveActive: false,
        // @ts-ignore - field exists in schema but types need regeneration
        isCourseLive: false,
        agoraToken: null,
      },
    })

    return NextResponse.json({
      message: 'Live session ended',
    })
  } catch (error: any) {
    console.error('End session error:', error)
    return new NextResponse(error?.message || 'Internal Error', { status: 500 })
  }
}
