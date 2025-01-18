'use client'

import { Course, Schedule } from '@prisma/client'
import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, MoreHorizontal, Pencil, RadioTower, Calendar } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type CourseWithSchedule = Course & {
  nextSchedule: Schedule | null
}

export const columns: ColumnDef<CourseWithSchedule>[] = [
  {
    accessorKey: 'title',
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: 'courseType',
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const courseType = row.getValue('courseType') as 'RECORDED' | 'LIVE'
      return (
        <Badge variant={courseType === 'LIVE' ? 'destructive' : 'recorded'}>
          {courseType}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'price',
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const price = parseFloat(row.getValue('price') || '0')
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'MYR',
      }).format(price)

      return <div>{formatted}</div>
    },
  },
  {
    accessorKey: 'nextSchedule',
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Next Session
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const courseType = row.getValue('courseType') as 'RECORDED' | 'LIVE'
      const schedule = row.original.nextSchedule
      if (courseType !== 'LIVE') {
        return null
      }

      if (!schedule) {
        return <span className="text-sm text-muted-foreground">No upcoming sessions</span>
      }

      return (
        <div className="flex items-center gap-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {format(new Date(schedule.scheduledDate), "MMM d, yyyy 'at' h:mm a")}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'isPublished',
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Published
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const isPublished = row.getValue('isPublished') || false

      return (
        <Badge className={cn('bg-slate-500', isPublished && 'bg-sky-700')}>{isPublished ? 'Published' : 'Draft'}</Badge>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const { id, courseType, nextSchedule } = row.original
      const now = new Date()
      const scheduleDate = nextSchedule ? new Date(nextSchedule.scheduledDate) : null
      const isWithin10Minutes = scheduleDate && 
      now.getTime() >= scheduleDate.getTime() - 1000 * 60 * 10 // 10 minutes before
      const isCourseLive = row.original.isCourseLive

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-4 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link href={`/teacher/courses/${id}`}>
              <DropdownMenuItem>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            </Link>
            {courseType === 'LIVE' && scheduleDate && (
              isCourseLive ? (
                <Link href={`/courses/${id}/live`}>
                  <DropdownMenuItem>
                    <RadioTower className="mr-2 h-4 w-4 text-red-600" />
                    Stop Live Session
                  </DropdownMenuItem>
                </Link>
              ) : (
                <Link href={`/courses/${id}/live`}>
                  <DropdownMenuItem disabled={!isWithin10Minutes}>
                    <RadioTower className="mr-2 h-4 w-4" />
                    Start Live Session
                    {!isWithin10Minutes && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Available 10 mins before start)
                      </span>
                    )}
                  </DropdownMenuItem>
                </Link>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
