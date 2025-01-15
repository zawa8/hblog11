'use client'

import { Category } from '@prisma/client'
import { MdLocalHospital, MdLocalPharmacy } from 'react-icons/md'
import { GiTooth, GiHospitalCross, GiBabyFace, GiScalpel } from 'react-icons/gi'
import { FaBabyCarriage, FaMicroscope, FaUserMd, FaXRay } from 'react-icons/fa'
import { FaEarListen } from 'react-icons/fa6'
import { BsEye } from 'react-icons/bs'
import { IconType } from 'react-icons'
import { CategoryItem } from './category-item'

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
  return (
    <div className="flex items-center gap-x-2 overflow-x-auto pb-2">
      {items.map((item) => (
        <CategoryItem key={item.id} label={item.name} icon={iconMap[item.name]} value={item.id} />
      ))}
    </div>
  )
}
