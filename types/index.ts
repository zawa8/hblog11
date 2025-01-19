import { Course } from '@prisma/client'

export interface Schedule {
  id: string
  topic: string
  speaker: string
  position: number
  courseId: string
  createdAt: Date
  updatedAt: Date
  scheduledDate: string
}

export type CourseWithRelations = Course & {
  attachments: Array<{
    id: string
    name: string
    url: string
    courseId: string
    createdAt: Date
    updatedAt: Date
  }>
  chapters: Array<{
    id: string
    title: string
    description: string | null
    videoUrl: string | null
    position: number
    isPublished: boolean
    isFree: boolean
    createdAt: Date
    updatedAt: Date
    courseId: string
    endTime: Date | null
    speaker: string | null
    startTime: Date | null
    topic: string | null
    muxData: {
      id: string
      assetId: string
      playbackId: string | null
    } | null
  }>
  schedules: Schedule[]
}
