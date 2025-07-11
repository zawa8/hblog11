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
      <div className="space-y-4 p-6">
        <div className="flex flex-col gap-y-2 md:flex-row md:gap-x-2">
          <div className="md:hidden">
            <SearchInput />
          </div>
          <Categories items={categories} />
          <CourseType />
          <div className="hidden md:block">
            <SearchInput />
          </div>
        </div>
        <CoursesList items={courses} />
      </div>
    </>
  )
}

export default SearchPage
