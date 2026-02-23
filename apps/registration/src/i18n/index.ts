import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ko from './locales/ko.json'

const savedLanguage = localStorage.getItem('language') || 'ko'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ko: { translation: ko }
  },
  lng: savedLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
})

export const changeLanguage = (lang: string) => {
  localStorage.setItem('language', lang)
  i18n.changeLanguage(lang)
}

export const getCurrentLanguage = () => i18n.language

export default i18n
