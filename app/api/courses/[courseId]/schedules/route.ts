import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isTeacher } from '@/lib/teacher'

interface Schedule {
  id: string;
  scheduledDate: Date;
  topic: string;
  speaker: string;
  position: number;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ScheduleInput {
  scheduledDate: string;
  topic: string;
  speaker: string;
  position: number;
}

// Validate schedule data
const isValidSchedule = (schedule: any): schedule is ScheduleInput => {
  return (
    typeof schedule === 'object' &&
    typeof schedule.scheduledDate === 'string' && schedule.scheduledDate.trim() !== '' &&
    typeof schedule.topic === 'string' && schedule.topic.trim() !== '' &&
    typeof schedule.speaker === 'string' && schedule.speaker.trim() !== '' &&
    typeof schedule.position === 'number' && schedule.position >= 0
  )
}

export async function GET(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const { userId } = auth()

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const course = await db.course.findUnique({
      where: { id: params.courseId },
    })

    if (!course) {
      return new NextResponse('Course not found', { status: 404 })
    }

    const schedules = await db.$queryRaw<Schedule[]>`
      SELECT * FROM "Schedule"
      WHERE "courseId" = ${params.courseId}
      ORDER BY position ASC
    `

    return NextResponse.json(schedules)
  } catch (error) {
    // console.error('[SCHEDULES_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const { userId } = auth()
    const { schedules } = await req.json() as { schedules: ScheduleInput[] }

    if (!userId || !isTeacher(userId)) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
    if (!Array.isArray(schedules)) {
      return new NextResponse('Invalid schedules data', { status: 400 })
    }

    // Validate all schedules
    if (!schedules.every(isValidSchedule)) {
      return new NextResponse('Invalid schedule format', { status: 400 })
    }

    const courseOwner = await db.course.findUnique({
      where: {
        id: params.courseId,
        createdById: userId,
      },
    })

    if (!courseOwner) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Delete existing schedules
    await db.$executeRaw`
      DELETE FROM "Schedule"
      WHERE "courseId" = ${params.courseId}
    `

    // Create new schedules
    const newSchedules = await Promise.all(
      schedules.map(async (schedule: ScheduleInput, index: number) => {
        const scheduleId = await db.schedule.create({
          data: {
            courseId: params.courseId,
            scheduledDate: new Date(schedule.scheduledDate),
            topic: schedule.topic,
            speaker: schedule.speaker,
            position: index,
          },
        })
        return scheduleId
      })
    )

    return NextResponse.json(newSchedules)
  } catch (error) {
    console.error('[SCHEDULES_UPDATE]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
