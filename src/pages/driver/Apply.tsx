import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import OpenStreetMap from '@/components/OpenStreetMap'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_CENTER } from '@/config/env'
import { API } from '@/utils/api'
import type { User as UserType } from '@/types'
import { Car, User, ArrowLeft, FileText, Upload, MapPin, Phone, Home } from 'lucide-react'

export const DriverApply: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '', vehicleType: 'sedan', vehicleModel: '', licensePlate: '', lat: 0, lng: 0 })
  const [docs, setDocs] = useState<Record<string, string>>({})
  const [locating, setLocating] = useState(true)
  const [submitting, setSubmitting] = useState(false) // Çift tıklama koruması
  const requiredDocs = [
    { key: 'license', label: 'Sürücü Belgesi' },
    { key: 'vehicle_registration', label: 'Ruhsat' },
    { key: 'insurance', label: 'Sigorta' },
    { key: 'profile_photo', label: 'Profil Fotoğrafı' }
  ]
  const navigate = useNavigate()
  const { setUser, setTokens } = useAuthStore.getState()

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          setForm(prev => ({ ...prev, lat: p.coords.latitude, lng: p.coords.longitude }))
          setLocating(false)
        },
        () => {
          toast.error('Konum alınamadı, lütfen haritadan seçin')
          setLocating(false)
          setForm(prev => ({ ...prev, lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng }))
        },
        { enableHighAccuracy: true }
      )
    } else {
      setLocating(false)
    }
  }, [])

  // Resim compress fonksiyonu
  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        // Oranı koru
        let width = img.width
        let height = img.height
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        
        canvas.width = width
        canvas.height = height
        
        ctx?.drawImage(img, 0, 0, width, height)
        
        // JPEG olarak compress et
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUrl)
      }
      
      img.onerror = () => reject(new Error('Resim yüklenemedi'))
      img.src = URL.createObjectURL(file)
    })
  }

  const onFile = async (name: string, file?: File) => {
    if (!file) return
    const okType = /image\/(jpeg|png|heic|heif)/.test(file.type)
    if (!okType) { toast.error('JPEG/PNG yükleyin'); return }
    
    try {
      // Resmi compress et
      const dataUrl = await compressImage(file, 800, 0.6)
      
      if (!dataUrl.startsWith('data:image/')) { 
        toast.error('Görsel işlenemedi'); 
        return 
      }
      
      // Boyut kontrolü - compress'ten sonra ~500KB'dan büyükse uyar
      const sizeInKB = (dataUrl.length * 3) / 4 / 1024
      if (sizeInKB > 500) {
        toast.warning(`Resim büyük (${Math.round(sizeInKB)}KB), yükleniyor...`)
      }
      
      setDocs(prev => ({ ...prev, [name]: dataUrl }))
      toast.success('Belge yüklendi')
    } catch (e) {
      toast.error('Dosya işlenemedi')
      console.error('Image compress error:', e)
    }
  }

  const submit = async () => {
    // Çift tıklama koruması
    if (submitting) {
      console.log('⚠️ Zaten gönderiliyor, çift tıklama engellendi')
      return
    }
    
    if (!form.name) { toast.error('Ad Soyad gerekli'); return }
    if (!form.phone) { toast.error('Telefon numarası gerekli'); return }
    if (!form.address) { toast.error('Adres gerekli'); return }
    // Konum kontrolü - (0, 0) geçersiz
    if (!form.lat || !form.lng || (form.lat === 0 && form.lng === 0)) {
      toast.error('Konum gerekli! Lütfen haritadan konumunuzu seçin veya tarayıcınıza konum izni verin.')
      return
    }
    for (const n of requiredDocs) { if (!docs[n.key]) { toast.error(`Eksik belge: ${n.label}`); return } }
    
    setSubmitting(true) // Başladı - çift tıklama koruması aktif
    console.log('📤 Sürücü başvurusu gönderiliyor...')
    
    try {
      if (!form.email) { toast.error('E-posta gerekli'); setSubmitting(false); return }
      if (!form.password || form.password.length < 6) { toast.error('Şifre en az 6 karakter olmalı'); setSubmitting(false); return }
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        address: form.address,
        vehicleType: form.vehicleType,
        vehicleModel: form.vehicleModel,
        licensePlate: form.licensePlate,
        docs: requiredDocs.map(n => ({ name: n.key, url: docs[n.key] })),
        location: { lat: form.lat, lng: form.lng }
      }
      const res = await fetch(`${API}/drivers/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json()
      if (!res.ok || !j.success) {
        setSubmitting(false) // Hata - tekrar deneyebilsin
        if (j.error === 'docs_required') throw new Error('Lütfen tüm belgeleri eksiksiz yükleyin')
        if (j.error === 'invalid_payload_location_required') throw new Error('Konum bilgisi gerekli. Lütfen haritadan konumunuzu seçin.')
        if (j.error === 'invalid_payload') throw new Error('Form verileri eksik veya geçersiz')
        if (j.error === 'email_already_exists') throw new Error('Bu e-posta adresi zaten kayıtlı!')
        throw new Error(j.error || 'Başvuru sırasında sunucu hatası oluştu')
      }
      console.log('✅ Sürücü başvurusu başarılı:', j.data?.id)
      toast.success('Başvurunuz başarıyla alındı, yönetici onayı bekleniyor')
      const driverId = j.data?.id as string
      if (driverId) {
        const newUser: UserType = {
          id: driverId,
          email: form.email,
          name: form.name || 'Sürücü',
          phone: form.phone,
          address: form.address,
          role: 'driver',
          isVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        setUser(newUser)
        setTokens('mock-token', 'mock-refresh')
        navigate('/driver/dashboard')
      }
    } catch (e) { 
      console.error('❌ Başvuru hatası:', e)
      toast.error(e instanceof Error ? e.message : 'Başvuru başarısız') 
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-800">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Ana Sayfa</span>
        </button>
        <div className="flex items-center gap-2">
          <Car className="h-6 w-6 text-green-500" />
          <span className="text-white font-bold">GetTransfer</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Yeni Sürücü Başvurusu</h1>
            <p className="mt-2 text-gray-400">Sürücü olarak çalışmak için başvurun</p>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-5">
            {/* Personal Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="h-5 w-5 text-green-500" />
                Kişisel Bilgiler
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ad Soyad"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
                <input
                  className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="E-posta"
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Telefon Numarası (örn: 0532 123 45 67)"
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <input
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Şifre (en az 6 karakter)"
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div className="relative">
                <Home className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <textarea
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Adres (Mahalle, Sokak, No, İlçe, İl)"
                  rows={2}
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </div>

            {/* Vehicle Info */}
            <div className="space-y-4 pt-4 border-t border-gray-700">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Car className="h-5 w-5 text-green-500" />
                Araç Bilgileri
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={form.vehicleType}
                  onChange={e => setForm({ ...form, vehicleType: e.target.value as 'sedan' | 'suv' | 'van' | 'luxury' })}
                >
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="van">Van</option>
                  <option value="luxury">Lüks</option>
                </select>
                <input
                  className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Araç Modeli"
                  value={form.vehicleModel}
                  onChange={e => setForm({ ...form, vehicleModel: e.target.value })}
                />
                <input
                  className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Plaka"
                  value={form.licensePlate}
                  onChange={e => setForm({ ...form, licensePlate: e.target.value })}
                />
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-4 pt-4 border-t border-gray-700">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-500" />
                Belgeler
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requiredDocs.map(doc => (
                  <div key={doc.key} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">{doc.label}</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(e) => onFile(doc.key, e.target.files?.[0])}
                        className="hidden"
                        id={`file-${doc.key}`}
                      />
                      <label
                        htmlFor={`file-${doc.key}`}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 cursor-pointer hover:bg-gray-600 transition-colors"
                      >
                        <Upload className="h-5 w-5" />
                        <span>{docs[doc.key] ? 'Değiştir' : 'Yükle'}</span>
                      </label>
                    </div>
                    {docs[doc.key] && (
                      <img src={docs[doc.key]} alt={doc.label} className="h-16 rounded-lg border border-gray-600" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4 pt-4 border-t border-gray-700">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-500" />
                Konum
              </h2>
              <div className="h-48 rounded-lg overflow-hidden border border-gray-600 relative">
                {locating && (
                  <div className="absolute inset-0 bg-gray-800/80 z-10 flex items-center justify-center">
                    <span className="text-sm text-gray-400">Konum alınıyor...</span>
                  </div>
                )}
                <OpenStreetMap
                  center={form.lat ? { lat: form.lat, lng: form.lng } : DEFAULT_CENTER}
                  customerLocation={form.lat ? { lat: form.lat, lng: form.lng } : DEFAULT_CENTER}
                  drivers={[]}
                  onMapClick={(loc) => setForm({ ...form, lat: loc.lat, lng: loc.lng })}
                />
              </div>
              <p className="text-xs text-gray-500">Konumunuzu doğrulamak için haritada tıklayarak seçin</p>
            </div>

            {/* Submit */}
            <div className="pt-4">
              {/* Konum durumu göster */}
              {(form.lat === 0 && form.lng === 0) && (
                <p className="text-yellow-400 text-sm mb-3 text-center">
                  ⚠️ Konum gereklidir - GPS izni verin veya haritaya tıklayın
                </p>
              )}
              <Button
                onClick={submit}
                disabled={locating || submitting || (form.lat === 0 && form.lng === 0)}
                className="w-full bg-green-600 hover:bg-green-700 py-3 text-lg disabled:opacity-50"
              >
                {locating ? 'Konum alınıyor...' : submitting ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}
              </Button>
            </div>
          </div>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/driver/login')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Zaten hesabınız var mı? Giriş yapın
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DriverApply
