import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AdminLayout } from '@/components/AdminLayout'
import { DollarSign, Calculator, TrendingUp, Percent, Save, RefreshCw, Loader2, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type PricingConfig = {
  driverPerKm: number
  platformFeePercent: number
  currency: 'EUR' | 'TRY'
  updatedAt?: string
}

const round2 = (n: number) => Math.round(n * 100) / 100
const sym = (c: string) => (String(c).toUpperCase() === 'TRY' ? '₺' : '€')

export const AdminPricing = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cfg, setCfg] = useState<PricingConfig>({ driverPerKm: 1, platformFeePercent: 3, currency: 'EUR' })

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/pricing')
        const j = await res.json()
        if (res.ok && j.success && j.data) {
          if (alive) setCfg(j.data as PricingConfig)
        }
      } catch { /* ignore */ }
      if (alive) setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  const derived = useMemo(() => {
    const driverPerKm = Number(cfg.driverPerKm || 0)
    const feePct = Number(cfg.platformFeePercent || 0)
    const customerPerKm = round2(driverPerKm * (1 + feePct / 100))
    return { customerPerKm }
  }, [cfg.driverPerKm, cfg.platformFeePercent])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/pricing', { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(cfg) 
      })
      const j = await res.json()
      if (!res.ok || !j.success) throw new Error(j.error || 'save_failed')
      setCfg(j.data as PricingConfig)
      toast.success('Fiyatlandırma kaydedildi!')
    } catch {
      toast.error('Kaydetme başarısız')
    } finally {
      setSaving(false)
    }
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pricing')
      const j = await res.json()
      if (res.ok && j.success && j.data) setCfg(j.data as PricingConfig)
    } catch { /* ignore */ }
    setLoading(false)
  }

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/drivers')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Sürücülere Dön</span>
          </button>
          <h1 className="text-2xl font-bold text-white mb-2">Fiyatlandırma Ayarları</h1>
          <p className="text-gray-400 text-sm">Tüm sürücüler için km bazlı ücret ve platform komisyonunu yönetin</p>
        </div>

        {loading ? (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-gray-400">Yükleniyor...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Ana Ayarlar */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                Temel Ayarlar
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Para Birimi */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Para Birimi</label>
                  <select
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={cfg.currency}
                    onChange={(e) => setCfg(s => ({ ...s, currency: (e.target.value === 'TRY' ? 'TRY' : 'EUR') as 'EUR' | 'TRY' }))}
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="TRY">TRY (₺)</option>
                  </select>
                </div>

                {/* Şoför Km Ücreti */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Şoför Km Ücreti</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-4 pr-12 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={cfg.driverPerKm}
                      onChange={(e) => setCfg(s => ({ ...s, driverPerKm: Number(e.target.value) }))}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                      {sym(cfg.currency)}/km
                    </span>
                  </div>
                </div>

                {/* Platform Payı */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Platform Komisyonu</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={100}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-4 pr-10 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={cfg.platformFeePercent}
                      onChange={(e) => setCfg(s => ({ ...s, platformFeePercent: Number(e.target.value) }))}
                    />
                    <Percent className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Hesaplama Önizleme */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-400" />
                Hesaplama Önizleme
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Müşteri Km Ücreti */}
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                    <span className="text-sm text-gray-400">Müşteri Km Ücreti</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {sym(cfg.currency)}{derived.customerPerKm.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    = {sym(cfg.currency)}{cfg.driverPerKm.toFixed(2)} × (1 + {cfg.platformFeePercent}%)
                  </p>
                </div>

                {/* Platform Kazancı */}
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-yellow-400" />
                    <span className="text-sm text-gray-400">Platform Kazancı (km başına)</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {sym(cfg.currency)}{round2(cfg.driverPerKm * (cfg.platformFeePercent / 100)).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Örnek Senaryo */}
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-purple-400" />
                Örnek Senaryo: 10 km Yolculuk
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Şoför Kazancı</p>
                  <p className="text-xl font-bold text-green-400">
                    {sym(cfg.currency)}{round2(cfg.driverPerKm * 10).toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Platform Payı</p>
                  <p className="text-xl font-bold text-yellow-400">
                    {sym(cfg.currency)}{round2((cfg.driverPerKm * 10) * (cfg.platformFeePercent / 100)).toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Müşteri Öder</p>
                  <p className="text-xl font-bold text-blue-400">
                    {sym(cfg.currency)}{round2((cfg.driverPerKm * 10) * (1 + cfg.platformFeePercent / 100)).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Kaydet Butonu */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 py-3 text-lg font-medium text-white rounded-lg transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Kaydet
                  </>
                )}
              </button>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center justify-center gap-2 border border-gray-600 text-gray-300 hover:bg-gray-700 py-3 px-6 rounded-lg transition-colors"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Son Güncelleme */}
            {cfg.updatedAt && (
              <p className="text-center text-xs text-gray-500">
                Son güncelleme: {new Date(cfg.updatedAt).toLocaleString('tr-TR')}
              </p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminPricing
