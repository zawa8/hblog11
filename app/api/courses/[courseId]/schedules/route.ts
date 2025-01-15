import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isTeacher } from '@/lib/teacher'

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

interface ScheduleInput {
  time: string;
  topic: string;
  speaker: string;
  position: number;
}

// Validate schedule data
const isValidSchedule = (schedule: any): schedule is ScheduleInput => {
  return (
    typeof schedule === 'object' &&
    typeof schedule.time === 'string' && schedule.time.trim() !== '' &&
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
        await db.$executeRaw`
          INSERT INTO "Schedule" ("id", "courseId", "time", "topic", "speaker", "position", "createdAt", "updatedAt")
          VALUES (
            gen_random_uuid(),
            ${params.courseId}::uuid,
            ${schedule.time}::text,
            ${schedule.topic}::text,
            ${schedule.speaker}::text,
            ${index}::integer,
            NOW(),
            NOW()
          )
        `

        // Fetch the newly created schedule
        const [newSchedule] = await db.$queryRaw<Schedule[]>`
          SELECT * FROM "Schedule"
          WHERE "courseId" = ${params.courseId}
          AND "position" = ${index}
          ORDER BY "createdAt" DESC
          LIMIT 1
        `

        return newSchedule
      })
    )

    return NextResponse.json(newSchedules)
  } catch (error) {
    console.error('[SCHEDULES_UPDATE]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
