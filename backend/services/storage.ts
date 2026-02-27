import fetch from 'node-fetch'

const getEnv = (k: string) => {
  const v = process.env[k]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

// Supabase REST API doğrudan kullan (serverless uyumlu)
const SUPABASE_URL = getEnv('SUPABASE_URL')
const SUPABASE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY')

type DriverDoc = {
  name: string
  url?: string
  uploadedAt?: string
  status?: 'pending' | 'approved' | 'rejected'
  rejectReason?: string
}

type DriverSession = {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  password?: string
  passwordHash?: string
  passwordSalt?: string
  tcid?: string
  licenseNumber?: string
  vehicleType: 'sedan' | 'suv' | 'van' | 'luxury'
  vehicleModel?: string
  licensePlate?: string
  docs?: DriverDoc[]
  location: { lat: number, lng: number }
  available: boolean
  approved: boolean
  rejectedReason?: string
}

// In-memory cache (serverless'de her request'te sıfırlanır)
let memory: Map<string, DriverSession> = new Map()

// Supabase REST API isteği
async function supabaseRequest(
  table: string, 
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'UPSERT', 
  data?: unknown, 
  query?: string
): Promise<unknown> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Supabase credentials not configured!')
    throw new Error('Supabase credentials not configured')
  }
  
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`
  
  const headers: Record<string, string> = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
  
  if (method === 'UPSERT') {
    headers['Prefer'] = 'resolution=merge-duplicates,return=representation'
  } else if (method === 'POST' || method === 'PATCH') {
    headers['Prefer'] = 'return=representation'
  }
  
  console.log(`📡 Supabase ${method} ${table}?${query || ''}`)
  
  try {
    const response = await fetch(url, {
      method: method === 'UPSERT' ? 'POST' : method,
      headers,
      body: data ? JSON.stringify(data) : undefined
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Supabase error ${response.status}:`, errorText)
      throw new Error(`Supabase error: ${response.status} - ${errorText}`)
    }
    
    // DELETE için response body boş olabilir
    if (method === 'DELETE') {
      console.log('✅ DELETE successful')
      return true
    }
    
    const text = await response.text()
    
    // PATCH için boş response olabilir (Prefer header olmasına rağmen)
    if (!text) {
      if (method === 'PATCH') {
        console.log('✅ PATCH successful (empty response)')
        return true
      }
      return null
    }
    
    const result = JSON.parse(text)
    console.log(`✅ ${method} successful:`, Array.isArray(result) ? `${result.length} rows` : typeof result)
    return result
    
  } catch (e) {
    console.error(`❌ Supabase request failed:`, e)
    throw e
  }
}

// Driver row'dan DriverSession oluştur
function mapRowToDriver(row: Record<string, unknown>): DriverSession {
  const lat = typeof row.location_lat === 'number' ? row.location_lat : 0
  const lng = typeof row.location_lng === 'number' ? row.location_lng : 0
  
  return {
    id: String(row.id),
    name: String(row.name || 'Sürücü'),
    email: row.email ? String(row.email) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    address: row.address ? String(row.address) : undefined,
    passwordHash: row.password_hash ? String(row.password_hash) : undefined,
    passwordSalt: row.password_salt ? String(row.password_salt) : undefined,
    vehicleType: (row.vehicle_type as DriverSession['vehicleType']) || 'sedan',
    vehicleModel: row.vehicle_model ? String(row.vehicle_model) : undefined,
    licensePlate: row.license_plate ? String(row.license_plate) : undefined,
    docs: row.docs as DriverDoc[] | undefined,
    location: { lat, lng },
    available: !!row.available,
    approved: !!row.approved,
    rejectedReason: row.rejected_reason ? String(row.rejected_reason) : undefined,
  }
}

// ============================================
// EXPORT FONKSİYONLARI
// ============================================

export async function saveDriver(d: DriverSession): Promise<void> {
  memory.set(d.id, d)
  
  const data = {
    id: d.id,
    name: d.name,
    email: d.email || null,
    phone: d.phone || null,
    address: d.address || null,
    password_hash: d.passwordHash || null,
    password_salt: d.passwordSalt || null,
    vehicle_type: d.vehicleType,
    vehicle_model: d.vehicleModel || null,
    license_plate: d.licensePlate || null,
    docs: d.docs || null,
    location_lat: d.location.lat,
    location_lng: d.location.lng,
    available: d.available,
    approved: d.approved,
    rejected_reason: d.rejectedReason || null,
  }
  
  await supabaseRequest('drivers', 'UPSERT', data, 'on_conflict=id')
  console.log('✅ Driver saved:', d.id)
}

export async function getDriver(id: string): Promise<DriverSession | null> {
  // Önce cache'e bak
  if (memory.has(id)) {
    return memory.get(id) || null
  }
  
  // Supabase'den getir
  const rows = await supabaseRequest('drivers', 'GET', null, `select=*&id=eq.${id}&limit=1`) as Record<string, unknown>[] | null
  
  if (!Array.isArray(rows) || rows.length === 0) {
    return null
  }
  
  const driver = mapRowToDriver(rows[0])
  memory.set(id, driver)
  return driver
}

export async function getDriverByEmail(email: string): Promise<DriverSession | null> {
  const emailNorm = email.trim().toLowerCase()
  
  // Önce cache'e bak
  const cached = Array.from(memory.values()).find(d => d.email?.toLowerCase() === emailNorm)
  if (cached) return cached
  
  // Supabase'den getir
  const rows = await supabaseRequest('drivers', 'GET', null, `select=*&email=eq.${encodeURIComponent(emailNorm)}&limit=1`) as Record<string, unknown>[] | null
  
  if (!Array.isArray(rows) || rows.length === 0) {
    return null
  }
  
  const driver = mapRowToDriver(rows[0])
  memory.set(driver.id, driver)
  return driver
}

