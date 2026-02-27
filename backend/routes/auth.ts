import { Router, type Request, type Response } from 'express'
import crypto from 'crypto'

const router = Router()

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://gettransfer.vercel.app/api/auth/google/callback'

// In-memory state store for OAuth (in production, use Redis or database)
const oauthStates = new Map<string, { createdAt: number, redirect?: string }>()

// In-memory customer store (in production, use database)
const customers: Map<string, { id: string, name: string, email: string, phone: string, passwordHash?: string, passwordSalt?: string, role: string, createdAt: string }> = new Map()

// Clean up expired states every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [state, data] of oauthStates.entries()) {
    if (now - data.createdAt > 5 * 60 * 1000) {
      oauthStates.delete(state)
    }
  }
}, 5 * 60 * 1000)

// Generate Google OAuth URL
router.get('/google', async (req: Request, res: Response): Promise<void> => {
  if (!GOOGLE_CLIENT_ID) {
    res.status(500).json({ success: false, error: 'Google OAuth yapılandırılmamış. Lütfen GOOGLE_CLIENT_ID ortam değişkenini ayarlayın.' })
    return
  }

  const state = crypto.randomBytes(32).toString('hex')
  const redirect = req.query.redirect as string | undefined
  
  oauthStates.set(state, { createdAt: Date.now(), redirect })
  
  const scope = encodeURIComponent('email profile')
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&response_type=code&scope=${scope}&state=${state}`
  
  res.redirect(authUrl)
})

// Google OAuth Callback
router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  const { code, state, error } = req.query

  if (error) {
    res.redirect(`/?auth_error=${encodeURIComponent(error as string)}`)
    return
  }

  if (!code || !state) {
    res.redirect('/?auth_error=missing_params')
    return
  }

  const stateData = oauthStates.get(state as string)
  if (!stateData) {
    res.redirect('/?auth_error=invalid_state')
    return
  }
  oauthStates.delete(state as string)

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString(),
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text())
      res.redirect('/?auth_error=token_exchange_failed')
      return
    }

    const tokens = await tokenResponse.json()
    const accessToken = tokens.access_token

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!userResponse.ok) {
      res.redirect('/?auth_error=user_info_failed')
      return
    }

    const googleUser = await userResponse.json()
    
    // Check if customer exists
    const existingCustomer = Array.from(customers.values()).find(c => c.email === googleUser.email)
    
    let user
    if (existingCustomer) {
      user = {
        id: existingCustomer.id,
        email: existingCustomer.email,
        name: existingCustomer.name,
        phone: existingCustomer.phone || '',
        role: 'customer',
        isVerified: true,
        createdAt: existingCustomer.createdAt,
      }
    } else {
      // Yeni kullanıcı
      user = {
        id: 'google_' + googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        phone: '',
        role: 'customer',
        isVerified: googleUser.verified_email ?? true,
        createdAt: new Date().toISOString(),
      }
      
      customers.set(user.id, {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: '',
        role: 'customer',
        createdAt: user.createdAt,
      })
    }

    // Generate a token
    const token = 'google_token_' + crypto.randomBytes(16).toString('hex')

    // Redirect to frontend with token
    const redirectUrl = stateData.redirect || '/'
    res.redirect(`${redirectUrl}?auth_success=true&token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`)
  } catch (err) {
    console.error('Google OAuth error:', err)
    res.redirect('/?auth_error=oauth_error')
  }
})

// Google One Tap / Sign In With Google - for frontend-posted ID token
router.post('/google', async (req: Request, res: Response): Promise<void> => {
  const { credential } = req.body

  if (!credential) {
    res.status(400).json({ success: false, error: 'Google credential gerekli' })
    return
  }

  try {
    // Verify the Google ID token
    const verifyResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`)
    
    if (!verifyResponse.ok) {
      res.status(401).json({ success: false, error: 'Geçersiz Google token' })
      return
    }

    const googleUser = await verifyResponse.json()
    
    // Check if customer exists
    const existingCustomer = Array.from(customers.values()).find(c => c.email === googleUser.email)
    
    let user
    if (existingCustomer) {
      user = {
        id: existingCustomer.id,
        email: existingCustomer.email,
        name: existingCustomer.name,
        phone: existingCustomer.phone || '',
        role: 'customer',
        isVerified: true,
      }
    } else {
      // Yeni kullanıcı
      user = {
        id: 'google_' + googleUser.sub,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        phone: '',
        role: 'customer',
        isVerified: googleUser.email_verified ?? true,
      }
      
      customers.set(user.id, {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: '',
        role: 'customer',
        createdAt: new Date().toISOString(),
      })
    }

    // Generate token
    const token = 'google_token_' + crypto.randomBytes(16).toString('hex')

    res.json({ 
      success: true, 
      data: { 
        user, 
        token, 
        refreshToken: 'refresh_' + crypto.randomBytes(16).toString('hex') 
      } 
    })
  } catch (err) {
    console.error('Google token verify error:', err)
    res.status(500).json({ success: false, error: 'Google giriş hatası' })
  }
})

