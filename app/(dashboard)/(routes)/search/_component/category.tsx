'use client'

import * as React from 'react'
import qs from 'query-string'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Category } from '@prisma/client'
import { MdLocalHospital, MdLocalPharmacy } from 'react-icons/md'
import { GiTooth, GiHospitalCross, GiBabyFace, GiScalpel } from 'react-icons/gi'
import { FaBabyCarriage, FaMicroscope, FaUserMd, FaXRay } from 'react-icons/fa'
import { FaEarListen } from 'react-icons/fa6'
import { BsEye } from 'react-icons/bs'
import { IconType } from 'react-icons'
import { useRouter, useSearchParams } from 'next/navigation'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface CategoriesProps {
  items: Category[]
}

const iconMap: Record<Category['name'], IconType> = {
  Anaesthesiologists: MdLocalHospital,
  Dental: GiTooth,
  'Emergency Physicians': GiHospitalCross,
  'Obstetricians & Gynaecologists': FaBabyCarriage,
  Ophthalmology: BsEye,
  Otorhinolaryngologists: FaEarListen,
  Paediatrics: GiBabyFace,
  Pathologists: FaMicroscope,
  Physicians: FaUserMd,
  'Health Medicine': MdLocalPharmacy,
  Radiology: FaXRay,
  Surgeons: GiScalpel,
}

export const Categories = ({ items }: CategoriesProps) => {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSelect = (categoryId: string) => {
    const currentTitle = searchParams.get('title') || ''
    const currentType = searchParams.get('type')

    const url = qs.stringifyUrl(
      {
        url: window.location.pathname,
        query: {
          categoryId: categoryId || null,
          title: currentTitle,
          type: currentType || null,
        },
      },
      { skipEmptyString: true, skipNull: true },
    )

    setValue(categoryId)
    setOpen(false)
    router.push(url)
  }

  const selectedItem = React.useMemo(() => {
    if (!value) return null
    return items.find(item => item.id === value)
  }, [value, items])

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
              {selectedItem && React.createElement(iconMap[selectedItem.name], { className: 'h-4 w-4' })}
              <span>{selectedItem.name}</span>
            </div>
          ) : (
            'Select Fraternity...'
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full md:w-[300px] p-0 rounded-full">
        <Command>
          <CommandInput placeholder="Search fraternity..." />
          <CommandEmpty>No fraternity found.</CommandEmpty>
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
              All Fraternity
            </CommandItem>
            {items.map((item) => (
              <CommandItem
                key={item.id}
                value={item.name}
                onSelect={() => handleSelect(item.id)}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === item.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex items-center gap-2">
                  {React.createElement(iconMap[item.name], { className: 'h-4 w-4' })}
                  {item.name}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
