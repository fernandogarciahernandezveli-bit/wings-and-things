import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

export const ordersRouter = Router()

ordersRouter.get('/recommend/:weekId', async (req, res, next) => {
  try {
    const { weekId } = req.params
    
    const inventory = await prisma.inventoryItem.findMany({
      where: { weekId },
      include: { product: true }
    })

    const recommendations = inventory.map(item => {
      const currentStock = item.initialStock + item.purchasedStock - item.consumed
      const parLevel = 50 
      const recommended = Math.max(0, parLevel - currentStock)

      return {
        productId: item.productId,
        productName: item.product.name,
        category: item.product.category,
        currentStock,
        consumed: item.consumed,
        recommended
      }
    })

    res.json({ success: true, data: recommendations })
  } catch (err) {
    next(err)
  }
})

ordersRouter.post('/confirm', authenticate, async (req, res, next) => {
  try {
    const { weekId, items, reason } = z.object({
      weekId: z.string(),
      items: z.array(z.object({
        productId: z.string(),
        quantity: z.number().min(0),
        recommended: z.number().optional()
      })),
      reason: z.string().optional()
    }).parse(req.body)

    // @ts-ignore
    const userId = req.user.id

    const order = await prisma.$transaction(async (tx) => {
      // Fetch products to get unitsPerPackage for each
      const productIds = items.map(i => i.productId)
      const products = await tx.product.findMany({
        where: { id: { in: productIds } }
      })
      const productMap = new Map(products.map(p => [p.id, p]))

      // 1. Save the order with packages calculated
      const newOrder = await tx.order.create({
        data: {
          weekId,
          confirmedAt: new Date(),
          reason,
          items: {
            create: items.map(item => {
              const product = productMap.get(item.productId)
              const unitsPerPackage = (product as any)?.unitsPerPackage || 1
              const packages = Math.ceil(item.quantity / unitsPerPackage)
              
              return {
                productId: item.productId,
                quantity: item.quantity,
                packages,
                recommended: item.recommended ?? 0
              }
            })
          }
        },
        include: {
          items: {
            include: { 
              product: true // Now this works because we fixed the relation in schema
            }
          }
        }
      })

      // 2. Update inventory (add to purchasedStock) and record movements
      for (const item of items) {
        if (item.quantity > 0) {
          const invItem = await tx.inventoryItem.update({
            where: {
              weekId_productId: {
                weekId,
                productId: item.productId
              }
            },
            data: {
              purchasedStock: { increment: item.quantity }
            },
            include: { product: true }
          })

          // Save movement history for each item in the order
          await tx.movement.create({
            data: {
              weekId,
              productId: item.productId,
              type: 'entry',
              quantity: item.quantity,
              createdById: userId,
              note: `Pedido confirmado: ${invItem.product.name}`
            }
          })
        }
      }

      return newOrder
    })

    res.status(201).json({ success: true, data: order })
  } catch (err) {
    next(err)
  }
})

ordersRouter.get('/history/:weekId', async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { weekId: req.params.weekId },
      include: {
        items: {
          include: { product: true }
        }
      },
      orderBy: { confirmedAt: 'desc' }
    })
    res.json({ success: true, data: orders })
  } catch (err) {
    next(err)
  }
})
