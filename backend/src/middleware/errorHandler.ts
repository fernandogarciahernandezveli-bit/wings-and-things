import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('[ERROR]', err.message)

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    })
    return
  }

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
  })
}
