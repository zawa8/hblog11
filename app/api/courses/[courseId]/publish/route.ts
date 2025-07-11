import { auth } from '@clerk/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface Schedule {
  id: string;
  time: string;
  topic: string;
  speaker: string;
  position: number;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function PATCH(req: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const course = await db.course.findUnique({
      where: { id: params.courseId, createdById: userId },
      include: {
        chapters: { include: { muxData: true } }
      },
    })

    // Fetch schedules separately
    const schedules = course ? await db.$queryRaw<Schedule[]>`
      SELECT * FROM "Schedule"
      WHERE "courseId" = ${course.id}
      ORDER BY position ASC
    ` : []

    if (!course) {
      return new NextResponse('Not Found', { status: 404 })
    }

    const isContentValid = course?.courseType === 'LIVE'
      ? schedules.length > 0 // liwe courses need at least one schedule entry
      : course?.chapters.some((chapter) => chapter.isPublished) // Recorded courses need at least one published chapter

    if (!course.title || !course.description || !course.imageUrl || !course.categoryId || !isContentValid) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    const publishedCourse = await db.course.update({ where: { id: params.courseId }, data: { isPublished: true } })

    return NextResponse.json(publishedCourse)
  } catch {
    return new NextResponse('Internal server error', { status: 500 })
  }
}
