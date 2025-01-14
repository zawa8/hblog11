import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { Purchase } from '@prisma/client'
import { db } from '@/lib/db'

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
}

type CourseWithPurchases = Course & {
  purchases: Purchase[];
}

export async function POST(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const { userId } = auth()

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Check if user already purchased
    const existingPurchase = await db.purchase.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: params.courseId,
        },
      },
    })

    if (existingPurchase) {
      return new NextResponse('Already booked', { status: 400 })
    }

    // Get course details
    const course = await db.course.findUnique({
      where: {
        id: params.courseId,
        courseType: 'LIVE',
      },
      include: {
        purchases: true,
      },
    })

    if (!course) {
      return new NextResponse('Course not found', { status: 404 })
    }

    // Check if course is full
    const typedCourse = course as CourseWithPurchases
    if (typedCourse.maxParticipants && typedCourse.purchases.length >= typedCourse.maxParticipants) {
      return new NextResponse('Course is full', { status: 400 })
    }

    // Create purchase
    const purchase = await db.purchase.create({
      data: {
        userId,
        courseId: params.courseId,
      },
    })

    // Check if course should be unpublished
    const chapters = await db.chapter.findMany({
      where: {
        courseId: params.courseId,
      }
    }) as Chapter[]

    const currentDate = new Date()
    const hasUpcomingSessions = chapters
      .filter(chapter => chapter.endTime !== null)
      .some(chapter => new Date(chapter.endTime!) > currentDate)

    // If no upcoming sessions and course is full, unpublish it
    if (!hasUpcomingSessions && typedCourse.maxParticipants &&
        typedCourse.purchases.length >= typedCourse.maxParticipants) {
      await db.course.update({
        where: { id: params.courseId },
        data: { isPublished: false }
      })
    }

    return NextResponse.json(purchase)
  } catch (error) {
    console.error('[BOOK_ERROR]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
