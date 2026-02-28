import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Conference } from '../types'
import { useConferences } from '../hooks/queries/useConferences'

interface ConferenceContextType {
  currentConference: Conference | null
  conferences: Conference[]
  loading: boolean
  setCurrentConference: (conference: Conference) => void
}

const ConferenceContext = createContext<ConferenceContextType>({
  currentConference: null,
  conferences: [],
  loading: true,
  setCurrentConference: () => {},
})

const STORAGE_KEY = 'apply-selected-conference-id'

export function ConferenceProvider({ children }: { children: ReactNode }) {
  const { data: conferences = [], isLoading } = useConferences()
  const [currentConference, setCurrentConferenceState] = useState<Conference | null>(null)

  useEffect(() => {
    if (isLoading || conferences.length === 0) {
      if (!isLoading && conferences.length === 0) {
        setCurrentConferenceState(null)
      }
      return
    }

    const storedId = localStorage.getItem(STORAGE_KEY)
    const found = storedId ? conferences.find((c) => c.id === storedId) : null
    if (found) {
      setCurrentConferenceState(found)
    } else {
      setCurrentConferenceState(conferences[0])
      localStorage.setItem(STORAGE_KEY, conferences[0].id)
    }
  }, [conferences, isLoading])

  const setCurrentConference = (conference: Conference) => {
    setCurrentConferenceState(conference)
    localStorage.setItem(STORAGE_KEY, conference.id)
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
