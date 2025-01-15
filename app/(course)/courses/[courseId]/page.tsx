import { auth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { Attachment, Category, Chapter, Course, Purchase } from '@prisma/client'
import { File } from 'lucide-react'
import Image from 'next/image'
import { db } from '@/lib/db'
import CourseEnrollButton from './chapters/[chapterId]/_components/course-enroll-button'

type CourseWithRelations = Course & {
  chapters: Chapter[];
  purchases: Purchase[];
  attachments: Attachment[];
  category: Category | null;
}

const CourseIdPage = async ({ params }: { params: { courseId: string } }) => {
  const { userId } = auth()

  if (!userId) {
    return redirect('/')
  }

  const course = await db.course.findUnique({
    where: {
      id: params.courseId,
    },
    include: {
      chapters: {
        where: {
          isPublished: true,
        },
        orderBy: {
          position: 'asc',
        },
      },
      purchases: {
        where: {
          userId
        }
      },
      attachments: {
        orderBy: {
          createdAt: 'desc'
        }
      },
      category: true
    },
  })

  if (!course) {
    return redirect('/')
  }

  // For live courses, redirect to live session view
  if (course.courseType === 'LIVE') {
    return redirect(`/courses/${course.id}/live`)
  }

  const typedCourse = course as CourseWithRelations
  const isEnrolled = typedCourse.purchases.length > 0

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Column - Course Details */}
        <div className="flex-1">
          <div className="relative aspect-video rounded-xl overflow-hidden mb-4">
            <Image
              src={typedCourse.imageUrl || '/placeholder.jpg'}
              alt={typedCourse.title}
              fill
              className="object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold mb-2">{typedCourse.title}</h1>
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
            {typedCourse.category && (
              <div className="bg-slate-200 px-2 py-1 rounded">
                {typedCourse.category.name}
              </div>
            )}
            <div className="bg-slate-200 px-2 py-1 rounded">
              MYR {typedCourse.price ? typedCourse.price : 'Free'}
            </div>
          </div>
          <p className="text-slate-700 mb-4">
            {typedCourse.description}
          </p>

          {/* Attachments Section */}
          {typedCourse.attachments.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Course Materials</h2>
              <div className="space-y-2">
                {typedCourse.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-3 bg-sky-100 border border-sky-200 rounded-md hover:bg-sky-200 transition"
                  >
                    <File className="h-4 w-4 mr-2 flex-shrink-0" />
                    <p className="text-sm line-clamp-1">{attachment.name}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Enrollment and Chapters */}
        <div className="flex-1">
          {/* Enrollment Section */}
          <div className="bg-slate-100 rounded-lg p-4 mb-8">
            {!isEnrolled ? (
              <CourseEnrollButton courseId={params.courseId} price={typedCourse.price!} />
            ) : typedCourse.chapters[0] ? (
              <a
                href={`/courses/${typedCourse.id}/chapters/${typedCourse.chapters[0].id}`}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700 transition-colors w-full"
              >
                Start Course
              </a>
            ) : null}
          </div>

          {/* Chapters Section */}
          {isEnrolled && typedCourse.chapters.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Course Chapters</h2>
              <div className="space-y-2">
                {typedCourse.chapters.map((chapter) => (
                  <a
                    key={chapter.id}
                    href={`/courses/${typedCourse.id}/chapters/${chapter.id}`}
                    className="flex items-center rounded-md border p-4 hover:bg-slate-50 transition-colors"
                  >
                    {chapter.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CourseIdPage
