import { Router, type Request, type Response } from 'express'

const router = Router()

type CustomerProfile = {
  id: string
  name: string
  email: string
  phone?: string
  addresses?: Array<{ id: string, label: string, address: string }>
}

const profiles: Map<string, CustomerProfile> = new Map()

router.get('/profile/:id', (req: Request, res: Response) => {
  const p = profiles.get(req.params.id)
  res.json({ success: true, data: p || null })
})

router.post('/profile/:id', (req: Request, res: Response) => {
  const { name, email, phone, addresses } = req.body || {}
  if (!name || !email) { res.status(400).json({ success: false, error: 'invalid_payload' }); return }
  const p: CustomerProfile = { id: req.params.id, name, email, phone, addresses: Array.isArray(addresses) ? addresses : [] }
  profiles.set(req.params.id, p)
  res.json({ success: true, data: p })
})

router.post('/address/:id', (req: Request, res: Response) => {
  const { label, address } = req.body || {}
  if (!label || !address) { res.status(400).json({ success: false, error: 'invalid_payload' }); return }
  const p = profiles.get(req.params.id) || { id: req.params.id, name: '', email: '' }
  p.addresses = p.addresses || []
  const item = { id: 'addr_' + Date.now(), label, address }
  p.addresses.push(item)
  profiles.set(req.params.id, p as CustomerProfile)
  res.json({ success: true, data: item })
})

export default router
