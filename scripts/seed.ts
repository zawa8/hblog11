const { PrismaClient } = require('@prisma/client')

const database = new PrismaClient()

async function main() {
  try {
    await database.category.createMany({
      data: [
        { name: 'Anaesthesiologists' },
        { name: 'Dental' },
        { name: 'Emergency Physicians' },
        { name: 'Obstetricians & Gynaecologists' },
        { name: 'Ophthalmology' },
        { name: 'Otorhinolaryngologists' },
        { name: 'Paediatrics' },
        { name: 'Pathologists' },
        { name: 'Physicians' },
        { name: 'Health Medicine' },
        { name: 'Radiology' },
        { name: 'Surgeons' },
      ],
    })

    console.log('🟢 Seed script run successfully!🟢')
  } catch (error) {
    console.log('🔴 Error in seed script 🔴', error)
  } finally {
    await database.$disconnect()
  }
}

main()
