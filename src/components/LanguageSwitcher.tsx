import React from 'react'
import { useI18n } from '@/i18n'

export const LanguageSwitcher: React.FC = () => {
  const { lang, setLang, t } = useI18n()
  const saved = (() => {
    try { return localStorage.getItem('lang') || 'auto' } catch { return 'auto' }
  })()
  return (
    <select
      value={saved === 'auto' ? 'auto' : lang}
      onChange={(e)=>setLang(e.target.value)}
      className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm text-gray-200"
    >
      <option value="auto">{t('lang.auto')}</option>
      <option value="tr">{t('lang.tr')}</option>
      <option value="en">{t('lang.en')}</option>
      <option value="de">Deutsch</option>
      <option value="fr">Français</option>
      <option value="es">Español</option>
      <option value="ru">Русский</option>
      <option value="ar">العربية</option>
    </select>
  )
}

