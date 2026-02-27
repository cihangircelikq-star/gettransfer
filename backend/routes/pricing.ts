import { Router, type Request, type Response } from 'express'
import { getPricingConfig, setPricingConfig } from '../services/pricingStorage.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  getPricingConfig().then(cfg => res.json({ success: true, data: cfg })).catch(() => res.status(500).json({ success: false, error: 'get_failed' }))
})

router.put('/', (req: Request, res: Response) => {
  const patch = (req.body || {}) as any
  setPricingConfig(patch).then(cfg => res.json({ success: true, data: cfg })).catch(() => res.status(500).json({ success: false, error: 'update_failed' }))
})

export default router

