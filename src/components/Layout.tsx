import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useI18n } from '@/i18n';
import { 
  Car, 
  MapPin, 
  User, 
  Menu, 
  X,
  LogOut,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { t } = useI18n();

  const isActive = (path: string) => location.pathname === path;

  const crumbs = React.useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean)
    const map: Record<string, string> = {
      admin: 'Yönetici',
      drivers: 'Sürücüler',
      pricing: 'Fiyatlandırma',
      reserve: 'Rezervasyon',
      reservations: 'Rezervasyonlarım',
      search: 'Arama',
      'search-results': 'Arama Sonuçları',
      profile: 'Profil',
      driver: 'Sürücü',
      customer: 'Müşteri',
      dashboard: 'Panel',
      apply: 'Başvuru',
      documents: 'Evraklar',
      checkout: 'Ödeme',
      tracking: 'Takip',
      sitemap: 'Site Haritası',
      login: 'Giriş',
      register: 'Kayıt',
      auth: 'Kimlik Doğrulama',
      booking: 'Rezervasyon Detayı',
      'realtime-tracking': 'Canlı Takip Demo',
      'select-driver': 'Sürücü Seçimi',
    }
    const out: Array<{ label: string, href: string }> = []
    let acc = ''
    for (const p of parts) {
      acc += `/${p}`
      out.push({ label: map[p] || p, href: acc })
    }
    return out
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <Car className="h-8 w-8 text-blue-500" />
              <span className="text-xl font-bold text-white">{t('brand')}</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <LanguageSwitcher />
              
              {user ? (
                <div className="flex items-center space-x-4">
                  {/* Kullanıcı Adı */}
                  <div className="flex items-center gap-2 text-gray-300">
                    <User className="h-4 w-4" />
                    <span className="text-sm">{user.name}</span>
                  </div>
                  
                  {/* Panel Butonu */}
                  <Link to={
                    user.role === 'admin' ? '/admin/drivers' :
                    user.role === 'driver' ? '/driver/dashboard' :
                    '/customer/dashboard'
                  }>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      Panel
                    </Button>
                  </Link>
                  
                  {/* Çıkış */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="text-gray-400 hover:text-white"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    {t('auth.logout')}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link to="/driver/login">
                    <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                      {t('auth.driverLogin')}
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                      {t('auth.login')}
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      {t('auth.register')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-300"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-gray-800 border-t border-gray-700">
            <div className="px-4 py-3 space-y-2">
              {user && (
                <div className="flex items-center gap-2 text-gray-300 py-2 border-b border-gray-700 mb-2">
                  <User className="h-4 w-4" />
                  <span>{user.name}</span>
                </div>
              )}
              
              {user ? (
                <>
                  <Link
                    to={
                      user.role === 'admin' ? '/admin/drivers' :
                      user.role === 'driver' ? '/driver/dashboard' :
                      '/customer/dashboard'
                    }
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-3 py-2 text-gray-300 hover:bg-gray-700 rounded-lg"
                  >
                    Panel
                  </Link>
                  <button
                    onClick={() => { logout(); setIsMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-red-400 hover:bg-gray-700 rounded-lg"
                  >
                    {t('auth.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full border-gray-600 text-gray-300">
                      {t('auth.login')}
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      {t('auth.register')}
                    </Button>
                  </Link>
                  <Link to="/driver/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="ghost" className="w-full text-gray-400">
                      {t('auth.driverLogin')}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Breadcrumb */}
      {crumbs.length > 0 && (
        <div className="bg-gray-800/50 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-10 flex items-center gap-2 text-sm text-gray-400 overflow-x-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Geri
              </Button>
              <ChevronRight className="h-4 w-4 text-gray-600" />
              <Link to="/" className="hover:text-white whitespace-nowrap">Ana Sayfa</Link>
              {crumbs.map((c) => (
                <span key={c.href} className="flex items-center min-w-0">
                  <ChevronRight className="h-4 w-4 text-gray-600 mx-2 flex-shrink-0" />
                  <Link to={c.href} className="hover:text-white truncate">{c.label}</Link>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Car className="h-6 w-6 text-blue-500" />
                <span className="text-lg font-bold text-white">{t('brand')}</span>
              </div>
              <p className="text-gray-400 text-sm">
                Güvenilir ve konforlu transfer hizmetleri için tek adresiniz.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">{t('footer.customers')}</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link to="/search" className="hover:text-white transition-colors">{t('footer.search')}</Link></li>
                <li><Link to="/customer/dashboard" className="hover:text-white transition-colors">{t('footer.reservations')}</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">{t('footer.register')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">{t('footer.drivers')}</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link to="/register/driver" className="hover:text-white transition-colors">{t('footer.beDriver')}</Link></li>
                <li><Link to="/driver/dashboard" className="hover:text-white transition-colors">{t('footer.driverPanel')}</Link></li>
                <li><Link to="/driver/documents" className="hover:text-white transition-colors">{t('footer.documents')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">{t('footer.help')}</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link to="/help" className="hover:text-white transition-colors">{t('footer.helpCenter')}</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">{t('footer.contact')}</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">{t('footer.terms')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-500 text-sm">
            <p>&copy; 2024 {t('brand')}. {t('footer.copy')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
