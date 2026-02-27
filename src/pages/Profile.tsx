import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useDriverStore } from '@/stores/driverStore'
import { Button } from '@/components/ui/Button'

export const Profile = () => {
  const { user } = useAuthStore()
  const { me, updateProfile } = useDriverStore()
  const [name, setName] = useState(me?.name || user?.name || '')
  const [licensePlate, setLicensePlate] = useState(me?.licensePlate || '')
  const [vehicleModel, setVehicleModel] = useState(me?.vehicleModel || '')
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [primaryVehicleImage, setPrimaryVehicleImage] = useState<string | null>(null)
  const [vehicleImages, setVehicleImages] = useState<Array<{full:string, thumb:string}>>([])
  const vehicleFileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (user?.role === 'driver') {
      const saved = localStorage.getItem(`driver_profile_${user.id}`)
      if (saved) {
        try {
          const j = JSON.parse(saved)
          setProfilePhoto(j.profilePhoto || null)
          setPrimaryVehicleImage(j.primaryVehicleImage || null)
          setVehicleImages(j.vehicleImages || [])
          setName(j.name || name)
          setLicensePlate(j.licensePlate || '')
          setVehicleModel(j.vehicleModel || '')
        } catch {}
      }
    }
  }, [user?.id])

  const saveLocal = (patch: any) => {
    if (!user) return
    const key = `driver_profile_${user.id}`
    try {
      const prev = JSON.parse(localStorage.getItem(key) || '{}')
      const next = { ...prev, ...patch }
      localStorage.setItem(key, JSON.stringify(next))
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Profilim</h1>

        {user?.role === 'driver' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-md p-6 space-y-3">
              <h3 className="text-lg font-semibold">Sürücü Profil Yönetimi</h3>
              <input className="border rounded px-3 py-2 w-full" placeholder="Ad (Varsayılan şoför adı)" value={name} onChange={e=>{ setName(e.target.value); saveLocal({ name: e.target.value }); try { updateProfile({ name: e.target.value }) } catch {} }} />
              <input className="border rounded px-3 py-2 w-full" placeholder="Plaka" value={licensePlate} onChange={e=>{ setLicensePlate(e.target.value); saveLocal({ licensePlate: e.target.value }); try { updateProfile({ licensePlate: e.target.value }) } catch {} }} />
              <div>
                <input type="file" accept="image/jpeg,image/png" onChange={async (e)=>{
                  const file = e.target.files?.[0]; if (!file) return; const okType = /image\/(jpeg|png)/.test(file.type); if (!okType) return
                  const img = await readImage(file); if (img.width < 200 || img.height < 200) return
                  const dataUrl = await toDataURL(img)
                  setProfilePhoto(dataUrl)
                  saveLocal({ profilePhoto: dataUrl })
                }} />
                {profilePhoto && (<img src={profilePhoto} alt="profil" className="mt-2 w-20 h-20 rounded-full object-cover" />)}
              </div>
              <div>
                <input className="border rounded px-3 py-2 w-full" placeholder="Araç Modeli" value={vehicleModel} onChange={e=>{ setVehicleModel(e.target.value); saveLocal({ vehicleModel: e.target.value }); try { updateProfile({ vehicleModel: e.target.value }) } catch {} }} />
                <input ref={vehicleFileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={async (e)=>{
                  const file = e.target.files?.[0]; if (!file) return; const okType = /image\/(jpeg|png)/.test(file.type); if (!okType) return
                  const img = await readImage(file); if (img.width < 800 || img.height < 600) return
                  const full = await toDataURL(img)
                  const thumb = await toThumbnail(img, 240, 180)
                  const next = [ ...vehicleImages, { full, thumb } ]
                  setVehicleImages(next)
                  setPrimaryVehicleImage(full)
                  saveLocal({ vehicleImages: next, primaryVehicleImage: full })
                }} />
                <Button variant="outline" onClick={()=>vehicleFileRef.current?.click()}>Araç Resmi Yükle</Button>
                {primaryVehicleImage && (<img src={primaryVehicleImage} alt="Araç" className="mt-2 w-full max-h-48 object-cover rounded" />)}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {vehicleImages.map((v,i)=>(<img key={i} src={v.thumb} alt="thumb" className="rounded object-cover w-full h-24" />))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 space-y-3">
              <h3 className="text-lg font-semibold">Özet</h3>
              <div className="text-sm text-gray-700">Ad: {name || '-'}</div>
              <div className="text-sm text-gray-700">Plaka: {licensePlate || '-'}</div>
              <div className="text-sm text-gray-700">Araç Modeli: {vehicleModel || '-'}</div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-gray-700 text-sm">Profil bilgileri yakında burada yönetilecek.</div>
          </div>
        )}
      </div>
    </div>
  )
}

async function readImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = reject
    img.src = url
  })
}

async function toDataURL(img: HTMLImageElement): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = img.width; canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.85)
}

async function toThumbnail(img: HTMLImageElement, w: number, h: number): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.75)
}
