import type { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'

export function requestId(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const incoming = (req.headers['x-request-id'] as string) || ''
  const id = incoming || randomUUID()
  ;(req as any).requestId = id
  res.setHeader('X-Request-Id', id)
  next()
}

