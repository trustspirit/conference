import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  searchParticipants,
  checkInParticipant,
  checkOutParticipant,
  updateParticipant
} from '../services/firebase'
import { writeAuditLog } from '../services/auditLog'
import { userNameAtom } from '../stores/userStore'
import { addToastAtom } from '../stores/toastStore'
import type { Participant } from '../types'
import { CheckInStatus } from '../types'
import {
  SearchResultsSkeleton,
  getCheckInStatusFromParticipant,
  QRScannerModal
} from '../components'
import { formatPhoneNumber } from '../utils/phoneFormat'
import { LeaderBadge } from '../components/ui'
import { groupsAtom, roomsAtom } from '../stores/dataStore'

function HomePage(): React.ReactElement {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<Participant[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showResults, setShowResults] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false)
  const navigate = useNavigate()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const userName = useAtomValue(userNameAtom)
  const addToast = useSetAtom(addToastAtom)
  const groups = useAtomValue(groupsAtom)
  const rooms = useAtomValue(roomsAtom)

  const performSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const searchResults = await searchParticipants(term)
      setResults(searchResults)
      setSelectedIndex(-1)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(searchTerm)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchTerm, performSearch])

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && results[selectedIndex]) {
          navigate(`/participant/${results[selectedIndex].id}`)
        }
        break
      case 'Escape':
        setShowResults(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleResultClick = (participant: Participant) => {
    navigate(`/participant/${participant.id}`)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setShowResults(true)
  }

  const handleInputFocus = () => {
    if (searchTerm.trim()) {
      setShowResults(true)
    }
  }

  // Quick check-in/check-out handler
  const handleQuickCheckIn = async (e: React.MouseEvent, participant: Participant) => {
    e.stopPropagation()
    setActionLoadingId(`checkin-${participant.id}`)

    try {
      const status = getCheckInStatusFromParticipant(participant.checkIns)

      if (status === CheckInStatus.CheckedIn) {
        // Check out
        const activeCheckIn = participant.checkIns.find((ci) => !ci.checkOutTime)
        if (activeCheckIn) {
          await checkOutParticipant(participant.id, activeCheckIn.id)
          await writeAuditLog(
            userName || 'Unknown',
            'check_out',
            'participant',
            participant.id,
            participant.name
          )
          addToast({ type: 'success', message: t('toast.checkOutSuccess') })
        }
      } else {
        // Check in
        await checkInParticipant(participant.id)
        await writeAuditLog(
          userName || 'Unknown',
          'check_in',
          'participant',
          participant.id,
          participant.name
        )
        addToast({ type: 'success', message: t('toast.checkInSuccess') })
      }

      // Refresh search results
      await performSearch(searchTerm)
    } catch (error) {
      console.error('Check-in/out error:', error)
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : t('toast.actionFailed')
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  // Quick payment status toggle handler
  const handleQuickPaymentToggle = async (e: React.MouseEvent, participant: Participant) => {
    e.stopPropagation()
    setActionLoadingId(`payment-${participant.id}`)

    try {
      const newPaidStatus = !participant.isPaid
      await updateParticipant(participant.id, { isPaid: newPaidStatus })
      await writeAuditLog(
        userName || 'Unknown',
        'update',
        'participant',
        participant.id,
        participant.name,
        { isPaid: { from: participant.isPaid, to: newPaidStatus } }
      )
      addToast({
        type: 'success',
        message: newPaidStatus ? t('toast.markedAsPaid') : t('toast.markedAsUnpaid')
      })

      // Refresh search results
      await performSearch(searchTerm)
    } catch (error) {
      console.error('Payment toggle error:', error)
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : t('toast.actionFailed')
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        !searchInputRef.current?.contains(event.target as Node)
      ) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="max-w-xl mx-auto pt-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#050505] mb-2 tracking-tight">{t('home.title')}</h1>
        <p className="text-[#65676B]">{t('home.subtitle')}</p>
      </div>

      <div className="relative">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            className="w-full px-5 py-3 text-lg border-none rounded-full outline-none transition-all shadow-sm bg-white focus:ring-2 focus:ring-[#1877F2]"
            placeholder={t('home.searchPlaceholder')}
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#65676B]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </div>
        </div>

        {showResults && (searchTerm.trim() || isLoading) && (
          <div
            ref={resultsRef}
            className="absolute top-full left-0 right-0 bg-white rounded-lg shadow-lg mt-2 max-h-96 overflow-y-auto z-50 border border-[#DADDE1]"
          >
            {isLoading ? (
              <SearchResultsSkeleton count={3} />
            ) : results.length > 0 ? (
              results.map((participant, index) => {
                const checkInStatus = getCheckInStatusFromParticipant(participant.checkIns)
                const isCheckedIn = checkInStatus === CheckInStatus.CheckedIn
                const isCheckInLoading = actionLoadingId === `checkin-${participant.id}`
                const isPaymentLoading = actionLoadingId === `payment-${participant.id}`

                return (
                  <div
                    key={participant.id}
                    className={`px-4 py-3 cursor-pointer border-b border-[#F0F2F5] last:border-b-0 transition-colors ${
                      index === selectedIndex ? 'bg-[#F0F2F5]' : 'hover:bg-[#F0F2F5]'
                    }`}
                    onClick={() => handleResultClick(participant)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-semibold text-[#050505] truncate">
                          {participant.name}
                        </span>
                        {participant.ward && (
                          <span className="text-sm text-[#65676B] truncate hidden sm:inline">
                            {participant.ward}
                          </span>
                        )}
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Payment Toggle Button */}
                        <button
                          onClick={(e) => handleQuickPaymentToggle(e, participant)}
                          disabled={isPaymentLoading}
                          className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            participant.isPaid
                              ? 'bg-[#EFFFF6] text-[#31A24C] hover:bg-[#D4F5DF]'
                              : 'bg-[#FFEBEE] text-[#FA383E] hover:bg-[#FFD5D8]'
                          } ${isPaymentLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={
                            participant.isPaid
                              ? t('participant.markAsUnpaid')
                              : t('participant.markAsPaid')
                          }
                        >
                          {isPaymentLoading ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                          ) : participant.isPaid ? (
                            t('participant.paid')
                          ) : (
                            t('participant.unpaid')
                          )}
                        </button>

                        {/* Check In/Out Button */}
                        <button
                          onClick={(e) => handleQuickCheckIn(e, participant)}
                          disabled={isCheckInLoading}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all min-w-[90px] ${
                            isCheckedIn
                              ? 'bg-[#F0F2F5] text-[#65676B] hover:bg-[#E4E6EB]'
                              : 'bg-[#1877F2] text-white hover:bg-[#166FE5]'
                          } ${isCheckInLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isCheckInLoading ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <svg
                                className="w-3.5 h-3.5 animate-spin"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                              </svg>
                            </div>
                          ) : isCheckedIn ? (
                            t('participant.checkOut')
                          ) : (
                            t('participant.checkIn')
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="text-sm text-[#65676B] mt-1.5">
                      {participant.email}
                      {participant.phoneNumber &&
                        ` • ${formatPhoneNumber(participant.phoneNumber)}`}
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {participant.groupName && participant.groupId && (
                        <>
                          <span className="px-2 py-0.5 bg-[#E7F3FF] text-[#1877F2] rounded text-xs font-semibold">
                            {participant.groupName}
                          </span>
                          {groups.find((g) => g.id === participant.groupId)?.leaderId ===
                            participant.id && <LeaderBadge type="group" size="sm" />}
                        </>
                      )}
                      {participant.roomNumber && participant.roomId && (
                        <>
                          <span className="px-2 py-0.5 bg-[#F0F2F5] text-[#65676B] rounded text-xs font-semibold">
                            {t('participant.room')} {participant.roomNumber}
                          </span>
                          {rooms.find((r) => r.id === participant.roomId)?.leaderId ===
                            participant.id && <LeaderBadge type="room" size="sm" />}
                        </>
                      )}
                      {isCheckedIn && (
                        <span className="px-2 py-0.5 bg-[#EFFFF6] text-[#31A24C] rounded text-xs font-semibold">
                          ✓ {t('participant.checkedIn')}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="px-5 py-4">
                <div className="text-[#65676B] text-center">{t('home.noResults')}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* QR 스캔 버튼 */}
      <div className="flex items-center justify-center mt-6">
        <div className="flex items-center gap-3 text-[#65676B]">
          <div className="h-px w-16 bg-[#DADDE1]" />
          <span className="text-sm">{t('qr.or')}</span>
          <div className="h-px w-16 bg-[#DADDE1]" />
        </div>
      </div>

      <div className="flex justify-center mt-4">
        <button
          onClick={() => setIsQRScannerOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-[#DADDE1] rounded-full text-[#050505] font-medium hover:bg-[#F0F2F5] hover:border-[#1877F2] transition-all shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
          {t('qr.scanButton')}
        </button>
      </div>

      {/* QR Scanner Modal */}
      <QRScannerModal isOpen={isQRScannerOpen} onClose={() => setIsQRScannerOpen(false)} />
    </div>
  )
}

export default HomePage