// Müşteri Kaydı
router.post('/register/customer', async (req: Request, res: Response): Promise<void> => {
  const { email, name, password, phone } = req.body || {}
  
  console.log('📝 Customer registration:', { email, name, phone: phone ? '***' : 'missing' })
  
  if (!email || !name || !password) {
    res.status(400).json({ success: false, error: 'Tüm alanlar zorunludur (ad, e-posta, şifre)' })
    return
  }
  
  // E-posta kontrolü
  const existingCustomer = Array.from(customers.values()).find(c => c.email.toLowerCase() === email.toLowerCase())
  if (existingCustomer) {
    res.status(400).json({ success: false, error: 'Bu e-posta adresi zaten kayıtlı' })
    return
  }
  
  // Şifre hash'le
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  
  const id = 'cust_' + Date.now()
  const customer = {
    id,
    name,
    email: email.toLowerCase(),
    phone: phone || '',
    passwordHash: hash,
    passwordSalt: salt,
    role: 'customer',
    createdAt: new Date().toISOString(),
  }
  
  customers.set(id, customer)
  
  console.log('✅ Customer registered:', id, email)
  
  // Response
  const token = 'cust_token_' + crypto.randomBytes(16).toString('hex')
  
  res.json({ 
    success: true, 
    data: { 
      user: {
        id,
        name,
        email: customer.email,
        phone: phone || '',
        role: 'customer',
        isVerified: true,
      }, 
      token, 
      refreshToken: 'refresh_' + crypto.randomBytes(16).toString('hex') 
    } 
  })
})

router.post('/register/driver', async (req: Request, res: Response): Promise<void> => {
  const { email = 'driver@example.com', name = 'Sürücü' } = req.body || {}
  const user = {
    id: 'drv_' + Date.now(), email, name, phone: '', role: 'driver', isVerified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }
  res.json({ success: true, data: { user, token: 'mock-token', refreshToken: 'mock-refresh' } })
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email = 'user@example.com', password = '', userType = 'customer' } = req.body || {}
  
  // Admin girişi
  if ((email === 'admin' || email === 'admin@gettransfer.com') && password === '12345678') {
    const user = { id: 'adm_root', email, name: 'Yönetici', phone: '', role: 'admin', isVerified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    res.json({ success: true, data: { user, token: 'mock-token', refreshToken: 'mock-refresh' } })
    return
  }

  // Sürücü girişi
  if (email === 'fatih@test.com' && password === '123456') {
    const user = { id: 'drv_fatih', email, name: 'fatih', phone: '', role: 'driver', isVerified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    res.json({ success: true, data: { user, token: 'mock-token', refreshToken: 'mock-refresh' } })
    return
  }
  if (email === 'vedat@test.com' && password === '123456') {
    const user = { id: 'drv_vedat', email, name: 'vedat', phone: '', role: 'driver', isVerified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    res.json({ success: true, data: { user, token: 'mock-token', refreshToken: 'mock-refresh' } })
    return
  }
  
  // Müşteri girişi - kayıtlı müşterileri kontrol et
  const customer = Array.from(customers.values()).find(c => c.email.toLowerCase() === email.toLowerCase())
  
  if (customer && customer.passwordHash && customer.passwordSalt) {
    const calc = crypto.scryptSync(password, customer.passwordSalt, 64).toString('hex')
    const ok = crypto.timingSafeEqual(Buffer.from(calc, 'hex'), Buffer.from(customer.passwordHash, 'hex'))
    
    if (ok) {
      const user = {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone || '',
        role: 'customer',
        isVerified: true,
      }
      const token = 'cust_token_' + crypto.randomBytes(16).toString('hex')
      res.json({ success: true, data: { user, token, refreshToken: 'refresh_' + token } })
      return
    }
  }
  
  // Genel fallback
  const role = userType === 'admin' ? 'admin' : (userType === 'driver' ? 'driver' : 'customer')
  const user = {
    id: (role === 'driver' ? 'drv_' : role === 'admin' ? 'adm_' : 'cust_') + Date.now(), email, name: role === 'driver' ? 'Sürücü' : (role==='admin'?'Yönetici':'Müşteri'), phone: '', role, isVerified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }
  res.json({ success: true, data: { user, token: 'mock-token', refreshToken: 'mock-refresh' } })
})

router.post('/logout', async (_req: Request, res: Response) => {
  res.json({ success: true })
})

export default router
