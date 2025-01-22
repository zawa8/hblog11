'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import Link from 'next/link'
import { PlusCircle, RadioTower } from 'lucide-react'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { CourseWithSchedule } from './columns'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Filter courses..."
          value={(table.getColumn('title')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('title')?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-x-2">
          {(data as CourseWithSchedule[]).find(course => 
            course.courseType === 'LIVE' && 
            course.nextSchedule
          ) && (
            (() => {
              const course = (data as CourseWithSchedule[]).find(course => 
                course.courseType === 'LIVE' && 
                course.nextSchedule &&
                (course.isCourseLive && course.isLiveActive)
              ) || (data as CourseWithSchedule[]).find(course => 
                course.courseType === 'LIVE' && 
                course.nextSchedule
              )
              
              if (!course) return null
              
              const now = new Date()
              const scheduleDate = new Date(course.nextSchedule!.scheduledDate)
              const isWithin10Minutes = now.getTime() >= scheduleDate.getTime() - 1000 * 60 * 10
              
              return (course.isCourseLive && course.isLiveActive) ? (
                <Link href={`/courses/${course.id}/live-classroom`}>
                  <Button variant="destructive" className="flex items-center gap-x-2">
                    <RadioTower className="h-4 w-4" />
                    Stop Live Session
                  </Button>
                </Link>
              ) : (
                <Link href={`/courses/${course.id}/live-classroom`}>
                  <Button
                    disabled={!isWithin10Minutes}
                    className="flex items-center gap-x-2"
                    title={!isWithin10Minutes ? 'Available 10 mins before start' : undefined}
                  >
                    <RadioTower className="h-4 w-4" />
                    Start Live Session
                  </Button>
                </Link>
              )
            })()
          )}
          <Link href="/teacher/create">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New course
            </Button>
          </Link>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next
        </Button>
      </div>
    </div>
  )
}
