import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { DriverLayout } from '@/components/DriverLayout'
import { FileText, Upload, Check, AlertCircle, Loader2, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'

interface Document {
  type: string
  label: string
  url?: string
  uploadedAt?: string
  status?: 'pending' | 'approved' | 'rejected'
}

export const DriverDocuments = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [docs, setDocs] = useState<Document[]>([
    { type: 'license', label: 'Sürücü Belgesi' },
    { type: 'vehicle_registration', label: 'Araç Ruhsatı' },
    { type: 'insurance', label: 'Sigorta Belgesi' },
    { type: 'profile_photo', label: 'Profil Fotoğrafı' },
  ])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)

  // Mevcut belgeleri yükle
  useEffect(() => {
    const fetchDocs = async () => {
      if (!user?.id) return
      try {
        const res = await fetch(`/api/drivers/${user.id}`)
        const j = await res.json()
        if (j?.success && j?.data?.docs) {
          const existingDocs = j.data.docs as Array<{ name: string; url?: string; uploadedAt?: string; status?: 'pending' | 'approved' | 'rejected' }>
          setDocs(prev => prev.map(d => {
            const found = existingDocs.find(e => e.name === d.type)
            return found ? { ...d, url: found.url, uploadedAt: found.uploadedAt, status: found.status || 'pending' } : d
          }))
        }
      } catch (err) {
        console.error('Belgeler yüklenemedi:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDocs()
  }, [user?.id])

  const handleFileChange = async (docType: string, file?: File) => {
    if (!file || !user?.id) return
    
    // Dosya tipi kontrolü
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      toast.error('Sadece JPEG, PNG veya PDF yükleyebilirsiniz')
      return
    }

    // Dosya boyutu kontrolü (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu en fazla 5MB olabilir')
      return
    }

    setUploading(docType)
    
    try {
      // Dosyayı base64'e çevir
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Backend'e gönder
      const res = await fetch('/api/drivers/upload-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: user.id,
          docs: [{ name: docType, url: base64 }]
        })
      })

      const j = await res.json()
      if (!res.ok || !j?.success) {
        throw new Error(j?.error || 'Yükleme başarısız')
      }

      // State'i güncelle
      setDocs(prev => prev.map(d => 
        d.type === docType 
          ? { ...d, url: base64, uploadedAt: new Date().toISOString(), status: 'pending' }
          : d
      ))
      
      toast.success('Belge başarıyla yüklendi')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Yükleme başarısız')
    } finally {
      setUploading(null)
    }
  }

  const handleDelete = async (docType: string) => {
    if (!user?.id) return
    if (!confirm('Bu belgeyi silmek istediğinize emin misiniz?')) return

    try {
      const res = await fetch('/api/drivers/upload-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: user.id,
          docs: [{ name: docType, url: '' }] // Boş URL = silme
        })
      })

      const j = await res.json()
      if (!res.ok || !j?.success) {
        throw new Error(j?.error || 'Silme başarısız')
      }

      setDocs(prev => prev.map(d => 
        d.type === docType 
          ? { ...d, url: undefined, uploadedAt: undefined, status: undefined }
          : d
      ))
      
      toast.success('Belge silindi')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Silme başarısız')
    }
  }

  const handleSubmit = () => {
    const missing = docs.filter(d => !d.url)
    if (missing.length > 0) {
      toast.error(`Eksik belgeler: ${missing.map(m => m.label).join(', ')}`)
      return
    }
    toast.success('Tüm belgeler yüklendi ve onay bekliyor')
    navigate('/driver/dashboard')
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">Onaylı</span>
      case 'rejected':
        return <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">Reddedildi</span>
      case 'pending':
        return <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">Onay Bekliyor</span>
      default:
        return null
    }
  }

  return (
    <DriverLayout>
      <div className="min-h-[calc(100vh-56px)] bg-gray-900 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="h-6 w-6 text-green-500" />
              Belgelerim
            </h1>
            <p className="mt-2 text-gray-400">Sürücü belgelerinizi buradan yönetebilirsiniz. Tüm belgeler admin onayından geçmelidir.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </div>
          ) : (
            <div className="bg-gray-800 rounded-xl border border-gray-700 divide-y divide-gray-700">
              {docs.map((doc) => (
                <div key={doc.type} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{doc.label}</span>
                      {getStatusBadge(doc.status)}
                    </div>
                    {doc.url ? (
                      <span className="flex items-center gap-1 text-green-400 text-sm">
                        <Check className="h-4 w-4" />
                        Yüklendi
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-yellow-400 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        Eksik
                      </span>
                    )}
                  </div>

                  {/* Mevcut Belge Önizleme */}
                  {doc.url && (
                    <div className="mb-3 relative group">
                      {doc.url.startsWith('data:image') ? (
                        <img 
                          src={doc.url} 
                          alt={doc.label} 
                          className="h-24 rounded-lg border border-gray-600 cursor-pointer"
                          onClick={() => setPreviewDoc(doc)}
                        />
                      ) : (
                        <div className="h-24 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center">
                          <FileText className="h-8 w-8 text-gray-400" />
                          <span className="ml-2 text-gray-400">PDF Dosyası</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.type)}
                          className="p-2 bg-red-600 rounded-lg text-white hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Yükleme Alanı */}
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={(e) => handleFileChange(doc.type, e.target.files?.[0])}
                      className="hidden"
                      id={`doc-${doc.type}`}
                      disabled={uploading === doc.type}
                    />
                    <label
                      htmlFor={`doc-${doc.type}`}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                        uploading === doc.type
                          ? 'bg-gray-700 text-gray-400 cursor-wait'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {uploading === doc.type ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Yükleniyor...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          <span>{doc.url ? 'Değiştir' : 'Yükle'}</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6">
            <Button
              onClick={handleSubmit}
              disabled={loading || docs.some(d => !d.url)}
              className="w-full bg-green-600 hover:bg-green-700 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Belgeleri Kaydet ve Onaya Gönder
            </Button>
          </div>

          {/* Bilgi Kutusu */}
          <div className="mt-6 bg-blue-900/30 border border-blue-700 rounded-lg p-4">
            <h3 className="text-blue-400 font-medium mb-2">Belge Yükleme Kuralları</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Dosya formatları: JPEG, PNG, PDF</li>
              <li>• Maksimum dosya boyutu: 5MB</li>
              <li>• Tüm belgeler yönetici onayından geçmelidir</li>
              <li>• Belgeleriniz admin panelinde görünecektir</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Önizleme Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <span className="text-white font-medium">{previewDoc.label}</span>
              <button onClick={() => setPreviewDoc(null)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="p-4">
              {previewDoc.url?.startsWith('data:image') ? (
                <img src={previewDoc.url} alt={previewDoc.label} className="w-full h-auto rounded-lg" />
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <FileText className="h-12 w-12 mx-auto mb-2" />
                  <p>PDF dosyası önizlenemiyor</p>
                  <a href={previewDoc.url} download className="text-blue-400 hover:underline mt-2 inline-block">İndir</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DriverLayout>
  )
}

export default DriverDocuments
