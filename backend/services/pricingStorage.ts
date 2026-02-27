import { createClient } from '@supabase/supabase-js'
import { logger } from '../utils/logger.js'

const getEnv = (k: string) => {
  const v = process.env[k]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

export type PricingConfig = {
  driverPerKm: number
  platformFeePercent: number
  currency: 'EUR' | 'TRY'
  updatedAt: string
}

const round2 = (n: number) => Math.round(n * 100) / 100

const defaultConfig = (): PricingConfig => ({
  driverPerKm: 1,
  platformFeePercent: 3,
  currency: 'EUR',
  updatedAt: new Date().toISOString(),
})

let memory: PricingConfig = defaultConfig()

const supabaseUrl = getEnv('SUPABASE_URL')
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY')
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } }) : null

const coerceNumber = (v: any) => {
  if (typeof v === 'number' && isFinite(v)) return v
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v)
    return isFinite(n) ? n : null
  }
  return null
}

const coerceCurrency = (v: any): PricingConfig['currency'] => {
  const s = String(v || '').trim().toUpperCase()
  if (s === 'TRY') return 'TRY'
  return 'EUR'
}

const normalize = (p: Partial<PricingConfig>) => {
  const driverPerKmRaw = coerceNumber((p as any).driverPerKm)
  const platformFeePercentRaw = coerceNumber((p as any).platformFeePercent)
  const driverPerKm = driverPerKmRaw === null ? memory.driverPerKm : Math.max(0, round2(driverPerKmRaw))
  const platformFeePercent = platformFeePercentRaw === null ? memory.platformFeePercent : Math.max(0, round2(platformFeePercentRaw))
  const currency = coerceCurrency((p as any).currency)
  return { driverPerKm, platformFeePercent, currency }
}

export async function getPricingConfig(): Promise<PricingConfig> {
  if (!supabase) return memory
  try {
    const { data, error } = await supabase.from('app_settings').select('value,updated_at').eq('key', 'pricing').limit(1)
    if (error) throw error
    const row: any = Array.isArray(data) ? data[0] : null
    const val = row?.value || null
    if (!val) return memory
    const normalized = normalize(val)
    memory = { ...memory, ...normalized, updatedAt: row?.updated_at || memory.updatedAt }
    return memory
  } catch (e: any) {
    logger.warn('pricing_get_failed', { reason: String(e?.message || e || 'unknown') })
    return memory
  }
}

export async function setPricingConfig(patch: Partial<PricingConfig>): Promise<PricingConfig> {
  const normalized = normalize(patch)
  const next: PricingConfig = { ...memory, ...normalized, updatedAt: new Date().toISOString() }
  memory = next
  if (!supabase) return next
  try {
    const { error } = await supabase.from('app_settings').upsert({
      key: 'pricing',
      value: normalized,
      updated_at: next.updatedAt,
    })
    if (error) throw error
  } catch (e: any) {
    logger.warn('pricing_set_failed', { reason: String(e?.message || e || 'unknown') })
  }
  return next
}

