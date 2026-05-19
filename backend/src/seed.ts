import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { startOfWeek, endOfWeek, subWeeks, addDays } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database for WINGS & THINGS...')

  // 1. Create Users
  await prisma.user.upsert({
    where: { email: 'fer@bar.com' },
    update: {},
    create: {
      email: 'fer@bar.com',
      name: 'Fer',
      passwordHash: await bcrypt.hashSync('1234', 10),
      role: 'admin',
    },
  })
  
  await prisma.user.upsert({
    where: { email: 'bartender@bar.com' },
    update: {},
    create: {
      email: 'bartender@bar.com',
      name: 'Luis Bartender',
      passwordHash: await bcrypt.hashSync('1234', 10),
      role: 'bartender',
    },
  })
  console.log('✅ Users created')

  // 2. Create Products
  const products = [
    { name: 'Coca Cola 355ml', shortName: 'Coca', category: 'refrescos', unit: 'pieza' },
    { name: 'Sprite 355ml', shortName: 'Sprite', category: 'refrescos', unit: 'pieza' },
    { name: 'Agua Mineral 600ml', shortName: 'Agua Min', category: 'aguas', unit: 'pieza' },
    { name: 'Jugo de Naranja 1L', shortName: 'Jugo Nar', category: 'jugos', unit: 'pieza' },
    { name: 'Corona Extra 355ml', shortName: 'Corona', category: 'cervezas', unit: 'pieza' },
    { name: 'Victoria 355ml', shortName: 'Victoria', category: 'cervezas', unit: 'pieza' },
    { name: 'Topo Chico 355ml', shortName: 'Topo', category: 'mixers', unit: 'pieza' },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where: { name: p.name },
      update: {},
      create: {
        name: p.name,
        shortName: p.shortName,
        category: p.category as any,
        unit: p.unit,
      },
    })
  }
  console.log('✅ Products created')

  // 3. Create Weeks (Historical from 03/05/2026)
  const targetDate = new Date('2026-05-19')
  const historicalStartDate = new Date('2026-05-03')
  
  // Week 1: 03/05/2026 to 09/05/2026
  const week1Start = new Date('2026-05-03T00:00:00Z')
  const week1End = new Date('2026-05-09T23:59:59Z')
  
  await prisma.week.upsert({
    where: { id: 'week-historical-1' },
    update: {},
    create: {
      id: 'week-historical-1',
      startDate: week1Start,
      endDate: week1End,
      status: 'closed',
    }
  })

  // Week 2: 10/05/2026 to 16/05/2026
  const week2Start = new Date('2026-05-10T00:00:00Z')
  const week2End = new Date('2026-05-16T23:59:59Z')
  
  await prisma.week.upsert({
    where: { id: 'week-historical-2' },
    update: {},
    create: {
      id: 'week-historical-2',
      startDate: week2Start,
      endDate: week2End,
      status: 'closed',
    }
  })

  // Week 3 (Current): 17/05/2026 to 23/05/2026
  const week3Start = new Date('2026-05-17T00:00:00Z')
  const week3End = new Date('2026-05-23T23:59:59Z')
  
  const currentWeek = await prisma.week.upsert({
    where: { id: 'week-current' },
    update: { status: 'open' },
    create: {
      id: 'week-current',
      startDate: week3Start,
      endDate: week3End,
      status: 'open',
    }
  })
  console.log('✅ Weeks created')

  // 4. Initialize Inventories
  const allProds = await prisma.product.findMany()
  const weeks = ['week-historical-1', 'week-historical-2', 'week-current']

  for (const weekId of weeks) {
    for (const prod of allProds) {
      await prisma.inventoryItem.upsert({
        where: { weekId_productId: { weekId, productId: prod.id } },
        update: {},
        create: {
          weekId,
          productId: prod.id,
          initialStock: 50,
          purchasedStock: 0,
          consumed: 0,
        }
      })
    }
  }
  console.log('✅ Inventories initialized')

  console.log('✨ Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
