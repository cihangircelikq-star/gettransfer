import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { Mail, Lock, User, Eye, EyeOff, Car, ArrowLeft, Loader2 } from 'lucide-react';
import { API } from '@/utils/api';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const Register: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser, setTokens } = useAuthStore();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>();
  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);

    try {
      const response = await fetch(`${API}/auth/register/customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setUser(result.data.user);
        setTokens(result.data.token, result.data.refreshToken);
        toast.success('Kayıt başarılı! Hoş geldiniz.');
        navigate('/customer/dashboard');
      } else {
        toast.error(result.error || 'Kayıt başarısız');
      }
    } catch (error) {
      console.error('Register error:', error);
      toast.error('Kayıt sırasında bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

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
          <Car className="h-6 w-6 text-blue-500" />
          <span className="text-white font-bold">GetTransfer</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Müşteri Kaydı</h2>
            <p className="mt-2 text-gray-400">Transfer hizmetleri için hesap oluşturun</p>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Ad Soyad
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Adınız ve soyadınız"
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    {...register('name', {
                      required: 'Ad soyad gereklidir',
                      minLength: { value: 3, message: 'En az 3 karakter olmalıdır' },
                    })}
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  E-posta adresi
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    placeholder="E-posta adresinizi girin"
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    {...register('email', {
                      required: 'E-posta adresi gereklidir',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Geçerli bir e-posta adresi girin',
                      },
                    })}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Şifrenizi girin (en az 6 karakter)"
                    className="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    {...register('password', {
                      required: 'Şifre gereklidir',
                      minLength: { value: 6, message: 'Şifre en az 6 karakter olmalıdır' },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Şifre Tekrar
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Şifrenizi tekrar girin"
                    className="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    {...register('confirmPassword', {
                      required: 'Şifre tekrarı gereklidir',
                      validate: value => value === password || 'Şifreler eşleşmiyor',
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 py-3 text-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Kayıt yapılıyor...
                  </>
                ) : (
                  'Kayıt Ol'
                )}
              </Button>
            </form>

            {/* Login Link */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 text-center text-gray-400 hover:text-white border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Zaten hesabınız var mı? Giriş yapın
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
