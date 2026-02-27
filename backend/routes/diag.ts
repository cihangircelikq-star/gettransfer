import { Router, type Request, type Response } from 'express'
import { storageMode as bookingsStorageMode } from '../services/bookingsStorage.js'

const router = Router()

const has = (k: string) => {
  const v = process.env[k]
  return typeof v === 'string' && v.trim().length > 0
}

router.get('/', (_req: Request, res: Response) => {
  const diag = {
    env: {
      vercel: has('VERCEL'),
      nodeEnv: process.env.NODE_ENV || undefined,
    },
    supabase: {
      hasUrl: has('SUPABASE_URL'),
      hasServiceRole: has('SUPABASE_SERVICE_ROLE_KEY'),
      mode: bookingsStorageMode(),
      docsBucket: process.env.SUPABASE_DOCS_BUCKET || undefined,
    },
    security: {
      bootstrapEnabled: has('BOOTSTRAP_TOKEN'),
      dbUrlPresent: has('SUPABASE_DB_URL'),
    },
  }
  res.json({ success: true, data: diag })
})

export default router
