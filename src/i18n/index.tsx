import React from 'react'

type Dict = Record<string, string>

const tr: Dict = {
  'brand': 'GetTransfer',
  'lang.auto': 'Otomatik',
  'lang.tr': 'Türkçe',
  'lang.en': 'English',
  'nav.home': 'Ana Sayfa',
  'nav.search': 'Ara',
  'customer.reservations': 'Rezervasyonlarım',
  'profile': 'Profil',
  'driver.panel': 'Sürücü Paneli',
  'driver.documents': 'Dokümanlar',
  'auth.logout': 'Çıkış',
  'auth.driverLogin': 'Sürücü Girişi',
  'auth.login': 'Giriş Yap',
  'auth.register': 'Kayıt Ol',
  'footer.customers': 'Müşteriler',
  'footer.search': 'Transfer Ara',
  'footer.reservations': 'Rezervasyonlarım',
  'footer.register': 'Kayıt Ol',
  'footer.drivers': 'Sürücüler',
  'footer.beDriver': 'Sürücü Ol',
  'footer.driverPanel': 'Sürücü Paneli',
  'footer.documents': 'Dokümanlar',
  'footer.help': 'Yardım',
  'footer.helpCenter': 'Yardım Merkezi',
  'footer.contact': 'İletişim',
  'footer.terms': 'Şartlar ve Koşullar',
  'footer.copy': 'Tüm hakları saklıdır.',
  'detector.title': 'Konumunuzu Belirleyin',
  'detector.autoFetching': 'Konumunuz otomatik olarak alınıyor...',
  'detector.error.title': 'Konum Alınamadı',
  'detector.retry': 'Tekrar Dene',
  'detector.manual': 'Manuel Konum',
  'detector.tip': 'Daha hassas sonuç için konum izni verin.',
}

const en: Dict = {
  'brand': 'GetTransfer',
  'lang.auto': 'Auto',
  'lang.tr': 'Turkish',
  'lang.en': 'English',
  'nav.home': 'Home',
  'nav.search': 'Search',
  'customer.reservations': 'My Bookings',
  'profile': 'Profile',
  'driver.panel': 'Driver Panel',
  'driver.documents': 'Documents',
  'auth.logout': 'Logout',
  'auth.driverLogin': 'Driver Login',
  'auth.login': 'Login',
  'auth.register': 'Register',
  'footer.customers': 'Customers',
  'footer.search': 'Find Transfer',
  'footer.reservations': 'My Bookings',
  'footer.register': 'Register',
  'footer.drivers': 'Drivers',
  'footer.beDriver': 'Become a Driver',
  'footer.driverPanel': 'Driver Panel',
  'footer.documents': 'Documents',
  'footer.help': 'Help',
  'footer.helpCenter': 'Help Center',
  'footer.contact': 'Contact',
  'footer.terms': 'Terms & Conditions',
  'footer.copy': 'All rights reserved.',
  'detector.title': 'Set Your Location',
  'detector.autoFetching': 'Your location is being fetched automatically...',
  'detector.error.title': 'Location Unavailable',
  'detector.retry': 'Retry',
  'detector.manual': 'Manual Location',
  'detector.tip': 'For better accuracy, allow location permission.',
}

const de: Dict = {
  'brand': 'GetTransfer',
  'lang.auto': 'Auto',
  'lang.tr': 'Türkisch',
  'lang.en': 'Englisch',
  'nav.home': 'Startseite',
  'nav.search': 'Suchen',
  'customer.reservations': 'Meine Buchungen',
  'profile': 'Profil',
  'driver.panel': 'Fahrerbereich',
  'driver.documents': 'Dokumente',
  'auth.logout': 'Abmelden',
  'auth.driverLogin': 'Fahrer-Login',
  'auth.login': 'Anmelden',
  'auth.register': 'Registrieren',
  'footer.customers': 'Kunden',
  'footer.search': 'Transfer finden',
  'footer.reservations': 'Meine Buchungen',
  'footer.register': 'Registrieren',
  'footer.drivers': 'Fahrer',
  'footer.beDriver': 'Fahrer werden',
  'footer.driverPanel': 'Fahrerbereich',
  'footer.documents': 'Dokumente',
  'footer.help': 'Hilfe',
  'footer.helpCenter': 'Hilfe-Center',
  'footer.contact': 'Kontakt',
  'footer.terms': 'AGB',
  'footer.copy': 'Alle Rechte vorbehalten.',
  'detector.title': 'Standort festlegen',
  'detector.autoFetching': 'Dein Standort wird automatisch ermittelt...',
  'detector.error.title': 'Standort nicht verfügbar',
  'detector.retry': 'Erneut versuchen',
  'detector.manual': 'Manuell auswählen',
  'detector.tip': 'Für bessere Genauigkeit Standortfreigabe erlauben.',
}

