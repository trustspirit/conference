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
  const ref = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
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
        createdBy: appUser?.uid || '',
      })
      await queryClient.refetchQueries({ queryKey: queryKeys.conferences.all() })
      setNewName('')
      setNewDesc('')
      setShowCreateModal(false)
    } catch {
      // error handled by mutation
    }
  }, [newName, newDesc, appUser, createConference, queryClient])

  const handleSelect = (conference: Conference | null) => {
    setCurrentConference(conference)
    setOpen(false)
  }

  // Admin always sees selector; non-admin only if multiple conferences
  if (conferences.length === 0 && !isAdmin) return null
  if (conferences.length <= 1 && !isAdmin) return null

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors max-w-[200px]"
        >
          <span className="truncate">
            {currentConference?.name || t('conference.all', '전체 대회')}
          </span>
          <ChevronDownIcon className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {/* Admin: "All conferences" option */}
            {isAdmin && (
              <button
                onClick={() => handleSelect(null)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  currentConference === null ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
              >
                {t('conference.all', '전체 대회')}
              </button>
            )}

            {/* Conference list */}
            {conferences.map((conference) => (
              <button
                key={conference.id}
                onClick={() => handleSelect(conference)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  currentConference?.id === conference.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
              >
                <span>{conference.name}</span>
                {conference.description && (
                  <p className="text-xs text-gray-400 truncate">{conference.description}</p>
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
      </div>

      {/* Create Conference Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
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
