import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Conference } from '../types'
import { useConferences } from '../hooks/queries/useConferences'
import { useAuth } from './AuthContext'
import { isAdminRole } from '../lib/roles'

interface ConferenceContextType {
  currentConference: Conference | null
  conferences: Conference[]
  loading: boolean
  setCurrentConference: (conference: Conference | null) => void
}

const ConferenceContext = createContext<ConferenceContextType>({
  currentConference: null,
  conferences: [],
  loading: true,
  setCurrentConference: () => {},
})

const STORAGE_KEY = 'apply-selected-conference-id'

const ALL_CONFERENCES_VALUE = '__all__'

export function ConferenceProvider({ children }: { children: ReactNode }) {
  const { data: conferences = [], isLoading } = useConferences()
  const { appUser } = useAuth()
  const [currentConference, setCurrentConferenceState] = useState<Conference | null>(null)
  const isAdmin = isAdminRole(appUser?.role)

  useEffect(() => {
    if (isLoading || conferences.length === 0) {
      if (!isLoading && conferences.length === 0) {
        setCurrentConferenceState(null)
      }
      return
    }

    const storedId = localStorage.getItem(STORAGE_KEY)

    // Admin defaults to all conferences (null) unless a specific conference was stored
    if (isAdmin) {
      if (storedId === ALL_CONFERENCES_VALUE) {
        setCurrentConferenceState(null)
        return
      }
      const found = storedId ? conferences.find((c) => c.id === storedId) : null
      if (found) {
        setCurrentConferenceState(found)
      } else {
        // Default: admin sees all conferences
        setCurrentConferenceState(null)
        localStorage.setItem(STORAGE_KEY, ALL_CONFERENCES_VALUE)
      }
      return
    }

    const found = storedId ? conferences.find((c) => c.id === storedId) : null
    if (found) {
      setCurrentConferenceState(found)
    } else {
      setCurrentConferenceState(conferences[0])
      localStorage.setItem(STORAGE_KEY, conferences[0].id)
    }
  }, [conferences, isLoading, isAdmin])

  const setCurrentConference = (conference: Conference | null) => {
    setCurrentConferenceState(conference)
    localStorage.setItem(STORAGE_KEY, conference ? conference.id : ALL_CONFERENCES_VALUE)
  }

  return (
    <ConferenceContext.Provider value={{ currentConference, conferences, loading: isLoading, setCurrentConference }}>
      {children}
    </ConferenceContext.Provider>
  )
}

export function useConference() {
  return useContext(ConferenceContext)
}
