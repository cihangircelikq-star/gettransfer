import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, Car, User, ArrowLeft, Loader2 } from 'lucide-react';
import { API } from '@/utils/api';

interface LoginForm {
  email: string;
  password: string;
}

export const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, isLoading, setUser, setTokens } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  // Handle OAuth callback from Google
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authSuccess = params.get('auth_success');
    const authError = params.get('auth_error');
    const token = params.get('token');
    const userJson = params.get('user');

    if (authError) {
      toast.error('Google giriş hatası: ' + authError);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (authSuccess === 'true' && token && userJson) {
      try {
        const user = JSON.parse(decodeURIComponent(userJson));
        setUser(user);
        setTokens(token, 'refresh_' + token);

        window.history.replaceState({}, '', window.location.pathname);

        // Redirect based on role
        const role = user?.role;
        if (role === 'admin') navigate('/admin/drivers');
        else if (role === 'driver') navigate('/driver/dashboard');
        else navigate('/customer/dashboard');

        toast.success('Hoş geldiniz, ' + (user.name || 'Kullanıcı') + '!');
      } catch (e) {
        console.error('Parse user error:', e);
        toast.error('Kullanıcı bilgileri alınamadı');
      }
    }
  }, [setUser, setTokens, navigate]);

  // Normal giriş
  const onSubmit = async (data: LoginForm) => {
    try {
      let emailInput = (data.email || '').trim().toLowerCase();
      if (emailInput === 'admin@gettrasfer.com' || emailInput === 'admin@gettranfer.com' || emailInput === 'admin@gettransfer.co') {
        emailInput = 'admin@gettransfer.com';
      }
      const desiredType = (emailInput === 'admin' || emailInput === 'admin@gettransfer.com') ? 'admin' : 'customer';
      await login(emailInput, data.password, desiredType);

      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from);
      } else {
        const role = useAuthStore.getState().user?.role;
        if (role === 'admin') navigate('/admin/drivers');
        else if (role === 'driver') navigate('/driver/dashboard');
        else navigate('/customer/dashboard');
      }
    } catch {
      toast.error('Giriş başarısız. Bilgilerinizi kontrol edin.');
    }
  };

  // Google login başlat
  const startGoogleLogin = () => {
    setGoogleLoading(true);
    window.location.href = '/api/auth/google?redirect=' + encodeURIComponent(window.location.origin + '/login');
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

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Müşteri Girişi</h2>
            <p className="mt-2 text-gray-400">Transfer hizmetleri için giriş yapın</p>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                    placeholder="Şifrenizi girin"
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

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 py-3 text-lg"
                isLoading={isLoading}
              >
                Giriş Yap
              </Button>
            </form>

            {/* Google Login */}
            <div className="mt-6">
              <button
                type="button"
                disabled={googleLoading}
                onClick={startGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white rounded-lg px-4 py-3 text-gray-700 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {googleLoading ? 'Giriş yapılıyor...' : 'Google ile Giriş Yap'}
              </button>
            </div>

            {/* Register Link */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <button
                onClick={() => navigate('/register')}
                className="w-full py-3 text-center text-gray-400 hover:text-white border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Hesabınız yok mu? Kayıt olun
              </button>
            </div>

            {/* Driver Login Link */}
            <div className="mt-4 text-center">
              <Link to="/driver/login" className="text-sm text-blue-400 hover:text-blue-300">
                Sürücü girişi için tıklayın
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
