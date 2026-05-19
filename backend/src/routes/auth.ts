import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { generateToken } from '../middleware/auth'
import { prisma } from '../lib/prisma'

export const authRouter = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
})

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body)
    
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ success: false, message: 'Credenciales incorrectas' })
      return
    }

    const token = generateToken({ id: user.id, role: user.role, email: user.email })
    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    })
  } catch (err) {
    next(err)
  }
})

authRouter.get('/me', async (req, res) => {
  // handled by authenticate middleware upstream
  res.json({ success: true, message: 'Authenticated' })
})
