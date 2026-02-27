import crypto from 'crypto'

const base64url = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
const base64urlToBuf = (s: string) => {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(b64, 'base64')
}

const secret = () => {
  const v = process.env.GUEST_TOKEN_SECRET
  if (typeof v === 'string' && v.trim()) return v.trim()
  return process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-guest-token-secret'
}

export function createGuestToken(phoneE164: string, ttlMs = 10 * 60_000) {
  const now = Date.now()
  const payload = {
    phone: phoneE164,
    exp: now + ttlMs,
    n: base64url(crypto.randomBytes(12)),
  }
  const payloadJson = Buffer.from(JSON.stringify(payload), 'utf8')
  const p = base64url(payloadJson)
  const sig = base64url(crypto.createHmac('sha256', secret()).update(p).digest())
  return `${p}.${sig}`
}

export function verifyGuestToken(token: string) {
  const t = String(token || '').trim()
  const parts = t.split('.')
  if (parts.length !== 2) return null
  const [p, sig] = parts
  const expected = base64url(crypto.createHmac('sha256', secret()).update(p).digest())
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null
  let payload: any = null
  try { payload = JSON.parse(base64urlToBuf(p).toString('utf8')) } catch { return null }
  if (!payload || typeof payload.phone !== 'string' || typeof payload.exp !== 'number') return null
  if (Date.now() > payload.exp) return null
  return { phone: payload.phone as string, exp: payload.exp as number }
}

