import React, { useState } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { toast } from 'sonner'
import {
  Settings as SettingsIcon, Bell, Globe, Shield, Database,
  Save, RefreshCw, Loader2, Check, X, AlertTriangle, Info
} from 'lucide-react'

interface SystemSettings {
  siteName: string
  siteUrl: string
  contactEmail: string
  contactPhone: string
  currency: 'EUR' | 'TRY'
  language: 'tr' | 'en'
  maintenanceMode: boolean
  allowRegistration: boolean
  emailNotifications: boolean
  smsNotifications: boolean
  autoApproveDrivers: boolean
  maxBookingDistance: number
  minBookingTime: number
}

export const AdminSettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'security' | 'system'>('general')

  const [settings, setSettings] = useState<SystemSettings>({
    siteName: 'GetTransfer',
    siteUrl: 'https://gettransfer.vercel.app',
    contactEmail: 'info@gettransfer.com',
    contactPhone: '+90 555 123 4567',
    currency: 'EUR',
    language: 'tr',
    maintenanceMode: false,
    allowRegistration: true,
    emailNotifications: true,
    smsNotifications: false,
    autoApproveDrivers: false,
    maxBookingDistance: 500,
    minBookingTime: 30
  })

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast.success('Ayarlar kaydedildi!')
    setIsSaving(false)
  }

  const handleToggle = (key: keyof SystemSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const systemInfo = {
    version: '1.0.0',
    lastDeploy: new Date().toLocaleString('tr-TR'),
    nodeVersion: '24.x',
    database: 'Supabase PostgreSQL',
    storage: 'Supabase Storage',
    realtime: 'Socket.io'
  }

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-green-600' : 'bg-gray-600'
      }`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
        enabled ? 'translate-x-7' : 'translate-x-1'
      }`} />
    </button>
  )

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Sistem Ayarları</h1>
          <p className="text-gray-400 text-sm">Uygulama ayarlarını, bildirimleri ve güvenlik seçeneklerini yönetin</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'general', label: 'Genel', icon: Globe },
            { id: 'notifications', label: 'Bildirimler', icon: Bell },
            { id: 'security', label: 'Güvenlik', icon: Shield },
            { id: 'system', label: 'Sistem', icon: Database }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-400" />
                Site Bilgileri
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Site Adı</label>
                  <input
                    type="text"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.siteName}
                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Site URL</label>
                  <input
                    type="text"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.siteUrl}
                    onChange={(e) => setSettings({ ...settings, siteUrl: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">İletişim E-posta</label>
                  <input
                    type="email"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.contactEmail}
                    onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">İletişim Telefon</label>
                  <input
                    type="text"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.contactPhone}
                    onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Genel Ayarlar</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-700">
                  <div>
                    <p className="font-medium text-white">Para Birimi</p>
                    <p className="text-sm text-gray-400">Tüm fiyatlar için varsayılan para birimi</p>
                  </div>
                  <select
                    className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value as 'EUR' | 'TRY' })}
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="TRY">TRY (₺)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-700">
                  <div>
                    <p className="font-medium text-white">Dil</p>
                    <p className="text-sm text-gray-400">Arayüz dili</p>
                  </div>
                  <select
                    className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.language}
                    onChange={(e) => setSettings({ ...settings, language: e.target.value as 'tr' | 'en' })}
                  >
                    <option value="tr">Türkçe</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-700">
                  <div>
                    <p className="font-medium text-white">Bakım Modu</p>
                    <p className="text-sm text-gray-400">Siteyi bakım moduna al</p>
                  </div>
                  <Toggle enabled={settings.maintenanceMode} onChange={() => handleToggle('maintenanceMode')} />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-white">Yeni Kayıtlara İzin Ver</p>
                    <p className="text-sm text-gray-400">Yeni kullanıcı kayıtlarını aç/kapat</p>
                  </div>
                  <Toggle enabled={settings.allowRegistration} onChange={() => handleToggle('allowRegistration')} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-yellow-400" />
              Bildirim Ayarları
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-700">
                <div>
                  <p className="font-medium text-white">E-posta Bildirimleri</p>
                  <p className="text-sm text-gray-400">Yeni rezervasyonlar için e-posta gönder</p>
                </div>
                <Toggle enabled={settings.emailNotifications} onChange={() => handleToggle('emailNotifications')} />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-700">
                <div>
                  <p className="font-medium text-white">SMS Bildirimleri</p>
                  <p className="text-sm text-gray-400">Önemli güncellemeler için SMS gönder</p>
                </div>
                <Toggle enabled={settings.smsNotifications} onChange={() => handleToggle('smsNotifications')} />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-white">Otomatik Şoför Onayı</p>
                  <p className="text-sm text-gray-400">Şoför başvurularını otomatik onayla</p>
                </div>
                <Toggle enabled={settings.autoApproveDrivers} onChange={() => handleToggle('autoApproveDrivers')} />
              </div>
            </div>
          </div>
        )}

        {/* Security */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-400" />
                Güvenlik Ayarları
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-700">
                  <div>
                    <p className="font-medium text-white">Maksimum Rezervasyon Mesafesi</p>
                    <p className="text-sm text-gray-400">Kilometre cinsinden maksimum mesafe</p>
                  </div>
                  <input
                    type="number"
                    className="w-24 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.maxBookingDistance}
                    onChange={(e) => setSettings({ ...settings, maxBookingDistance: Number(e.target.value) })}
                  />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-white">Minimum Rezervasyon Süresi</p>
                    <p className="text-sm text-gray-400">Dakika cinsinden minimum süre</p>
                  </div>
                  <input
                    type="number"
                    className="w-24 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={settings.minBookingTime}
                    onChange={(e) => setSettings({ ...settings, minBookingTime: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/20 border border-yellow-700/50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-300">Güvenlik Uyarısı</p>
                  <p className="text-sm text-yellow-200/80 mt-1">
                    API anahtarları ve hassas bilgiler Vercel environment variables üzerinden yönetilmektedir.
                    Bu değerleri değiştirmek için Vercel dashboard'ını kullanın.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-400" />
                Sistem Bilgileri
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Versiyon</p>
                  <p className="text-lg font-bold text-white">{systemInfo.version}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Node.js</p>
                  <p className="text-lg font-bold text-white">{systemInfo.nodeVersion}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Veritabanı</p>
                  <p className="text-lg font-bold text-white">{systemInfo.database}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Depolama</p>
                  <p className="text-lg font-bold text-white">{systemInfo.storage}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Realtime</p>
                  <p className="text-lg font-bold text-white">{systemInfo.realtime}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Son Deploy</p>
                  <p className="text-sm font-bold text-white">{systemInfo.lastDeploy}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Bağlantılar</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="https://vercel.com/cihangirs-projects-7888b8bf/gettransfer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 bg-white rounded flex items-center justify-center">
                    <span className="text-black font-bold text-lg">▲</span>
                  </div>
                  <div>
                    <p className="font-medium text-white">Vercel Dashboard</p>
                    <p className="text-xs text-gray-400">Deploy yönetimi</p>
                  </div>
                </a>

                <a
                  href="https://supabase.com/dashboard/project/huayayzxcojufskkrayg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 bg-emerald-600 rounded flex items-center justify-center">
                    <Database className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Supabase</p>
                    <p className="text-xs text-gray-400">Veritabanı yönetimi</p>
                  </div>
                </a>

                <a
                  href="https://github.com/cihangirq-crypto/gettransfer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-900 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-lg">G</span>
                  </div>
                  <div>
                    <p className="font-medium text-white">GitHub</p>
                    <p className="text-xs text-gray-400">Kaynak kod</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3 text-white rounded-lg font-medium transition-colors"
          >
            {isSaving ? (
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
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminSettings
