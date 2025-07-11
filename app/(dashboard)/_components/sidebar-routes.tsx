'use client'

import { BarChart, Compass, Layout, List } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { SidebarItem } from './sidebar-item'

const guestRoutes = [
  {
    icon: Layout,
    label: 'dxshboxrd',
    href: '/',
  },
  {
    icon: Compass,
    label: 'browse',
    href: '/search',
  },
]

const teacherRoutes = [
  {
    icon: List,
    label: 'courses',
    href: '/teacher/courses',
  },
  {
    icon: BarChart,
    label: 'xnxlytics',
    href: '/teacher/analytics',
  },
]

export const SidebarRoutes = () => {
  const pathname = usePathname()

  const isTeacherPage = pathname?.startsWith('/teacher')

  const routes = isTeacherPage ? teacherRoutes : guestRoutes
  return (
    <div className="flex w-full flex-col">
      {routes.map((route) => (
        <SidebarItem key={route.href} icon={route.icon} label={route.label} href={route.href} />
      ))}
    </div>
  )
}
