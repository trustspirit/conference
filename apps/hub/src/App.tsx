import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'trust-ui-react'
import { changeLanguage, getCurrentLanguage } from './i18n'

interface ServiceDef {
  nameKey: string
  descKey: string
  url: string
  icon: React.ReactNode
  color: string
}

const serviceDefs: ServiceDef[] = [
  {
    nameKey: 'service.checkin',
    descKey: 'service.checkinDesc',
    url: import.meta.env.VITE_CHECKIN_URL || '#',
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    color: '#1877F2'
  },
  {
    nameKey: 'service.registration',
    descKey: 'service.registrationDesc',
    url: import.meta.env.VITE_REGISTRATION_URL || '#',
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
        />
      </svg>
    ),
    color: '#42B72A'
  },
  {
    nameKey: 'service.finance',
    descKey: 'service.financeDesc',
    url: import.meta.env.VITE_FINANCE_URL || '#',
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    color: '#F5A623'
  },
  {
    nameKey: 'service.apply',
    descKey: 'service.applyDesc',
    url: import.meta.env.VITE_APPLY_URL || '#',
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
    ),
    color: '#8B5CF6'
  }
]

function ServiceCard({ service, t }: { service: ServiceDef; t: (key: string) => string }) {
  return (
    <a
      href={service.url}
      className="group block bg-white rounded-2xl shadow-sm border border-[#DADDE1] hover:shadow-lg hover:border-transparent transition-all duration-200 overflow-hidden"
    >
      <div className="p-8">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-transform duration-200 group-hover:scale-110"
          style={{ backgroundColor: `${service.color}15`, color: service.color }}
        >
          {service.icon}
        </div>
        <h2 className="text-xl font-bold text-[#1C1E21] mb-2">{t(service.nameKey)}</h2>
        <p className="text-[#65676B] text-sm leading-relaxed">{t(service.descKey)}</p>
      </div>
      <div
        className="h-1 w-0 group-hover:w-full transition-all duration-300"
        style={{ backgroundColor: service.color }}
      />
    </a>
  )
}

function App(): React.ReactElement {
  const { t } = useTranslation()
  const currentLang = getCurrentLanguage()

  const toggleLanguage = () => {
    changeLanguage(currentLang === 'ko' ? 'en' : 'ko')
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <nav className="bg-white shadow-sm px-6 h-14 flex items-center justify-between sticky top-0 z-50">
        <h1 className="text-[28px] font-bold text-[#1877F2] tracking-tighter">conference</h1>
        <Button variant="secondary" size="sm" onClick={toggleLanguage}>
          {currentLang === 'ko' ? 'EN' : '한국어'}
        </Button>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#1C1E21] mb-3">{t('hub.title')}</h2>
          <p className="text-[#65676B] text-lg">{t('hub.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {serviceDefs.map((service) => (
            <ServiceCard key={service.nameKey} service={service} t={t} />
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
