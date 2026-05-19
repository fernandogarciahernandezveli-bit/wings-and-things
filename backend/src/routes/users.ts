import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'

export const usersRouter = Router()

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(4),
  role: z.enum(['admin', 'bartender', 'supervisor']).default('bartender'),
})

usersRouter.get('/', requireAdmin, async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: users })
  } catch (err) {
    next(err)
  }
})

usersRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { name, email, password, role } = userSchema.parse(req.body)
    
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      res.status(400).json({ success: false, message: 'El email ya está registrado' })
      return
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: bcrypt.hashSync(password, 10),
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    })
    res.status(201).json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
})

usersRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    // @ts-ignore
    const currentUserId = req.user.id

    if (id === currentUserId) {
      return res.status(400).json({ success: false, message: 'No puedes eliminarte a ti mismo' })
    }

    const userToDelete = await prisma.user.findUnique({ where: { id } })
    if (!userToDelete) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' })
    }

    if (userToDelete.role === 'admin') {
      const adminCount = await prisma.user.count({ where: { role: 'admin' } })
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'No se puede eliminar al último administrador' })
      }
    }

    await prisma.user.delete({ where: { id } })
    res.json({ success: true, message: 'Usuario eliminado' })
  } catch (err) {
    next(err)
  }
})
