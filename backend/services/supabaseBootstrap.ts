import fs from 'fs'
import path from 'path'
import pg from 'pg'

const { Client } = pg

const getEnv = (k: string) => {
  const v = process.env[k]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

const splitSql = (sql: string) => {
  const out: string[] = []
  let cur = ''
  let inSingle = false
  let inDouble = false
  let inDollar = false
  let dollarTag = ''
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]
    const nxt = sql[i + 1]
    if (!inSingle && !inDouble && !inDollar && ch === '-' && nxt === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
      cur += '\n'
      continue
    }
    if (!inSingle && !inDouble && !inDollar && ch === '/' && nxt === '*') {
      i += 2
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++
      i++
      continue
    }
    if (!inDouble && !inDollar && ch === "'" && sql[i - 1] !== '\\') inSingle = !inSingle
    else if (!inSingle && !inDollar && ch === '"' && sql[i - 1] !== '\\') inDouble = !inDouble
    else if (!inSingle && !inDouble && ch === '$') {
      const m = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i))
      if (m) {
        const tag = m[0]
        if (!inDollar) {
          inDollar = true
          dollarTag = tag
        } else if (tag === dollarTag) {
          inDollar = false
          dollarTag = ''
        }
        cur += tag
        i += tag.length - 1
        continue
      }
    }
    if (!inSingle && !inDouble && !inDollar && ch === ';') {
      const stmt = cur.trim()
      if (stmt) out.push(stmt)
      cur = ''
      continue
    }
    cur += ch
  }
  const last = cur.trim()
  if (last) out.push(last)
  return out
}

export async function bootstrapSupabaseSchema() {
  const dbUrl = getEnv('SUPABASE_DB_URL')
  if (!dbUrl) return { ok: false as const, error: 'SUPABASE_DB_URL_missing' as const }

  const schemaPath = path.resolve(process.cwd(), 'supabase', 'schema.sql')
  if (!fs.existsSync(schemaPath)) return { ok: false as const, error: 'schema_sql_missing' as const }
  const sql = fs.readFileSync(schemaPath, 'utf8')
  const stmts = splitSql(sql)
  if (stmts.length === 0) return { ok: true as const, applied: 0 }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false } as any,
    connectionTimeoutMillis: 8000,
    query_timeout: 15000,
  } as any)
  await client.connect()
  try {
    await client.query('begin')
    for (const s of stmts) {
      await client.query(s)
    }
    await client.query('commit')
    return { ok: true as const, applied: stmts.length }
  } catch (e: any) {
    try { await client.query('rollback') } catch {}
    return { ok: false as const, error: 'bootstrap_failed' as const, reason: String(e?.message || e || 'unknown') }
  } finally {
    try { await client.end() } catch {}
  }
}

export async function checkBookingsTable() {
  const dbUrl = getEnv('SUPABASE_DB_URL')
  if (!dbUrl) return { ok: false as const, error: 'SUPABASE_DB_URL_missing' as const }
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false } as any,
    connectionTimeoutMillis: 8000,
    query_timeout: 15000,
  } as any)
  await client.connect()
  try {
    const r = await client.query(`select to_regclass('public.bookings') as reg`)
    const exists = !!r?.rows?.[0]?.reg
    return { ok: true as const, exists }
  } catch (e: any) {
    return { ok: false as const, error: 'check_failed' as const, reason: String(e?.message || e || 'unknown') }
  } finally {
    try { await client.end() } catch {}
  }
}

export async function checkDriversTable() {
  const dbUrl = getEnv('SUPABASE_DB_URL')
  if (!dbUrl) return { ok: false as const, error: 'SUPABASE_DB_URL_missing' as const }
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false } as any,
    connectionTimeoutMillis: 8000,
    query_timeout: 15000,
  } as any)
  await client.connect()
  try {
    const r = await client.query(`select to_regclass('public.drivers') as reg`)
    const exists = !!r?.rows?.[0]?.reg
    return { ok: true as const, exists }
  } catch (e: any) {
    return { ok: false as const, error: 'check_failed' as const, reason: String(e?.message || e || 'unknown') }
  } finally {
    try { await client.end() } catch {}
  }
}

// REST API ile tablo oluştur (DB URL olmadan)
export async function bootstrapDriversTableViaREST() {
  const SUPABASE_URL = getEnv('SUPABASE_URL')
  const SUPABASE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY')
  
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { ok: false as const, error: 'Supabase credentials missing' }
  }
  
  // Supabase REST API ile drivers tablosu için RLS policy kontrolü
  // Not: REST API ile tablo oluşturulamaz, ama en azından veri eklenebilir mi kontrol edelim
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/drivers?limit=1`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      }
    })
    
    if (response.ok) {
      return { ok: true as const, exists: true }
    }
    
    if (response.status === 404) {
      return { ok: true as const, exists: false }
    }
    
    return { ok: false as const, error: `HTTP ${response.status}` }
  } catch (e: any) {
    return { ok: false as const, error: String(e?.message || e || 'unknown') }
  }
}

