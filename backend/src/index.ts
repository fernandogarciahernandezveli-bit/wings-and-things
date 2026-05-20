import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { rateLimit } from 'express-rate-limit'
import * as dotenv from 'dotenv'

// Load environment variables before anything else
dotenv.config()

import { authRouter } from './routes/auth'
import { productsRouter } from './routes/products'
import { weeksRouter } from './routes/weeks'
import { inventoryRouter } from './routes/inventory'
import { comandasRouter } from './routes/comandas'
import { analyticsRouter } from './routes/analytics'
import { ordersRouter } from './routes/orders'
import { usersRouter } from './routes/users'
import { errorHandler } from './middleware/errorHandler'
import { authenticate } from './middleware/auth'

const app = express()
const PORT = process.env.PORT ?? 4000

// ─── Middleware ───────────────────────────────────────────────────────────────

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[]

app.use(helmet())
app.use(cors({ 
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    
    // Acepta cualquier subdominio de vercel.app y las origins exactas
    const isVercel = origin.endsWith('.vercel.app')
    const isAllowed = allowedOrigins.includes(origin)
    
    if (isVercel || isAllowed) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }, 
  credentials: true 
}))
app.use(express.json({ limit: '1mb' }))
app.use(morgan('dev'))

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 })
app.use(limiter)

// ─── Public routes ────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter)

// ─── Protected routes ─────────────────────────────────────────────────────────

app.use('/api/products', authenticate, productsRouter)
app.use('/api/weeks', authenticate, weeksRouter)
app.use('/api/inventory', authenticate, inventoryRouter)
app.use('/api/comandas', authenticate, comandasRouter)
app.use('/api/analytics', authenticate, analyticsRouter)
app.use('/api/orders', authenticate, ordersRouter)
app.use('/api/users', authenticate, usersRouter)

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() })
})

// ─── Error handler ────────────────────────────────────────────────────────────

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`🚀 WINGS & THINGS Backend → http://localhost:${PORT}`)
})

export default app
