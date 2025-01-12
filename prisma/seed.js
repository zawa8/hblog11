const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const categories = [
    'Music',
    'Photography',
    'Fitness',
    'Accounting',
    'Computer Science',
    'Filming',
    'Engineering',
  ]

  for (const name of categories) {
    // Create category if it doesn't exist
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  console.log('Categories seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
