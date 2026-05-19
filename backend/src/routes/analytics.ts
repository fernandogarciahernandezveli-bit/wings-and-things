import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns'
import { es } from 'date-fns/locale'

export const analyticsRouter = Router()

analyticsRouter.get('/week/:weekId', async (req, res, next) => {
  try {
    const { weekId } = req.params
    const week = await prisma.week.findUnique({
      where: { id: weekId }
    })

    if (!week) {
      res.status(404).json({ success: false, message: 'Semana no encontrada' })
      return
    }

    // 1. Top products
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { weekId },
      include: { product: true },
      orderBy: { consumed: 'desc' },
      take: 5
    })

    const topProducts = inventoryItems.map(item => ({
      productId: item.productId,
      productName: item.product.name,
      totalConsumed: item.consumed
    }))

    // 2. Daily sales for the week
    const comandas = await prisma.comanda.findMany({
      where: { weekId },
      include: { items: true }
    })

    const days = eachDayOfInterval({
      start: week.startDate,
      end: week.endDate
    })

    const dailySales = days.map(day => {
      const dayComandas = comandas.filter(c => 
        c.date >= startOfDay(day) && c.date <= endOfDay(day)
      )
      
      const total = dayComandas.length
      const itemsCount = dayComandas.reduce((acc, c) => 
        acc + c.items.reduce((sum, i) => sum + i.quantity, 0), 0
      )

      return {
        date: day.toISOString(),
        dayName: format(day, 'EEEE', { locale: es }),
        total,
        itemsCount
      }
    })

    // 3. Totals
    const totalItems = inventoryItems.reduce((acc, i) => acc + i.consumed, 0)
    const totalComandas = comandas.length

    res.json({
      success: true,
      data: {
        topProducts,
        dailySales,
        totalItems,
        totalComandas
      }
    })
  } catch (err) {
    next(err)
  }
})

analyticsRouter.get('/history', async (_req, res, next) => {
  try {
    const history = await prisma.week.findMany({
      include: {
        inventoryItems: {
          include: { product: true }
        },
        comandas: true
      },
      orderBy: { startDate: 'desc' }
    })
    res.json({ success: true, data: history })
  } catch (err) {
    next(err)
  }
})
