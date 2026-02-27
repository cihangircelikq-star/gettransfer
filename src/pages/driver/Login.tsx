import React from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { Car, User, ArrowLeft } from 'lucide-react'

interface LoginForm {
  email: string
  password: string
}

export const DriverLogin: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const onSubmit = async (data: LoginForm) => {
    try {
      let emailInput = (data.email || '').trim().toLowerCase()
      if (emailInput === 'admin@gettrasfer.com' || emailInput === 'admin@gettranfer.com' || emailInput === 'admin@gettransfer.co') {
        emailInput = 'admin@gettransfer.com'
      }
      const isAdmin = (emailInput === 'admin' || emailInput === 'admin@gettransfer.com') && data.password === '12345678'
      if (isAdmin) {
        await login(emailInput, data.password, 'admin')
        navigate('/admin/drivers')
      } else {
        const res = await fetch('/api/drivers/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailInput, password: data.password }) })
        const j = await res.json()
        if (!res.ok || !j.success) throw new Error('invalid_credentials')
        useAuthStore.getState().setUser({ id: j.data.id, email: emailInput, name: 'Sürücü', phone: '', role: 'driver', isVerified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        useAuthStore.getState().setTokens('mock-token', 'mock-refresh')
        navigate('/driver/dashboard')
      }
    } catch {
      toast.error('Giriş başarısız. Bilgilerinizi kontrol edin')
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

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Sürücü Girişi</h2>
            <p className="mt-2 text-gray-400">Sürücü paneline erişmek için giriş yapın</p>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Kullanıcı adı veya E-posta
                </label>
                <input
                  type="text"
                  placeholder="admin veya e-posta"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  {...register('email', {
                    required: 'Kullanıcı adı veya e-posta gerekli',
                    validate: (v) => ((v === 'admin' || v === 'admin@gettransfer.com') || /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v)) || 'Geçerli e-posta veya admin'
                  })}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Şifre
                </label>
                <input
                  type="password"
                  placeholder="Şifreniz"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  {...register('password', { required: 'Şifre gerekli', minLength: { value: 6, message: 'En az 6 karakter' } })}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 py-3 text-lg"
                isLoading={isLoading}
              >
                Giriş Yap
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-700">
              <button
                onClick={() => navigate('/driver/apply')}
                className="w-full py-3 text-center text-gray-400 hover:text-white border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Yeni Sürücü Başvurusu
              </button>
            </div>

            <p className="mt-4 text-xs text-gray-500 text-center">
              Admin: admin@gettransfer.com (veya admin) • Şifre: 12345678
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DriverLogin
