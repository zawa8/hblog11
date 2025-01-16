'use client'

import * as React from 'react'
import qs from 'query-string'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FaVideo } from 'react-icons/fa'
import { MdLiveTv } from 'react-icons/md'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

const courseTypes = [
  { id: 'live', name: 'Live Courses', icon: MdLiveTv },
  { id: 'recorded', name: 'Recorded Courses', icon: FaVideo },
]

export const CourseType = () => {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()

  // Sync with URL state on mount and when URL changes
  React.useEffect(() => {
    const currentType = searchParams.get('type')
    setValue(currentType || '')
  }, [searchParams])

  const handleSelect = (typeId: string) => {
    const currentTitle = searchParams.get('title')
    const currentCategoryId = searchParams.get('categoryId')

    const url = qs.stringifyUrl(
      {
        url: window.location.pathname,
        query: {
          title: currentTitle || null,
          categoryId: currentCategoryId || null,
          type: typeId || null,
        },
      },
      { skipEmptyString: true, skipNull: true },
    )

    setValue(typeId)
    setOpen(false)
    router.push(url)
  }

  const selectedItem = React.useMemo(() => {
    if (!value) return null
    return courseTypes.find(item => item.id === value)
  }, [value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between md:w-[300px] rounded-full"
        >
          {selectedItem ? (
            <div className="flex items-center gap-2">
              {React.createElement(selectedItem.icon, { className: 'h-4 w-4' })}
              <span>{selectedItem.name}</span>
            </div>
          ) : (
            'All Courses'
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full md:w-[300px] p-0 rounded-full">
        <Command className="p-2">
          <CommandGroup>
            <CommandItem
              value=""
              onSelect={() => handleSelect('')}
              className="cursor-pointer"
            >
              <Check
                className={cn(
                  'mr-2 h-4 w-4',
                  !value ? 'opacity-100' : 'opacity-0'
                )}
              />
              All Courses
            </CommandItem>
            {courseTypes.map((type) => (
              <CommandItem
                key={type.id}
                value={type.name}
                onSelect={() => handleSelect(type.id)}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === type.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex items-center gap-2">
                  {React.createElement(type.icon, { className: 'h-4 w-4' })}
                  {type.name}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
