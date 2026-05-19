import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, requireAdmin } from '../middleware/auth'

export const weeksRouter = Router()

weeksRouter.get('/', async (_req, res, next) => {
  try {
    const weeks = await prisma.week.findMany({
      orderBy: { startDate: 'desc' },
    })
    res.json({ success: true, data: weeks })
  } catch (err) {
    next(err)
  }
})

weeksRouter.get('/active', async (_req, res, next) => {
  try {
    const now = new Date()
    const week = await prisma.week.findFirst({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
        status: 'open',
      },
    })
    res.json({ success: true, data: week })
  } catch (err) {
    next(err)
  }
})

weeksRouter.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { startDate, endDate, status } = z.object({
      startDate: z.string(),
      endDate: z.string(),
      status: z.enum(['open', 'closed']).default('open')
    }).parse(req.body)

    const week = await prisma.$transaction(async (tx) => {
      // If creating an 'open' week, close any existing open weeks
      if (status === 'open') {
        await tx.week.updateMany({
          where: { status: 'open' },
          data: { status: 'closed' }
        })
      }

      const newWeek = await tx.week.create({
        data: {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status,
        },
      })

      // Initialize inventory for the new week
      const products = await tx.product.findMany({ where: { isActive: true } })
      
      // Carry over logic: find the week that ends right before this one starts
      const prevWeek = await tx.week.findFirst({
        where: { endDate: { lte: newWeek.startDate }, id: { not: newWeek.id } },
        orderBy: { endDate: 'desc' },
        include: { inventoryItems: true }
      })

      const inventoryItems = products.map(p => {
        const prevItem = prevWeek?.inventoryItems.find(pi => pi.productId === p.id)
        // If prev week exists and has a finalStock, use it. Otherwise, use 0.
        // Rule: current stock of prev week becomes initial stock of new week
        const carryOverStock = prevItem 
          ? (prevItem.finalStock ?? (prevItem.initialStock + prevItem.purchasedStock - prevItem.consumed))
          : 0

        return {
          weekId: newWeek.id,
          productId: p.id,
          initialStock: Math.max(0, carryOverStock),
          purchasedStock: 0,
          consumed: 0,
        }
      })

      await tx.inventoryItem.createMany({
        data: inventoryItems
      })

      return newWeek
    })

    res.status(201).json({ success: true, data: week })
  } catch (err) {
    next(err)
  }
})

weeksRouter.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const week = await prisma.week.findUnique({
      where: { id: req.params.id },
      include: { comandas: true, inventoryItems: true }
    })

    if (!week) return res.status(404).json({ success: false, message: 'Semana no encontrada' })
    if (week.status === 'open') return res.status(400).json({ success: false, message: 'No se puede eliminar una semana activa' })

    // Integrity: Cascade deletes are handled by schema mostly, but we ensure clean deletion
    await prisma.$transaction([
      prisma.movement.deleteMany({ where: { weekId: week.id } }),
      prisma.order.deleteMany({ where: { weekId: week.id } }),
      prisma.comanda.deleteMany({ where: { weekId: week.id } }),
      prisma.inventoryItem.deleteMany({ where: { weekId: week.id } }),
      prisma.week.delete({ where: { id: week.id } }),
    ])

    res.json({ success: true, message: 'Semana eliminada correctamente' })
  } catch (err) {
    next(err)
  }
})

weeksRouter.patch('/:id/close', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const week = await prisma.week.update({
      where: { id: req.params.id },
      data: { status: 'closed' },
    })
    res.json({ success: true, data: week })
  } catch (err) {
    next(err)
  }
})

// GET week details for editing (Admin only)
weeksRouter.get('/:id/details', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const week = await prisma.week.findUnique({
      where: { id },
      include: {
        comandas: {
          include: {
            items: { include: { product: true } },
            createdBy: { select: { name: true } }
          },
          orderBy: { date: 'asc' }
        },
        inventoryItems: {
          include: { product: true }
        }
      }
    })

    if (!week) return res.status(404).json({ success: false, message: 'Semana no encontrada' })

    res.json({ success: true, data: week })
  } catch (err) {
    next(err)
  }
})
