import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

export const comandasRouter = Router()

comandasRouter.get('/week/:weekId', async (req, res, next) => {
  try {
    const comandas = await prisma.comanda.findMany({
      where: { weekId: req.params.weekId },
      include: {
        items: {
          include: { product: true }
        },
        createdBy: {
          select: { name: true, role: true }
        }
      },
      orderBy: { date: 'desc' },
    })
    res.json({ success: true, data: comandas })
  } catch (err) {
    next(err)
  }
})

comandasRouter.post('/', async (req, res, next) => {
  try {
    const { weekId, date, note, items } = z.object({
      weekId: z.string(),
      date: z.string(),
      note: z.string().optional(),
      items: z.array(z.object({
        productId: z.string(),
        quantity: z.number().min(1),
      })),
    }).parse(req.body)

    // @ts-ignore - user added by authenticate middleware
    const userId = req.user.id

    const comanda = await prisma.$transaction(async (tx) => {
      // 1. Create the comanda
      const newComanda = await tx.comanda.create({
        data: {
          weekId,
          date: new Date(date),
          note,
          createdById: userId,
          items: {
            create: items.map(item => ({
              productId: item.productId,
              quantity: item.quantity
            }))
          }
        },
        include: {
          items: {
            include: { product: true }
          }
        }
      })

      // 2. Discount from inventory (increment consumed)
      for (const item of items) {
        await tx.inventoryItem.update({
          where: {
            weekId_productId: {
              weekId,
              productId: item.productId
            }
          },
          data: {
            consumed: { increment: item.quantity }
          }
        })
      }

      return newComanda
    })

    res.status(201).json({ success: true, data: comanda })
  } catch (err) {
    next(err)
  }
})

comandasRouter.delete('/:id', async (req, res, next) => {
  try {
    const comanda = await prisma.comanda.findUnique({
      where: { id: req.params.id },
      include: { items: true }
    })

    if (!comanda) {
      res.status(404).json({ success: false, message: 'Comanda no encontrada' })
      return
    }

    await prisma.$transaction(async (tx) => {
      // 1. Revert inventory (decrement consumed)
      for (const item of comanda.items) {
        await tx.inventoryItem.update({
          where: {
            weekId_productId: {
              weekId: comanda.weekId,
              productId: item.productId
            }
          },
          data: {
            consumed: { decrement: item.quantity }
          }
        })
      }

      // 2. Delete the comanda (Cascade will handle items)
      await tx.comanda.delete({
        where: { id: req.params.id }
      })
    })

    res.json({ success: true, message: 'Comanda eliminada y stock revertido' })
  } catch (err) {
    next(err)
  }
})
