import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import resourcesToBackend from 'i18next-resources-to-backend'

const savedLanguage = localStorage.getItem('language') || 'ko'

i18n
  .use(resourcesToBackend((language: string) =>
    import(`./locales/${language}.json`)
  ))
  .use(initReactI18next)
  .init({
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
