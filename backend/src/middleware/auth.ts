import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'prompt-maestro-secret-dev'

export interface AuthRequest extends Request {
  user?: { id: string; role: string; email: string }
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Token requerido' })
    return
  }

  try {
    const token = header.slice(7)
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; role: string; email: string }
    req.user = payload
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Token inválido o expirado' })
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Acceso denegado' })
    return
  }
  next()
}

export function generateToken(payload: { id: string; role: string; email: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}
