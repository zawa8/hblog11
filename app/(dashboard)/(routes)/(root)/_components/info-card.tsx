import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconBadge } from '@/components/icon-badge'

interface InfoCardProps {
  numberOfItems: number
  variant?: 'default' | 'success'
  label: string
  icon: LucideIcon
  isActive?: boolean
}

export const InfoCard = ({ variant, icon: Icon, numberOfItems, label, isActive }: InfoCardProps) => {
  return (
    <div className={cn(
      'flex items-center gap-x-2 rounded-md border p-3 transition-all',
      isActive && 'border-violet-600 bg-violet-100/50'
    )}>
      <IconBadge variant={variant} icon={Icon} />
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-gray-500">
          {numberOfItems} {numberOfItems === 1 ? 'Course' : 'Courses'}
        </p>
      </div>
    </div>
  )
}
