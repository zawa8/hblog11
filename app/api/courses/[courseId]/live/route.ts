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
    const { maxParticipants, nextLiveDate }: LiveSessionRequest = await req.json()

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

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

    const course = await db.course.findFirst({
      where: {
        id: courseId,
        courseType: 'LIVE',
      },
      include: {
        purchases: true
      }
    }) as unknown as CourseWithPurchases | null

    if (!course) {
      return new NextResponse('Course not found', { status: 404 })
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
      },
    })

    return NextResponse.json({
      token,
      channelName,
      appId: AGORA_APP_ID,
      uid: 0,
    })
  } catch (error) {
    return new NextResponse('Internal Error', { status: 500 })
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
        agoraToken: null,
      },
    })

    return NextResponse.json({
      message: 'Live session ended',
    })
  } catch (error) {
    return new NextResponse('Internal Error', { status: 500 })
  }
}
