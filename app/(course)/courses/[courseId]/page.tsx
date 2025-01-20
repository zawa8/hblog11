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
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Left Column - Title, Image, and Description */}
        <div className="md:col-span-3">
          <h1 className="text-2xl font-bold mb-4">{typedCourse.title}</h1>
          <div className="relative aspect-video rounded-xl overflow-hidden mb-4">
            <Image
              src={typedCourse.imageUrl || '/placeholder.jpg'}
              alt={typedCourse.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-slate-200 px-3 py-2 rounded">
              MYR {typedCourse.price ? typedCourse.price : 'Free'}
            </div>
            {typedCourse.category && (
              <div className="bg-slate-200 px-3 py-2 rounded">
                {typedCourse.category.name}
              </div>
            )}
            <div className={`px-3 py-2 rounded font-medium ${
              typedCourse.courseType === 'LIVE' 
                ? 'bg-blue-100 text-blue-700'
                : 'bg-purple-100 text-purple-700'
            }`}>
              {typedCourse.courseType === 'LIVE' ? 'LIVE' : 'RECORDED'}
            </div>
          </div>
          <p className="text-slate-700">
            {typedCourse.description}
          </p>
        </div>

        {/* Right Column - Enrollment, Chapters, and Attachments */}
        <div className="md:col-span-2">
          {/* Enrollment Section */}
          <div className="bg-white shadow-lg rounded-xl p-6 mb-6 border-2 border-blue-100">
            {!isEnrolled ? (
              <div>
                <div className="mb-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {typedCourse.price ? `MYR ${typedCourse.price}` : 'Free'}
                  </div>
                  <div className="text-sm text-slate-500">One-time payment</div>
                </div>
                <div className="transform transition-all hover:-translate-y-0.5">
                  <CourseEnrollButton courseId={params.courseId} price={typedCourse.price!} />
                </div>
              </div>
            ) : typedCourse.chapters[0] ? (
              <div>
                <div className="mb-4 text-center">
                  <div className="text-lg font-semibold text-green-600 mb-1">You're enrolled!</div>
                </div>
                <a
                  href={`/courses/${typedCourse.id}/chapters/${typedCourse.chapters[0].id}`}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-4 text-base font-semibold text-white hover:bg-blue-700 transition-all w-full shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  Start Learning
                </a>
              </div>
            ) : null}
          </div>

          {/* Chapters Section */}
          {typedCourse.chapters.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Course Chapters</h2>
              <div className="space-y-2">
                {typedCourse.chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className="flex items-center rounded-md border p-4 hover:bg-slate-50 transition-colors"
                  >
                    {isEnrolled ? (
                      <a
                        href={`/courses/${typedCourse.id}/chapters/${chapter.id}`}
                        className="w-full"
                      >
                        {chapter.title}
                      </a>
                    ) : (
                      <span className="text-slate-700">{chapter.title}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments Section */}
          {typedCourse.attachments.length > 0 && (
            <div>
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
      </div>
    </div>
  )
}

export default CourseIdPage
