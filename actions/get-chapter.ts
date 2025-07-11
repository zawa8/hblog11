import { Attachment } from '@prisma/client'
import { db } from '@/lib/db'

type GetChapterArgs = {
  userId: string
  courseId: string
  chapterId: string
}

export async function getChapter({ userId, courseId, chapterId }: GetChapterArgs) {
  try {
    const purchase = await db.purchase.findUnique({ where: { userId_courseId: { userId, courseId } } })
    const course = await db.course.findUnique({
      where: {
        id: courseId,
        isPublished: true,
      },
      include: {
        chapters: {
          include: {
            userProgress: true,
          },
        },
      },
    })
    const chapter = await db.chapter.findUnique({ where: { id: chapterId, isPublished: true } })

    if (!chapter || !course) {
      throw new Error('Chapter or course not found!')
    }

    let muxData = null
    let attachments: Attachment[] = []
    let nextChapter = null

    if (purchase) {
      attachments = await db.attachment.findMany({ where: { courseId } })
    }

    if (chapter.isFree || purchase) {
      muxData = await db.muxData.findUnique({ where: { chapterId } })

      nextChapter = await db.chapter.findFirst({
        where: { courseId, isPublished: true, position: { gt: chapter.position } },
        orderBy: { position: 'asc' },
      })
    }
    const userProgress = await db.userProgress.findUnique({ where: { userId_chapterId: { userId, chapterId } } })

    const progressCount = await db.userProgress.count({
      where: {
        userId,
        chapter: {
          courseId,
        },
        isCompleted: true,
      },
    })

    return {
      chapter,
      course,
      muxData,
      attachments,
      nextChapter,
      userProgress,
      purchase,
      progressCount,
    }
  } catch (error) {
    // console.error(error)
    return {
      chapter: null,
      course: null,
      muxData: null,
      attachments: [],
      nextChapter: null,
      userProgress: null,
      purchase: null,
      progressCount: 0,
    }
  }
}
