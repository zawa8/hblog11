import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = headers().get('Stripe-Signature') as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (error: any) {
    return new NextResponse(`Webhook error ${error?.message}`, { status: 400 })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const userId = session?.metadata?.userId
  const courseId = session?.metadata?.courseId
  const purchaseId = session?.metadata?.purchaseId
  const isLiveBooking = session?.metadata?.isLiveBooking === 'true'

  if (event.type === 'checkout.session.completed') {
    if (!userId || !courseId) {
      return new NextResponse('Webhook error: Missing metadata', { status: 400 })
    }

    if (isLiveBooking && purchaseId) {
      // Update existing purchase for live class booking
      const purchase = await db.purchase.update({
        where: { id: purchaseId },
        data: { isBooked: true }
      })

      // Check if course should be unpublished
      const course = await db.course.findUnique({
        where: { id: courseId },
        include: { 
          purchases: true,
          chapters: true
        }
      })

      if (course && course.maxParticipants) {
        const currentDate = new Date()
        const hasUpcomingSessions = course.chapters
          .filter(chapter => chapter.endTime !== null)
          .some(chapter => new Date(chapter.endTime!) > currentDate)

        // If no upcoming sessions and course is full, unpublish it
        if (!hasUpcomingSessions && course.purchases.length >= course.maxParticipants) {
          await db.course.update({
            where: { id: courseId },
            data: { isPublished: false }
          })
        }
      }
    } else {
      // Create new purchase for recorded class
      await db.purchase.create({
        data: { courseId, userId }
      })
    }
  } else {
    return new NextResponse(`Webhook Error: Unhandled event type ${event.type}`, { status: 200 })
  }

  return new NextResponse(null, { status: 200 })
}
