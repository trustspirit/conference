import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { TextField, Button } from 'trust-ui-react'
import { useConference } from '../contexts/ConferenceContext'
import { useAuth } from '../contexts/AuthContext'
import { isAdminRole } from '../lib/roles'
import { useCreateConference } from '../hooks/queries/useConferences'
import { queryKeys } from '../hooks/queries/queryKeys'
import { ChevronDownIcon, CloseIcon } from './Icons'
import { isConferenceClosed } from '../lib/conference'
import type { Conference } from '../types'

export default function ConferenceSelector() {
  const { t } = useTranslation()
  const { currentConference, conferences, setCurrentConference } = useConference()
  const { appUser } = useAuth()
  const queryClient = useQueryClient()
  const createConference = useCreateConference()
  const isAdmin = isAdminRole(appUser?.role)

  const [open, setOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newDeadline, setNewDeadline] = useState('')
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const hasConferences = conferences.length > 0

  // Position the dropdown below the trigger button using fixed positioning
  const updateDropdownPos = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 4, left: rect.left })
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close modal on Escape
  useEffect(() => {
    if (!showCreateModal) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCreateModal(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showCreateModal])

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return
    try {
      await createConference.mutateAsync({
        name: newName.trim(),
        description: newDesc.trim(),
        deadline: newDeadline || null,
        createdBy: appUser?.uid || '',
      })
      await queryClient.refetchQueries({ queryKey: queryKeys.conferences.all() })
      setNewName('')
      setNewDesc('')
      setNewDeadline('')
      setShowCreateModal(false)
    } catch {
      // error handled by mutation
    }
  }, [newName, newDesc, appUser, createConference, queryClient])

  const handleSelect = (conference: Conference) => {
    setCurrentConference(conference)
    setOpen(false)
  }

  const handleTriggerClick = () => {
    // No conferences → directly open create modal
    if (!hasConferences && isAdmin) {
      setShowCreateModal(true)
      return
    }
    updateDropdownPos()
    setOpen(!open)
  }

  // Non-admin with 0 or 1 conference: hide selector
  if (!isAdmin && conferences.length <= 1) return null

  // Determine trigger label
  const triggerLabel = hasConferences
    ? (currentConference?.name || t('conference.select', '대회 선택'))
    : t('conference.create', '+ 새 대회 생성')

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleTriggerClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors max-w-[200px] shrink-0 ${
          hasConferences
            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
        }`}
      >
        <span className="truncate">{triggerLabel}</span>
        {hasConferences && (
          <ChevronDownIcon className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown - fixed position to avoid navbar clipping */}
      {open && hasConferences && (
        <div
          ref={dropdownRef}
          className="fixed w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[100]"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          {/* Conference list */}
          {conferences.map((conference) => (
            <button
              key={conference.id}
              onClick={() => handleSelect(conference)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                currentConference?.id === conference.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>{conference.name}</span>
                {isConferenceClosed(conference) && (
                  <span className="text-[0.625rem] text-red-500 font-medium">{t('conference.closed', '마감됨')}</span>
                )}
              </div>
              {conference.deadline && (
                <p className={`text-xs truncate ${isConferenceClosed(conference) ? 'text-red-400' : 'text-gray-400'}`}>
                  {t('admin.settings.conference.deadlineLabel', '마감')}: {conference.deadline.toLocaleDateString()}
                </p>
              )}
            </button>
          ))}

          {/* Admin: Create button */}
          {isAdmin && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => {
                  setOpen(false)
                  setShowCreateModal(true)
                }}
                className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
              >
                + {t('admin.settings.conference.create', '대회 생성')}
              </button>
            </>
          )}
        </div>
      )}

      {/* Create Conference Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateModal(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('admin.settings.conference.create', '대회 생성')}
            className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{t('admin.settings.conference.create', '대회 생성')}</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
              >
                <CloseIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              <TextField
                label={t('admin.settings.conference.name', '대회명')}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('admin.settings.conference.namePlaceholder', '예: 2026 청소년 대회')}
                fullWidth
                autoFocus
              />
              <TextField
                label={t('admin.settings.conference.desc', '대회 설명')}
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder={t('admin.settings.conference.descPlaceholder', '예: 서울 스테이크 청소년 대회')}
                fullWidth
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.settings.conference.deadline', '신청 마감일')}
                </label>
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                {t('common.cancel', '취소')}
              </Button>
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={!newName.trim() || createConference.isPending}
              >
                {createConference.isPending
                  ? t('common.saving', '저장 중...')
                  : t('admin.settings.conference.create', '생성')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
