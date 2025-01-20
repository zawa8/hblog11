import { auth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { Banner } from '@/components/banner'
import { Preview } from '@/components/preview'
import { VideoPlayer } from './_components/video-player'
import { LiveClassroom } from '@/components/live-classroom'
import { getChapter } from '@/actions/get-chapter'
import CourseEnrollButton from './_components/course-enroll-button'
import { CourseProgressButton } from './_components/course-progress-button'
import CourseSidebar from '../../_components/course-sidebar'
export default async function ChapterDetails({ params }: { params: { courseId: string; chapterId: string } }) {
  const { userId } = auth()
  if (!userId) {
    return redirect('/')
  }

  const { chapter, course, muxData, attachments, nextChapter, userProgress, purchase, progressCount } = await getChapter({
    userId,
    ...params,
  })

  if (!chapter || !course) {
    return redirect('/')
  }

  const isLocked = !chapter.isFree && !purchase
  const completedOnEnd = !!purchase && !userProgress?.isCompleted
  const isTeacher = userId === course.createdById
const isLiveCourse = course.courseType === 'LIVE'

  return (
    <div className="p-6">
          <div className="mb-4">
        {userProgress?.isCompleted ? <Banner label="You already completed this chapter" variant="success" /> : null}
        {isLocked ? <Banner label="You need to purchase this course to watch this chapter" /> : null}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        <div className="md:col-span-3">
          <h2 className="text-2xl font-bold mb-4">{chapter.title}</h2>
          <div className="mb-4 rounded-xl overflow-hidden">
            {isLiveCourse ? (
              <LiveClassroom
                courseId={params.courseId}
                isTeacher={isTeacher}
              />
            ) : (
              <VideoPlayer
                chapterId={chapter.id}
                title={chapter.title}
                courseId={params.courseId}
                nextChapterId={nextChapter?.id}
                playbackId={muxData?.playbackId!}
                isLocked={isLocked}
                completeOnEnd={completedOnEnd}
              />
            )}
          </div>
          <div className="mt-4">
            <Preview value={chapter.description!} />
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white shadow-lg rounded-xl p-6 mb-6 border-2 border-blue-100">
            {purchase ? (
              <div>
                <CourseProgressButton
                  chapterId={params.chapterId}
                  courseId={params.courseId}
                  nextChapterId={nextChapter?.id}
                  isCompleted={!!userProgress?.isCompleted}
                />
              </div>
            ) : (
              <div>
                <div className="mb-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    MYR {course.price}
                  </div>
                  <div className="text-sm text-slate-500">One-time payment</div>
                </div>
                <CourseEnrollButton courseId={params.courseId} price={course.price!} />
              </div>
            )}
          </div>

          <CourseSidebar course={course} progressCount={progressCount} />

          {attachments.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-4">Chapter Materials</h2>
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-3 bg-sky-100 border border-sky-200 rounded-md hover:bg-sky-200 transition"
                  >
                    {attachment.name}
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
