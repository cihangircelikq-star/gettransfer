import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import driversRoutes from './routes/drivers.js'
import bookingsRoutes from './routes/bookings.js'
import placesRoutes from './routes/places.js'
import paymentsRoutes from './routes/payments.js'
import customerRoutes from './routes/customer.js'
import adminRoutes from './routes/admin.js'
import diagRoutes from './routes/diag.js'
import pricingRoutes from './routes/pricing.js'
import mapsRoutes from './routes/maps.js'
import ridesRoutes from './routes/rides.js'
import { config } from './config.js'
import { requestId } from './middleware/requestId.js'
import { logRequestStart, logRequestEnd, logger } from './utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

const allowedOrigins = config.corsOrigins
app.use(
  cors({
    origin: (origin, cb) => {
      if (!allowedOrigins.length) return cb(null, true)
      if (!origin) return cb(null, true)
      cb(null, allowedOrigins.includes(origin))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use(requestId)
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  const id = (req as any).requestId as string | undefined
  logRequestStart(req.method, req.originalUrl || req.url, id)
  res.on('finish', () => {
    logRequestEnd(res.statusCode, Date.now() - start, id)
  })
  next()
})
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  next()
})

const limiterState: Map<string, { tokens: number, last: number }> = new Map()
const capacity = 120
const refillPerMs = capacity / (60 * 1000)
app.use((req: Request, res: Response, next: NextFunction) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'local'
  const now = Date.now()
  const st = limiterState.get(ip) || { tokens: capacity, last: now }
  const delta = Math.max(0, now - st.last)
  st.tokens = Math.min(capacity, st.tokens + delta * refillPerMs)
  st.last = now
  if (st.tokens < 1) { res.status(429).json({ success: false, error: 'rate_limited' }); return }
  st.tokens -= 1
  limiterState.set(ip, st)
  next()
})

app.use('/api/auth', authRoutes)
app.use('/api/drivers', driversRoutes)
app.use('/api/bookings', bookingsRoutes)
app.use('/api/places', placesRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/customer', customerRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/diag', diagRoutes)
app.use('/api/pricing', pricingRoutes)
app.use('/api/maps', mapsRoutes)
app.use('/api/rides', ridesRoutes)

// Serve static files from dist
const distPath = path.join(__dirname, '../dist')
app.use(express.static(distPath))

app.get('/api/docs', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'openapi.json'))
})

app.use('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, message: 'ok' })
})

app.use(
  (error: Error & { statusCode?: number; code?: string }, req: Request, res: Response, _next: NextFunction) => {
    const id = (req as any).requestId as string | undefined
    logger.error('unhandled_error', { requestId: id, message: error.message, code: error.code })
    const status = error.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 500
    const code = error.code || 'internal_error'
    res.status(status).json({ success: false, error: code })
  },
)

// SPA Fallback: for any other route, serve index.html
app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ success: false, error: 'API not found' })
    return
  }
  res.sendFile(path.join(distPath, 'index.html'))
})

export default app
