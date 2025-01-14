import { auth } from '@clerk/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import Mux from '@mux/mux-node'
import { db } from '@/lib/db'
import { isTeacher } from '@/lib/teacher'

interface Chapter {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  position: number;
  isPublished: boolean;
  isFree: boolean;
  startTime: Date | null;
  endTime: Date | null;
  topic: string | null;
  speaker: string | null;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Course {
  id: string;
  createdById: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  isPublished: boolean;
  courseType: 'RECORDED' | 'LIVE';
  maxParticipants: number | null;
  agoraChannelName: string | null;
  agoraToken: string | null;
  isLiveActive: boolean;
  nextLiveDate: Date | null;
  categoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  chapters: Chapter[];
  purchases: { id: string }[];
}

async function checkAndUpdateCourseStatus(courseId: string) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      chapters: true,
      purchases: {
        select: {
          id: true
        }
      }
    }
  }) as Course | null

  if (!course || course.courseType !== 'LIVE' || !course.isPublished) return

  const currentDate = new Date()
  const hasUpcomingSessions = course.chapters
    .filter(chapter => chapter.startTime !== null && chapter.endTime !== null)
    .some(chapter => new Date(chapter.endTime!) > currentDate)

  // Unpublish if no upcoming sessions and course is full
  if (!hasUpcomingSessions && course.maxParticipants &&
      course.purchases.length >= course.maxParticipants) {
    await db.course.update({
      where: { id: courseId },
      data: { isPublished: false }
    })
  }
}

export async function GET(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    // Check and update course status first
    await checkAndUpdateCourseStatus(params.courseId)

    const course = await db.course.findUnique({
      where: {
        id: params.courseId,
      },
      include: {
        attachments: true,
        category: true,
        purchases: true,
      },
    })

    if (!course) {
      return new NextResponse('Course not found', { status: 404 })
    }

    return NextResponse.json(course)
  } catch (error) {
    console.error('[COURSE_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

const { Video } = new Mux(process.env.MUX_TOKEN_ID!, process.env.MUX_TOKEN_SECRET!)

export async function PATCH(req: Request, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = auth()
    const { courseId } = params
    const values = await req.json()

    if (!userId || !isTeacher(userId)) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const course = await db.course.update({
      where: {
        id: courseId,
        createdById: userId,
      },
      data: {
        ...(values.title !== undefined && { title: values.title }),
        ...(values.description !== undefined && { description: values.description }),
        ...(values.imageUrl !== undefined && { imageUrl: values.imageUrl }),
        ...(values.categoryId !== undefined && { categoryId: values.categoryId }),
        ...(values.price !== undefined && { price: values.price }),
        ...(values.attachments !== undefined && { attachments: values.attachments }),
        ...(values.maxParticipants !== undefined && { maxParticipants: parseInt(values.maxParticipants) }),
        ...(values.nextLiveDate !== undefined && { nextLiveDate: new Date(values.nextLiveDate) }),
      },
    })

    return NextResponse.json(course)
  } catch (error) {
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = auth()

    if (!userId || !isTeacher(userId)) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const course = await db.course.findUnique({
      where: { id: params.courseId, createdById: userId },
      include: {
        chapters: { include: { muxData: true } },
      },
    })

    if (!course) {
      return new NextResponse('Not found', { status: 404 })
    }

    /** Removing mux data for all chapters */
    for (const chapter of course.chapters) {
      if (chapter.muxData) {
        await Video.Assets.del(chapter.muxData.assetId)
      }
    }

    const deletedCourse = await db.course.delete({ where: { id: params.courseId } })

    return NextResponse.json(deletedCourse)
  } catch {
    return new NextResponse('Internal server exception', { status: 500 })
  }
}