const fr: Dict = {
  'brand': 'GetTransfer',
  'lang.auto': 'Auto',
  'lang.tr': 'Turc',
  'lang.en': 'Anglais',
  'nav.home': 'Accueil',
  'nav.search': 'Rechercher',
  'customer.reservations': 'Mes réservations',
  'profile': 'Profil',
  'driver.panel': 'Espace chauffeur',
  'driver.documents': 'Documents',
  'auth.logout': 'Déconnexion',
  'auth.driverLogin': 'Connexion chauffeur',
  'auth.login': 'Connexion',
  'auth.register': 'Inscription',
  'footer.customers': 'Clients',
  'footer.search': 'Trouver un transfert',
  'footer.reservations': 'Mes réservations',
  'footer.register': 'Inscription',
  'footer.drivers': 'Chauffeurs',
  'footer.beDriver': 'Devenir chauffeur',
  'footer.driverPanel': 'Espace chauffeur',
  'footer.documents': 'Documents',
  'footer.help': 'Aide',
  'footer.helpCenter': "Centre d'aide",
  'footer.contact': 'Contact',
  'footer.terms': 'Conditions',
  'footer.copy': 'Tous droits réservés.',
  'detector.title': 'Définir votre position',
  'detector.autoFetching': 'Votre position est en cours de détection...',
  'detector.error.title': 'Position indisponible',
  'detector.retry': 'Réessayer',
  'detector.manual': 'Position manuelle',
  'detector.tip': "Pour plus de précision, autorisez l'accès à la position.",
}

const es: Dict = {
  'brand': 'GetTransfer',
  'lang.auto': 'Auto',
  'lang.tr': 'Turco',
  'lang.en': 'Inglés',
  'nav.home': 'Inicio',
  'nav.search': 'Buscar',
  'customer.reservations': 'Mis reservas',
  'profile': 'Perfil',
  'driver.panel': 'Panel de conductor',
  'driver.documents': 'Documentos',
  'auth.logout': 'Cerrar sesión',
  'auth.driverLogin': 'Acceso conductor',
  'auth.login': 'Iniciar sesión',
  'auth.register': 'Registrarse',
  'footer.customers': 'Clientes',
  'footer.search': 'Buscar traslado',
  'footer.reservations': 'Mis reservas',
  'footer.register': 'Registrarse',
  'footer.drivers': 'Conductores',
  'footer.beDriver': 'Ser conductor',
  'footer.driverPanel': 'Panel de conductor',
  'footer.documents': 'Documentos',
  'footer.help': 'Ayuda',
  'footer.helpCenter': 'Centro de ayuda',
  'footer.contact': 'Contacto',
  'footer.terms': 'Términos y condiciones',
  'footer.copy': 'Todos los derechos reservados.',
  'detector.title': 'Establecer ubicación',
  'detector.autoFetching': 'Se está obteniendo tu ubicación...',
  'detector.error.title': 'Ubicación no disponible',
  'detector.retry': 'Reintentar',
  'detector.manual': 'Ubicación manual',
  'detector.tip': 'Para mayor precisión, permite el acceso a la ubicación.',
}

const ru: Dict = {
  'brand': 'GetTransfer',
  'lang.auto': 'Авто',
  'lang.tr': 'Турецкий',
  'lang.en': 'Английский',
  'nav.home': 'Главная',
  'nav.search': 'Поиск',
  'customer.reservations': 'Мои бронирования',
  'profile': 'Профиль',
  'driver.panel': 'Панель водителя',
  'driver.documents': 'Документы',
  'auth.logout': 'Выйти',
  'auth.driverLogin': 'Вход для водителя',
  'auth.login': 'Войти',
  'auth.register': 'Регистрация',
  'footer.customers': 'Клиенты',
  'footer.search': 'Найти трансфер',
  'footer.reservations': 'Мои бронирования',
  'footer.register': 'Регистрация',
  'footer.drivers': 'Водители',
  'footer.beDriver': 'Стать водителем',
  'footer.driverPanel': 'Панель водителя',
  'footer.documents': 'Документы',
  'footer.help': 'Помощь',
  'footer.helpCenter': 'Центр помощи',
  'footer.contact': 'Контакты',
  'footer.terms': 'Условия',
  'footer.copy': 'Все права защищены.',
  'detector.title': 'Укажите местоположение',
  'detector.autoFetching': 'Определяем ваше местоположение...',
  'detector.error.title': 'Местоположение недоступно',
  'detector.retry': 'Повторить',
  'detector.manual': 'Выбрать вручную',
  'detector.tip': 'Для лучшей точности разрешите доступ к геолокации.',
}