export async function listDriversByStatus(status: 'approved' | 'pending' | 'rejected' | 'all'): Promise<DriverSession[]> {
  console.log('📋 [LIST] Listing drivers with status:', status)
  
  // Query oluştur - PostgREST formatı
  let query = 'select=*'
  
  if (status === 'approved') {
    // Onaylı sürücüler: approved = true
    query += '&approved=eq.true'
  } else if (status === 'pending') {
    // Bekleyenler: approved = false VE rejected_reason NULL
    query += '&approved=eq.false&rejected_reason=is.null'
  } else if (status === 'rejected') {
    // Reddedilenler: rejected_reason NOT NULL
    query += '&rejected_reason=not.is.null'
  }
  
  console.log('📋 [LIST] Query:', query)
  
  const rows = await supabaseRequest('drivers', 'GET', null, query) as Record<string, unknown>[] | null
  
  if (!Array.isArray(rows)) {
    console.log('⚠️ [LIST] No drivers found or query failed for status:', status)
    return []
  }
  
  console.log(`✅ [LIST] Found ${rows.length} drivers with status: ${status}`)
  
  // Her sürücü için log
  const drivers = rows.map((row, idx) => {
    const driver = mapRowToDriver(row)
    console.log(`📋 [LIST] Driver ${idx + 1}:`, {
      id: driver.id,
      name: driver.name,
      email: driver.email,
      approved: driver.approved,
      available: driver.available
    })
    return driver
  })
  
  return drivers
}

export async function approveDriver(id: string): Promise<boolean> {
  console.log('🟢 [APPROVE] Starting approval for driver:', id)
  
  try {
    const result = await supabaseRequest(
      'drivers', 
      'PATCH', 
      { approved: true, rejected_reason: null }, 
      `id=eq.${id}&select=*`
    )
    
    console.log('🟢 [APPROVE] Supabase PATCH result:', JSON.stringify(result, null, 2))
    
    // Sonucu kontrol et
    if (!result) {
      console.error('❌ [APPROVE] Supabase returned null/undefined')
      throw new Error('Supabase PATCH returned no result')
    }
    
    // Array dönmeli ve en az 1 row olmalı
    if (Array.isArray(result)) {
      if (result.length === 0) {
        console.error('❌ [APPROVE] No rows updated - driver not found in DB')
        throw new Error('Driver not found in database')
      }
      const updatedRow = result[0] as Record<string, unknown>
      console.log('🟢 [APPROVE] Updated row:', {
        id: updatedRow.id,
        name: updatedRow.name,
        approved: updatedRow.approved,
        email: updatedRow.email
      })
      
      // Approved gerçekten true mu kontrol et
      if (updatedRow.approved !== true) {
        console.error('❌ [APPROVE] approved field not updated! Value:', updatedRow.approved)
        throw new Error('Failed to update approved field')
      }
    }
    
    // Cache'i temizle ve yeniden yükle
    memory.delete(id)
    
    const driver = await getDriver(id)
    if (driver) {
      console.log('🟢 [APPROVE] Driver reloaded from DB:', {
        id: driver.id,
        name: driver.name,
        approved: driver.approved,
        email: driver.email
      })
      
      if (!driver.approved) {
        console.error('❌ [APPROVE] Driver still not approved after reload!')
        throw new Error('Driver not approved after update')
      }
    } else {
      console.error('❌ [APPROVE] Could not reload driver from DB')
    }
    
    console.log('✅ [APPROVE] Driver successfully approved:', id)
    return true
    
  } catch (error) {
    console.error('❌ [APPROVE] Error:', error)
    throw error
  }
}

export async function rejectDriver(id: string, reason?: string): Promise<boolean> {
  console.log('🔴 Rejecting driver:', id, 'reason:', reason)
  
  await supabaseRequest(
    'drivers', 
    'PATCH', 
    { approved: false, rejected_reason: reason || 'Reddedildi' }, 
    `id=eq.${id}&select=*`
  )
  
  // Cache'i güncelle
  const driver = await getDriver(id)
  if (driver) {
    driver.approved = false
    driver.rejectedReason = reason || 'Reddedildi'
    memory.set(id, driver)
  }
  
  console.log('✅ Driver rejected:', id)
  return true
}

export async function updateDriverPartial(id: string, data: Partial<DriverSession>): Promise<void> {
  const updateData: Record<string, unknown> = {}
  
  if (data.name) updateData.name = data.name
  if (data.vehicleModel) updateData.vehicle_model = data.vehicleModel
  if (data.licensePlate) updateData.license_plate = data.licensePlate
  if (data.location) {
    updateData.location_lat = data.location.lat
    updateData.location_lng = data.location.lng
  }
  if (typeof data.available === 'boolean') updateData.available = data.available
  
  await supabaseRequest('drivers', 'PATCH', updateData, `id=eq.${id}`)
  console.log('✅ Driver partial update:', id)
}

export async function deleteDriver(id: string): Promise<void> {
  await supabaseRequest('drivers', 'DELETE', null, `id=eq.${id}`)
  memory.delete(id)
  console.log('✅ Driver deleted:', id)
}

export async function diagnoseSupabase() {
  const connected = !!(SUPABASE_URL && SUPABASE_KEY)
  
  let canQuery = false
  let error = null
  
  if (connected) {
    try {
      const result = await supabaseRequest('drivers', 'GET', null, 'select=id&limit=1')
      canQuery = Array.isArray(result)
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : String(e)
    }
  }
  
  return {
    connected,
    canQuery,
    error,
    hasUrl: !!SUPABASE_URL,
    hasService: !!getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    hasAnon: !!getEnv('SUPABASE_ANON_KEY'),
  }
}
