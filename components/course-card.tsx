'use client'

import Image from 'next/image'
import Link from 'next/link'
import { RadioTowerIcon, Timer, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { formatPrice } from '@/lib/format'
import { CourseProgress } from './course-progress'
import { Badge } from '@/components/ui/badge'

type CourseCardProps = {
  id: string
  title: string
  imageUrl: string
  price: number
  progress: number | null
  category: string
  courseType: 'RECORDED' | 'LIVE'
  nextLiveDate?: Date | string | null
  teacher: {
    name: string
    image: string | null
  }
}

const CountdownTimer = ({ targetDate }: { targetDate: string | Date }) => {
  const [timeLeft, setTimeLeft] = useState<string>('')

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime()
      if (difference <= 0) {
        return 'Starting soon'
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))

      if (days > 0) {
        return `${days}d ${hours}h remaining`
      } else if (hours > 0) {
        return `${hours}h ${minutes}m remaining`
      } else {
        return `${minutes}m remaining`
      }
    }

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000 * 60) // Update every minute

    setTimeLeft(calculateTimeLeft()) // Initial calculation

    return () => clearInterval(timer)
  }, [targetDate])

  return <span className="text-sm">{timeLeft}</span>
}

export default function CourseCard({
  id,
  title,
  imageUrl,
  teacher,
  price,
  progress,
  category,
  courseType,
  nextLiveDate,
}: CourseCardProps) {
  return (
    <Link href={`/courses/${id}`}>
      <div className="group h-full overflow-hidden rounded-lg border p-3 transition hover:shadow-sm">
        <div className="relative aspect-video w-full overflow-hidden rounded-md">
          <Image fill className="object-cover" alt={title} src={imageUrl} />
        </div>

        <div className="flex flex-col pt-2 h-full">
          <div className="line-clamp-2 text-lg font-medium transition group-hover:text-primary md:text-base">
            {title}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">{category}</p>
            <Badge variant={courseType === 'LIVE' ? 'destructive' : 'recorded'} className="flex items-center gap-1">
              {courseType === 'LIVE' ? <RadioTowerIcon className="h-3 w-3" /> : null}
              {courseType}
            </Badge>
          </div>
          <div className="my-3 flex items-center gap-x-2 text-sm md:text-xs">
            <div className="relative h-6 w-6 rounded-full overflow-hidden">
              <Image
                fill
                src={teacher.image || '/placeholder-avatar.png'}
                alt={teacher.name}
                className="object-cover"
              />
            </div>
            <p className="text-slate-500">
              {teacher.name}
            </p>
          </div>

          <p className="text-md font-medium text-slate-700 md:text-sm">{formatPrice(price)}</p>

          <div className="flex flex-col mt-2 space-y-2">
            {courseType === 'LIVE' && nextLiveDate ? (
              <div className="space-y-1">
                <div className="flex items-center gap-x-2 text-slate-700">
                  <Calendar className="h-4 w-4" />
                  <p className="text-sm">
                  {format(
                    typeof nextLiveDate === 'string'
                      ? new Date(nextLiveDate)
                      : nextLiveDate,
                    "MMM d, yyyy 'at' h:mm a"
                  )}
                  </p>
                </div>
                <div className="flex items-center gap-x-2 text-slate-500">
                  <Timer className="h-4 w-4" />
                  <CountdownTimer targetDate={nextLiveDate} />
                </div>
              </div>
            ) : courseType === 'LIVE' ? (
              <p className="text-sm text-slate-500">No upcoming sessions</p>
            ) : null}
            {courseType === 'RECORDED' && progress !== null && (
              <CourseProgress variant={progress === 100 ? 'success' : 'default'} size="sm" value={progress} />
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