const ar: Dict = {
  'brand': 'GetTransfer',
  'lang.auto': 'تلقائي',
  'lang.tr': 'التركية',
  'lang.en': 'الإنجليزية',
  'nav.home': 'الرئيسية',
  'nav.search': 'بحث',
  'customer.reservations': 'حجوزاتي',
  'profile': 'الملف الشخصي',
  'driver.panel': 'لوحة السائق',
  'driver.documents': 'المستندات',
  'auth.logout': 'تسجيل الخروج',
  'auth.driverLogin': 'دخول السائق',
  'auth.login': 'تسجيل الدخول',
  'auth.register': 'إنشاء حساب',
  'footer.customers': 'العملاء',
  'footer.search': 'ابحث عن نقل',
  'footer.reservations': 'حجوزاتي',
  'footer.register': 'إنشاء حساب',
  'footer.drivers': 'السائقون',
  'footer.beDriver': 'كن سائقًا',
  'footer.driverPanel': 'لوحة السائق',
  'footer.documents': 'المستندات',
  'footer.help': 'مساعدة',
  'footer.helpCenter': 'مركز المساعدة',
  'footer.contact': 'اتصال',
  'footer.terms': 'الشروط والأحكام',
  'footer.copy': 'جميع الحقوق محفوظة.',
  'detector.title': 'تحديد الموقع',
  'detector.autoFetching': 'جارٍ تحديد موقعك تلقائيًا...',
  'detector.error.title': 'الموقع غير متاح',
  'detector.retry': 'إعادة المحاولة',
  'detector.manual': 'تحديد يدوي',
  'detector.tip': 'لتحسين الدقة، اسمح بإذن الموقع.',
}

const dicts: Record<string, Dict> = { tr, en, de, fr, es, ru, ar }

type Ctx = {
  lang: string
  setLang: (l: string) => void
  getDeviceLang: () => string
  t: (k: string) => string
}

const I18nContext = React.createContext<Ctx | null>(null)

export const I18nProvider: React.FC<{ children: React.ReactNode }>=({ children })=>{
  const supported = Object.keys(dicts)
  const normalize = (l: string) => {
    const raw = String(l || '').toLowerCase()
    const base = raw.split('-')[0]
    return supported.includes(base) ? base : 'en'
  }
  const getDeviceLang = () => {
    const langs = Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language]
    for (const l of langs) {
      const n = normalize(l || '')
      if (n) return n
    }
    return 'en'
  }
  const detect = () => {
    const saved = localStorage.getItem('lang')
    if (!saved || saved === 'auto') return getDeviceLang()
    return normalize(saved)
  }
  const [lang, setLangState] = React.useState<string>(detect())
  const t = (k: string) => (dicts[lang]?.[k] ?? dicts['en']?.[k] ?? k)
  const setLangWrap = (l: string) => {
    const raw = String(l || '').toLowerCase()
    if (raw === 'auto') {
      localStorage.setItem('lang', 'auto')
      setLangState(getDeviceLang())
      return
    }
    const v = normalize(raw)
    setLangState(v)
    localStorage.setItem('lang', v)
  }

  React.useEffect(() => {
    const pref = localStorage.getItem('lang')
    if (!pref || pref === 'auto') {
      const next = getDeviceLang()
      if (next !== lang) setLangState(next)
    }
  }, [])

  React.useEffect(() => {
    try {
      document.documentElement.lang = lang
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    } catch {}
  }, [lang])

  return <I18nContext.Provider value={{ lang, setLang: setLangWrap, getDeviceLang, t }}>{children}</I18nContext.Provider>
}

export const useI18n = () => {
  const ctx = React.useContext(I18nContext)
  if (!ctx) throw new Error('I18nProvider missing')
  return ctx
}

