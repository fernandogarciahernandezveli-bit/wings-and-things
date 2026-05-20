import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, requireAdmin } from '../middleware/auth'

export const productsRouter = Router()

const productSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1),
  category: z.enum(['refrescos', 'aguas', 'cervezas', 'licores', 'jugos', 'mixers', 'otros']),
  unit: z.string().min(1), // Fixed: must be at least 1 char, not number
  unitsPerPackage: z.number().int().min(1).default(1),
  aliases: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  initialStock: z.number().min(0).optional(), // Optional: only for new products or specific adjustments
})

productsRouter.get('/', async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    res.json({ success: true, data: products })
  } catch (err) {
    next(err)
  }
})

productsRouter.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { initialStock, ...data } = productSchema.parse(req.body)
    
    const product = await prisma.$transaction(async (tx) => {
      // 1. Create the product
      const newProduct = await tx.product.create({ data })

      // 2. Initialize inventory for ALL weeks
      const weeks = await tx.week.findMany()
      
      const inventoryItems = weeks.map(week => ({
        weekId: week.id,
        productId: newProduct.id,
        initialStock: week.status === 'open' ? (initialStock || 0) : 0,
        purchasedStock: 0,
        consumed: 0,
      }))

      await tx.inventoryItem.createMany({
        data: inventoryItems
      })

      return newProduct
    })

    res.status(201).json({ success: true, data: product })
  } catch (err) {
    next(err)
  }
})

productsRouter.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { initialStock, ...data } = productSchema.partial().parse(req.body)
    const { id } = req.params

    const product = await prisma.$transaction(async (tx) => {
      // 1. Update basic info
      const updatedProduct = await tx.product.update({
        where: { id },
        data,
      })

      // 2. Handle initial stock adjustment for the ACTIVE week
      if (initialStock !== undefined) {
        const activeWeek = await tx.week.findFirst({ where: { status: 'open' } })
        
        if (activeWeek) {
          const currentInv = await tx.inventoryItem.findUnique({
            where: { weekId_productId: { weekId: activeWeek.id, productId: id } }
          })

          if (currentInv) {
            // Case 2: Reduce initial below current consumption
            // Professional sync logic: Ensure (newInitial + purchased) >= consumed
            // If newInitial + purchased < consumed, we cap newInitial so current stock is 0
            const minInitialRequired = Math.max(0, currentInv.consumed - currentInv.purchasedStock)
            const safeInitial = Math.max(initialStock, minInitialRequired)

            await tx.inventoryItem.update({
              where: { id: currentInv.id },
              data: { initialStock: safeInitial }
            })

            // Record movement if it was a significant adjustment
            if (safeInitial !== currentInv.initialStock) {
              // @ts-ignore
              const userId = req.user.id
              await tx.movement.create({
                data: {
                  weekId: activeWeek.id,
                  productId: id,
                  type: 'adjustment',
                  quantity: safeInitial - currentInv.initialStock,
                  createdById: userId,
                  note: `Ajuste manual de stock inicial (Solicitado: ${initialStock}, Aplicado: ${safeInitial})`
                }
              })
            }
          }
        }
      }

      return updatedProduct
    })

    res.json({ success: true, data: product })
  } catch (err) {
    next(err)
  }
})

productsRouter.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false },
    })
    res.json({ success: true, message: 'Producto desactivado' })
  } catch (err) {
    next(err)
  }
})

// Parse comanda text (unchanged but ensured it works)
productsRouter.post('/parse', async (req, res, next) => {
  try {
    const { text } = z.object({ text: z.string() }).parse(req.body)
    
    const allProducts = await prisma.product.findMany({
      where: { isActive: true }
    })

    const items: any[] = []
    const unrecognized: string[] = []

    const segments = text.split(/[,|\n]/).map(s => s.trim()).filter(Boolean)
    
    for (const segment of segments) {
      const match = segment.match(/^(\d+)\s+(.+)$/)
      if (match) {
        const quantity = parseInt(match[1], 10)
        const namePart = match[2].toLowerCase()
        
        const product = allProducts.find(p => 
          p.name.toLowerCase().includes(namePart) || 
          p.shortName.toLowerCase().includes(namePart) ||
          p.aliases.some(a => a.toLowerCase().includes(namePart))
        )

        if (product) {
          items.push({
            productId: product.id,
            productName: product.name,
            quantity
          })
        } else {
          unrecognized.push(segment)
        }
      } else {
        unrecognized.push(segment)
      }
    }

    res.json({ success: true, data: { items, unrecognized, text } })
  } catch (err) {
    next(err)
  }
})
