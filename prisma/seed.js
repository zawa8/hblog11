const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const categories = [
    'Anaesthesiologists',
    'Dental',
    'Emergency Physicians',
    'Obstetricians & Gynaecologists',
    'Ophthalmology',
    'Otorhinolaryngologists',
    'Paediatrics',
    'Pathologists',
    'Physicians',
    'Health Medicine',
    'Radiology',
    'Surgeons',
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
