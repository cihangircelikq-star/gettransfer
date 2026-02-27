import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Car, 
  MapPin, 
  User, 
  Settings,
  History,
  FileText,
  LogIn,
  UserPlus,
  Shield,
  CheckCircle,
  CreditCard,
  Navigation
} from 'lucide-react';

interface SiteSection {
  title: string;
  icon: any;
  items: Array<{
    name: string;
    path: string;
    description: string;
  }>;
}

const sections: SiteSection[] = [
  {
    title: 'Genel',
    icon: Car,
    items: [
      { name: 'Anasayfa', path: '/', description: 'Ana sayfa ve giriş' },
      { name: 'Arama', path: '/search', description: 'Transfer arama' },
      { name: 'Rezervasyon', path: '/reserve', description: 'Yeni rezervasyon oluştur' },
      { name: 'Rezervasyonlarım', path: '/reservations', description: 'Geçmiş rezervasyonlar' },
      { name: 'Sorgu Sonuçları', path: '/search-results', description: 'Arama sonuçları' },
    ],
  },
  {
    title: 'Müşteri',
    icon: User,
    items: [
      { name: 'Müşteri Paneli', path: '/customer/dashboard', description: 'Müşteri işlemleri' },
      { name: 'Rezervasyon Detayı', path: '/booking', description: 'Rezervasyon detayları' },
      { name: 'Ödeme', path: '/checkout', description: 'Ödeme işlemi' },
      { name: 'Canlı Takip', path: '/tracking', description: 'Canlı sürücü takibi' },
    ],
  },
  {
    title: 'Sürücü',
    icon: Settings,
    items: [
      { name: 'Sürücü Girişi', path: '/driver/login', description: 'Sürücü paneline giriş' },
      { name: 'Sürücü Paneli', path: '/driver/dashboard', description: 'Sürücü işlemleri' },
      { name: 'Sürücü Başvurusu', path: '/driver/apply', description: 'Sürücü başvuru formu' },
      { name: 'Evraklar', path: '/driver/documents', description: 'Evrak yükleme' },
    ],
  },
  {
    title: 'Yönetici',
    icon: Shield,
    items: [
      { name: 'Sürücüler', path: '/admin/drivers', description: 'Sürücü onay ve yönetimi' },
      { name: 'Fiyatlandırma', path: '/admin/pricing', description: 'Fiyatlandırma ayarları' },
    ],
  },
  {
    title: 'Hesap',
    icon: UserPlus,
    items: [
      { name: 'Giriş Yap', path: '/login', description: 'Kullanıcı girişi' },
      { name: 'Kayıt Ol', path: '/register', description: 'Yeni kullanıcı kaydı' },
      { name: 'Profil', path: '/profile', description: 'Kullanıcı profili' },
    ],
  },
];

export const SiteMap: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Site Haritası</h1>
          <p className="text-lg text-gray-600">Tüm sayfalar ve hızlı navigasyon</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div key={idx} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
                </div>
                
                <ul className="space-y-3">
                  {section.items.map((item) => (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className="block p-3 rounded-lg hover:bg-blue-50 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                            <span className="font-medium text-gray-900 group-hover:text-blue-700">
                              {item.name}
                            </span>
                          </div>
                          <MapPin className="h-4 w-4 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="mt-1 text-sm text-gray-500 ml-6">{item.description}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Hızlı İpuçları</h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start space-x-2">
              <span className="text-blue-600">•</span>
              <span>Üstteki navigasyon çubuğundan ana sayfalara hızlı erişebilirsiniz</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600">•</span>
              <span>Her sayfada breadcrumb navigasyonu ile kolayca geri dönebilirsiniz</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600">•</span>
              <span>Mobil cihazlarda sol üstteki menü ikonunu kullanarak tüm sayfalara erişebilirsiniz</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
