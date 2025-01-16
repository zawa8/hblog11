import { auth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'

import { db } from '@/lib/db'
import { Categories } from './_component/category'
import { CourseType } from './_component/course-type'
import { SearchInput } from '@/components/search-input'
import { getCourses } from '@/actions/get-courses'
import CoursesList from '@/components/course-list'

interface SearchPageProps {
  searchParams: {
    title: string
    categoryId: string
    type: string
  }
}

const SearchPage = async ({ searchParams }: SearchPageProps) => {
  const { userId } = auth()

  if (!userId) {
    return redirect('/')
  }

  const categories = await db.category.findMany({
    orderBy: {
      name: 'asc',
    },
  })

  const courses = await getCourses({
    userId,
    ...searchParams,
  })

  return (
    <>
      <div className="block px-6 pt-6 md:mb-0 md:hidden">
        <SearchInput />
      </div>
      <div className="space-y-4 p-6">
        <div className="flex flex-col gap-y-2 md:flex-row md:gap-x-2">
          <Categories items={categories} />
          <CourseType />
        </div>
        <CoursesList items={courses} />
      </div>
    </>
  )
}

export default SearchPage
