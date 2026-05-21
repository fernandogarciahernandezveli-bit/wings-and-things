import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, requireAdmin } from '../middleware/auth'

export const inventoryRouter = Router()

inventoryRouter.get('/week/:weekId', async (req, res, next) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { weekId: req.params.weekId },
      include: { product: true },
      orderBy: { product: { name: 'asc' } },
    })
    res.json({ success: true, data: items })
  } catch (err) {
    next(err)
  }
})

inventoryRouter.post('/initial', authenticate, async (req, res, next) => {
  try {
    const { weekId, items } = z.object({
      weekId: z.string(),
      items: z.array(z.object({ productId: z.string(), quantity: z.number().min(0) })),
    }).parse(req.body)

    // @ts-ignore
    const isAdmin = req.user.role === 'admin'
    // @ts-ignore
    const userId = req.user.id
    
    const week = await prisma.week.findUnique({ where: { id: weekId } })
    if (!week) return res.status(404).json({ success: false, message: 'Semana no encontrada' })

    if (week.status === 'closed' && !isAdmin) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para editar semanas cerradas' })
    }

    const results = await prisma.$transaction(async (tx) => {
      const updatedItems = []
      for (const item of items) {
        const currentInv = await tx.inventoryItem.findUnique({
          where: { weekId_productId: { weekId, productId: item.productId } },
          include: { product: true }
        })

        if (!currentInv) continue

        // Professional sync logic: Ensure (newInitial + purchased) >= consumed
        const minInitialRequired = Math.max(0, currentInv.consumed - currentInv.purchasedStock)
        const safeInitial = Math.max(item.quantity, minInitialRequired)

        const updated = await tx.inventoryItem.update({
          where: { id: currentInv.id },
          data: { initialStock: safeInitial }
        })

        if (safeInitial !== currentInv.initialStock) {
          await tx.movement.create({
            data: {
              weekId,
              productId: item.productId,
              type: 'adjustment',
              quantity: safeInitial - currentInv.initialStock,
              createdById: userId,
              note: `Ajuste stock inicial: ${currentInv.product.name} (Solicitado: ${item.quantity}, Aplicado: ${safeInitial})`
            }
          })
        }
        updatedItems.push(updated)
      }
      return updatedItems
    })

    res.status(201).json({ success: true, data: results })
  } catch (err) {
    next(err)
  }
})

inventoryRouter.post('/final', authenticate, async (req, res, next) => {
  try {
    const { weekId, items } = z.object({
      weekId: z.string(),
      items: z.array(z.object({ productId: z.string(), quantity: z.number().min(0) })),
    }).parse(req.body)

    // @ts-ignore
    const isAdmin = req.user.role === 'admin'
    // @ts-ignore
    const userId = req.user.id

    const week = await prisma.week.findUnique({ where: { id: weekId } })
    if (!week) return res.status(404).json({ success: false, message: 'Semana no encontrada' })

    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Solo administradores pueden editar stock final' })
    }

    const results = await prisma.$transaction(async (tx) => {
      const updatedItems = []
      for (const item of items) {
        const currentInv = await tx.inventoryItem.findUnique({
          where: { weekId_productId: { weekId, productId: item.productId } },
          include: { product: true }
        })

        if (!currentInv) continue

        const updated = await tx.inventoryItem.update({
          where: { id: currentInv.id },
          data: { finalStock: item.quantity }
        })

        await tx.movement.create({
          data: {
            weekId,
            productId: item.productId,
            type: 'adjustment',
            quantity: 0, // No changes actual stock, just final record
            createdById: userId,
            note: `Corrección administrativa stock final: ${currentInv.product.name} a ${item.quantity}`
          }
        })
        updatedItems.push(updated)
      }
      return updatedItems
    })

    res.status(201).json({ success: true, data: results })
  } catch (err) {
    next(err)
  }
})

// Registrar ajuste manual (auditoría física)
inventoryRouter.post('/adjustment', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { weekId, productId, newActualStock, note } = z.object({
      weekId: z.string(),
      productId: z.string(),
      newActualStock: z.number().min(0),
      note: z.string().min(3),
    }).parse(req.body)

    // @ts-ignore
    const userId = req.user.id

    const result = await prisma.$transaction(async (tx) => {
      const currentInv = await tx.inventoryItem.findUnique({
        where: { weekId_productId: { weekId, productId } },
        include: { product: true }
      })

      if (!currentInv) throw new Error('Item no encontrado')

      // Cálculo de diferencia para el historial
      // Actual = Initial + Purchased - Consumed
      // Consumed = Initial + Purchased - Actual
      const currentConsumed = currentInv.consumed
      const newConsumed = currentInv.initialStock + currentInv.purchasedStock - newActualStock
      
      if (newConsumed < 0) {
        throw new Error('El stock físico no puede ser mayor que el stock disponible (Inicial + Entradas)')
      }

      const updated = await tx.inventoryItem.update({
        where: { id: currentInv.id },
        data: { consumed: newConsumed }
      })

      await tx.movement.create({
        data: {
          weekId,
          productId,
          type: 'adjustment',
          quantity: newActualStock - (currentInv.initialStock + currentInv.purchasedStock - currentInv.consumed),
          createdById: userId,
          note: `Ajuste manual (Inventario Físico): ${currentInv.product.name}. Motivo: ${note}. Stock anterior: ${currentInv.initialStock + currentInv.purchasedStock - currentInv.consumed}, Nuevo: ${newActualStock}`
        }
      })

      return updated
    })

    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

// Registrar entrada
inventoryRouter.post('/entry', authenticate, async (req, res, next) => {
  try {
    const { weekId, productId, quantity, note } = z.object({
      weekId: z.string(),
      productId: z.string(),
      quantity: z.coerce.number().positive(),
      note: z.string().optional(),
    }).parse(req.body)

    // @ts-ignore
    const userId = req.user.id
    // @ts-ignore
    const isAdmin = req.user.role === 'admin'

    const week = await prisma.week.findUnique({ where: { id: weekId } })
    if (!week) return res.status(404).json({ success: false, message: 'Semana no encontrada' })

    // Rule: Entries should mostly be for open weeks. Admin can override.
    if (week.status === 'closed' && !isAdmin) {
      return res.status(403).json({ success: false, message: 'No se pueden registrar entradas en semanas cerradas' })
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update inventory
      const item = await tx.inventoryItem.update({
        where: { weekId_productId: { weekId, productId } },
        data: { purchasedStock: { increment: quantity } },
        include: { product: true }
      })

      // 2. Save movement history
      await tx.movement.create({
        data: {
          weekId,
          productId,
          type: 'entry',
          quantity,
          createdById: userId,
          note: note || `Entrada manual registrada: ${item.product.name}`,
          date: new Date() // explicit date
        }
      })

      return item
    })

    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

inventoryRouter.get('/movements/:weekId', async (req, res, next) => {
  try {
    const movements = await prisma.movement.findMany({
      where: { weekId: req.params.weekId },
      include: { product: true },
      orderBy: { date: 'desc' }
    })
    res.json({ success: true, data: movements })
  } catch (err) {
    next(err)
  }
})
