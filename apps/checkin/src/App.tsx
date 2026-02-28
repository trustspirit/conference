import React, { useState, useEffect, useRef } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { useAtomValue, useSetAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import HomePage from './pages/HomePage'
import ParticipantDetailPage from './pages/ParticipantDetailPage'
import ParticipantsListPage from './pages/ParticipantsListPage'
import ImportPage from './pages/ImportPage'
import SettingsPage from './pages/SettingsPage'
import GroupsPage from './pages/GroupsPage'
import RoomsPage from './pages/RoomsPage'
import RoomDetailPage from './pages/RoomDetailPage'
import GroupDetailPage from './pages/GroupDetailPage'
import StatisticsPage from './pages/StatisticsPage'
import BusesPage from './pages/BusesPage'
import BusDetailPage from './pages/BusDetailPage'
import SchedulePage from './pages/SchedulePage'
import AdminManagePage from './pages/AdminManagePage'
import AddParticipantModal from './components/AddParticipantModal'
import {
  isSyncingAtom,
  lastSyncTimeAtom,
  syncAtom,
  setupRealtimeListenersAtom,
  cleanupListenersAtom
} from './stores/dataStore'
import { userNameAtom } from './stores/userStore'
import { userRoleAtom } from './stores/authStore'

function App(): React.ReactElement {
  const { t } = useTranslation()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isManageMenuOpen, setIsManageMenuOpen] = useState(false)
  const [isFabVisible, setIsFabVisible] = useState(true)
  const [isFabExpanded, setIsFabExpanded] = useState(false)
  const manageMenuRef = useRef<HTMLDivElement>(null)
  const lastScrollY = useRef(0)
  const isSyncing = useAtomValue(isSyncingAtom)
  const lastSyncTime = useAtomValue(lastSyncTimeAtom)
  const sync = useSetAtom(syncAtom)
  const setupRealtimeListeners = useSetAtom(setupRealtimeListenersAtom)
  const cleanupListeners = useSetAtom(cleanupListenersAtom)
  const userName = useAtomValue(userNameAtom)
  const userRole = useAtomValue(userRoleAtom)

  useEffect(() => {
    setupRealtimeListeners()
    return () => cleanupListeners()
  }, [setupRealtimeListeners, cleanupListeners])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (manageMenuRef.current && !manageMenuRef.current.contains(e.target as Node)) {
        setIsManageMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Hide FAB on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const isScrollingDown = currentScrollY > lastScrollY.current && currentScrollY > 100

      setIsFabVisible(!isScrollingDown)
      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-[#F0F2F5]">
      <nav className="bg-white shadow-sm px-4 h-14 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <NavLink
            to="/"
            className="text-[28px] font-bold text-[#1877F2] tracking-tighter ml-2 hover:opacity-90 transition-opacity"
          >
            checkin
          </NavLink>
          <div className="flex h-14 ml-4">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `relative px-4 flex items-center font-medium text-[15px] transition-colors duration-200 ${
                  isActive
                    ? 'text-[#1877F2]'
                    : 'text-[#65676B] hover:bg-[#F2F2F2] rounded-lg mx-0.5'
                } ${isActive ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-[#1877F2] after:rounded-t-sm' : ''}`
              }
            >
              {t('nav.search')}
            </NavLink>
            <NavLink
              to="/participants"
              className={({ isActive }) =>
                `relative px-4 flex items-center font-medium text-[15px] transition-colors duration-200 ${
                  isActive
                    ? 'text-[#1877F2]'
                    : 'text-[#65676B] hover:bg-[#F2F2F2] rounded-lg mx-0.5'
                } ${isActive ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-[#1877F2] after:rounded-t-sm' : ''}`
              }
            >
              {t('nav.participants')}
            </NavLink>
            <NavLink
              to="/groups"
              className={({ isActive }) =>
                `relative px-4 flex items-center font-medium text-[15px] transition-colors duration-200 ${
                  isActive
                    ? 'text-[#1877F2]'
                    : 'text-[#65676B] hover:bg-[#F2F2F2] rounded-lg mx-0.5'
                } ${isActive ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-[#1877F2] after:rounded-t-sm' : ''}`
              }
            >
              {t('nav.groups')}
            </NavLink>
            <NavLink
              to="/rooms"
              className={({ isActive }) =>
                `relative px-4 flex items-center font-medium text-[15px] transition-colors duration-200 ${
                  isActive
                    ? 'text-[#1877F2]'
                    : 'text-[#65676B] hover:bg-[#F2F2F2] rounded-lg mx-0.5'
                } ${isActive ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-[#1877F2] after:rounded-t-sm' : ''}`
              }
            >
              {t('nav.rooms')}
            </NavLink>
            <NavLink
              to="/statistics"
              className={({ isActive }) =>
                `relative px-4 flex items-center font-medium text-[15px] transition-colors duration-200 ${
                  isActive
                    ? 'text-[#1877F2]'
                    : 'text-[#65676B] hover:bg-[#F2F2F2] rounded-lg mx-0.5'
                } ${isActive ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-[#1877F2] after:rounded-t-sm' : ''}`
              }
            >
              {t('nav.statistics')}
            </NavLink>
            <NavLink
              to="/buses"
              className={({ isActive }) =>
                `relative px-4 flex items-center font-medium text-[15px] transition-colors duration-200 ${
                  isActive
                    ? 'text-[#1877F2]'
                    : 'text-[#65676B] hover:bg-[#F2F2F2] rounded-lg mx-0.5'
                } ${isActive ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-[#1877F2] after:rounded-t-sm' : ''}`
              }
            >
              {t('nav.buses')}
            </NavLink>
            <NavLink
              to="/schedule"
              className={({ isActive }) =>
                `relative px-4 flex items-center font-medium text-[15px] transition-colors duration-200 ${
                  isActive
                    ? 'text-[#1877F2]'
                    : 'text-[#65676B] hover:bg-[#F2F2F2] rounded-lg mx-0.5'
                } ${isActive ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:bg-[#1877F2] after:rounded-t-sm' : ''}`
              }
            >
              {t('nav.schedule')}
            </NavLink>
            <div className="relative" ref={manageMenuRef}>
              <button
                onClick={() => setIsManageMenuOpen(!isManageMenuOpen)}
                className={`relative px-4 h-14 flex items-center font-medium text-[15px] transition-colors duration-200 text-[#65676B] hover:bg-[#F2F2F2] rounded-lg mx-0.5`}
              >
                {t('nav.more')}
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {isManageMenuOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-[#DADDE1] rounded-lg shadow-lg py-1 min-w-[160px] z-50">
                  {userRole === 'admin' && (
                    <NavLink
                      to="/admin-manage"
                      onClick={() => setIsManageMenuOpen(false)}
                      className="block px-4 py-2 text-[#050505] hover:bg-[#F0F2F5] text-sm font-medium"
                    >
                      {t('nav.adminManage')}
                    </NavLink>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#65676B]">
            <span className="font-medium text-[#050505]">{userName}</span>
          </span>
          <button
            onClick={() => sync(true)}
            disabled={isSyncing}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 ${
              isSyncing
                ? 'bg-[#E7F3FF] text-[#1877F2]'
                : 'bg-[#E4E6EB] hover:bg-[#D8DADF] text-[#050505]'
            }`}
            title={
              isSyncing
                ? 'Syncing...'
                : lastSyncTime
                  ? `Last synced: ${lastSyncTime.toLocaleTimeString()}`
                  : 'Sync data'
            }
          >
            <svg
              className={`w-5 h-5 transition-transform ${isSyncing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `w-10 h-10 flex items-center justify-center rounded-full transition-colors bg-[#E4E6EB] hover:bg-[#D8DADF] ${
                isActive ? 'text-[#1877F2] bg-[#E7F3FF] hover:bg-[#DBE7F2]' : 'text-[#050505]'
              }`
            }
            title={t('nav.settings')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
              className="w-5 h-5"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                className="opacity-20"
              />
              <path d="M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
            </svg>
          </NavLink>
        </div>
      </nav>
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/participant/:id" element={<ParticipantDetailPage />} />
          <Route path="/participants" element={<ParticipantsListPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/:id" element={<GroupDetailPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/rooms/:id" element={<RoomDetailPage />} />
          <Route path="/buses" element={<BusesPage />} />
          <Route path="/buses/:id" element={<BusDetailPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin-manage" element={<AdminManagePage />} />
        </Routes>
      </main>

      {/* Floating Action Button - hides on scroll down, expandable on hover */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        onMouseEnter={() => setIsFabExpanded(true)}
        onMouseLeave={() => setIsFabExpanded(false)}
        className={`fixed bottom-8 right-8 h-12 bg-[#1877F2] text-white rounded-full shadow-lg hover:bg-[#166FE5] hover:shadow-xl flex items-center justify-center z-40 transition-all duration-300 ease-in-out ${
          isFabVisible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-20 opacity-0 pointer-events-none'
        } ${isFabExpanded ? 'pl-4 pr-5' : 'w-12'}`}
        title={t('participant.addParticipant')}
      >
        <svg
          className="w-5 h-5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        {isFabExpanded && (
          <span className="font-medium text-sm whitespace-nowrap ml-2 animate-fade-in">
            {t('participant.addParticipant')}
          </span>
        )}
      </button>

      <AddParticipantModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={sync}
      />

    </div>
  )
}

export default App
