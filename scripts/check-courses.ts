import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCourses() {
  try {
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        title: true,
        isPublished: true,
        courseType: true,
        createdAt: true
      }
    })

    console.log('Total courses:', courses.length)
    console.log('Published courses:', courses.filter(c => c.isPublished).length)
    console.log('\nCourse details:')
    courses.forEach(course => {
      console.log(`- ${course.title} (${course.id})`)
      console.log(`  Published: ${course.isPublished}`)
      console.log(`  Type: ${course.courseType}`)
      console.log(`  Created: ${course.createdAt}`)
      console.log('')
    })
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCourses()
