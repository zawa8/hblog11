import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { Purchase, Prisma } from '@prisma/client'
import Stripe from 'stripe'
import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'

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

    // Create temporary purchase record
    const purchaseData: Prisma.PurchaseUncheckedCreateInput = {
      userId,
      courseId: params.courseId,
      isBooked: false // Will be set to true after payment confirmation
    }

    const purchase = await db.purchase.create({
      data: purchaseData
    })

    // Create Stripe checkout session
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        quantity: 1,
        price_data: {
          currency: 'MYR',
          product_data: {
            name: course.title,
            description: 'Live Class Seat Booking',
          },
          unit_amount: Math.round(course.price! * 100),
        },
      },
    ]

    let stripeCustomer = await db.stripeCustomer.findUnique({
      where: { userid: userId },
      select: { stripeCustomerId: true },
    })

    if (!stripeCustomer) {
      const customer = await stripe.customers.create({ email: userId })
      stripeCustomer = await db.stripeCustomer.create({
        data: {
          userid: userId,
          stripeCustomerId: customer.id,
        },
      })
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.stripeCustomerId,
      line_items,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${course.id}?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/courses/${course.id}?cancelled=1`,
      metadata: {
        courseId: course.id,
        userId: userId,
        purchaseId: purchase.id,
        isLiveBooking: 'true',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    // console.error('[BOOK_ERROR]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
