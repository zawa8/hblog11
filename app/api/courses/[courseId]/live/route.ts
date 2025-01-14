import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { RtcRole, RtcTokenBuilder } from 'agora-access-token'

const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE!

export async function POST(
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
        courseType: 'LIVE',
      },
    })

    if (!course) {
      return new NextResponse('Course not found', { status: 404 })
    }

    // Generate channel name if not exists
    let channelName = course.agoraChannelName
    if (!channelName) {
      channelName = `course_${courseId}_${Date.now()}`
      await db.course.update({
        where: { id: courseId },
        data: { agoraChannelName: channelName },
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
