import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import Mux from '@mux/mux-node'
import { db } from '@/lib/db'

const { Video } = new Mux(
  process.env.MUX_TOKEN_ID!,
  process.env.MUX_TOKEN_SECRET!
)

export async function POST(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const { userId } = auth()
    const { courseId } = params
    const { recordingUrl, title } = await req.json()

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const course = await db.course.findUnique({
      where: {
        id: courseId,
        createdById: userId
      }
    })

    if (!course) {
      return new NextResponse('Course not found', { status: 404 })
    }

    // Create a new Mux asset from the recording URL
    const asset = await Video.Assets.create({
      input: recordingUrl,
      playback_policy: 'public'
    })

    if (!asset.playback_ids || asset.playback_ids.length === 0) {
      console.error('[COURSE_ID_LIVE_RECORDING]: No playback IDs found for asset', asset)
      return new NextResponse('Failed to create recording', { status: 500 })
    }


    const playbackId = asset.playback_ids[0].id

    // Store the recording information
    const recording = await db.liveSessionRecording.create({
      data: {
        courseId,
        title,
        muxAssetId: asset.id,
        playbackId: playbackId,
        sessionDate: new Date()
      }
    })

    return NextResponse.json(recording)
  } catch (error) {
    // console.error('[COURSE_ID_LIVE_RECORDING]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function GET(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params

    const recordings = await db.liveSessionRecording.findMany({
      where: {
        courseId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(recordings)
  } catch (error) {
    // console.error('[COURSE_ID_LIVE_RECORDING_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
