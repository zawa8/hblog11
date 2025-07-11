'use client'

import { UserButton, useAuth } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { isTeacher } from '@/lib/teacher'

export const NavbarRoutes = () => {
  const { userId } = useAuth()

  const pathname = usePathname()

  const isTeacherPage = pathname?.startsWith('/teacher')
  const isCoursePage = pathname?.includes('/courses')

  return (
    <>
      <div className="ml-auto flex gap-x-2">
        {isTeacherPage || isCoursePage ? (
          <Link href="/">
            <Button size="sm" variant="ghost">
              <LogOut className="mr-2 h-4 w-4" />
              eksit
            </Button>
          </Link>
        ) : isTeacher(userId) ? (
          <Link href="/teacher/courses">
            <Button size="sm" variant="default">
              texcher mode
            </Button>
          </Link>
        ) : null}
        <UserButton afterSignOutUrl="/" />
      </div>
    </>
  )
}
