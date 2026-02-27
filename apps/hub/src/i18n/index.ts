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

export default i18n

export const changeLanguage = (lang: string): void => {
  i18n.changeLanguage(lang)
  localStorage.setItem('language', lang)
}

export const getCurrentLanguage = (): string => {
  return i18n.language
}
