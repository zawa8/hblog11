import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const { userId } = auth()

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const categories = await db.category.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.log('[CATEGORIES]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
