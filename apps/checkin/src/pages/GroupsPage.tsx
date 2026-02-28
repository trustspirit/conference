import React, { useState, useEffect, useRef } from 'react'
import { useToast } from 'trust-ui-react'
import { useNavigate } from 'react-router-dom'
import { useAtomValue, useSetAtom } from 'jotai'
import { useTranslation } from 'react-i18next'
import { participantsAtom, syncAtom } from '../stores/dataStore'
import {
  createOrGetGroup,
  deleteGroup,
  getGroupsPaginated,
  subscribeToGroups,
  updateGroup
} from '../services/firebase'
import { readFileAsText } from '../utils/fileReader'
import { useGroupFilter, useBatchedInfiniteScrollWithRealtime } from '../hooks'
import type { Group } from '../types'
import { ViewMode, CapacityStatus } from '../types'
import {
  ViewModeToggle,
  StatusDot,
  getCapacityStatus,
  ImportCSVPanel,
  GroupFilterBar,
  AddGroupForm,
  PrintableGroupRoster,
  GroupHoverContent
} from '../components'
import { HoverCard } from '../components/ui'

function GroupsPage(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const participants = useAtomValue(participantsAtom)
  const sync = useSetAtom(syncAtom)
  const { toast } = useToast()

  // Batched infinite scroll pagination with realtime sync
  const {
    displayedItems: paginatedGroups,
    isLoading,
    hasMore,
    loadMore,
    refresh
  } = useBatchedInfiniteScrollWithRealtime<Group>({
    fetchBatchSize: 1000,
    displayBatchSize: 100,
    fetchFunction: getGroupsPaginated,
    getItemId: (group) => group.id,
    subscribeFunction: subscribeToGroups
  })

  // Use the filter hook with paginated data
  const groupFilter = useGroupFilter({ data: paginatedGroups })
  const { filteredAndSortedGroups, totalCount, clearFilters, getTagLabel, getTagColor } =
    groupFilter

  // Local UI state
  const [isAdding, setIsAdding] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupCapacity, setNewGroupCapacity] = useState('')
  const [newGroupTags, setNewGroupTags] = useState<string[]>([])
  const [customTagInput, setCustomTagInput] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [csvInput, setCsvInput] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.List)

  // Intersection Observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const presetTags = ['male', 'female']

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoading) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    observerRef.current.observe(loadMoreRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, isLoading, loadMore])

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return
    try {
      const capacity = newGroupCapacity.trim() ? parseInt(newGroupCapacity.trim(), 10) : undefined
      const group = await createOrGetGroup({
        name: newGroupName.trim(),
        expectedCapacity: capacity,
        tags: newGroupTags.length > 0 ? newGroupTags : undefined
      })
      toast({ variant: 'success', message: t('group.groupCreated', { name: group.name }) })
      setNewGroupName('')
      setNewGroupCapacity('')
      setNewGroupTags([])
      setCustomTagInput('')
      setIsAdding(false)
      refresh()
      sync()
    } catch {
      toast({ variant: 'danger', message: t('toast.createFailed') })
    }
  }

  const togglePresetTag = (tag: string) => {
    setNewGroupTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const addCustomTag = () => {
    const tag = customTagInput.trim().toLowerCase()
    if (tag && !newGroupTags.includes(tag)) {
      setNewGroupTags((prev) => [...prev, tag])
      setCustomTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setNewGroupTags((prev) => prev.filter((t) => t !== tag))
  }

  const handleDeleteGroup = async (group: Group) => {
    if (!confirm(t('group.confirmDelete', { name: group.name }))) return
    try {
      await deleteGroup(group.id)
      toast({ variant: 'success', message: t('group.groupDeleted', { name: group.name }) })
      refresh()
      sync()
    } catch {
      toast({ variant: 'danger', message: t('toast.deleteFailed') })
    }
  }

  const parseTagsFromString = (tagString: string): string[] => {
    if (!tagString.trim()) return []
    return tagString
      .split(/[;|]/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
  }

  const handleImportCSV = async () => {
    if (!csvInput.trim()) return
    const lines = csvInput
      .trim()
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    let created = 0

    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim())
      const name = parts[0]
      const tags = parts[1] ? parseTagsFromString(parts[1]) : undefined
      if (!name) continue
      try {
        const group = await createOrGetGroup({ name, tags })
        created++
      } catch {
        console.error(`Failed to create group: ${name}`)
      }
    }

    toast({ variant: 'success', message: t('group.importedCount', { count: created }) })
    setCsvInput('')
    setIsImporting(false)
    refresh()
    sync()
  }

  const handleFileImport = async () => {
    const content = await readFileAsText('.csv')
    if (!content) return

    const lines = content
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    const hasHeader =
      lines[0]?.toLowerCase().includes('name') || lines[0]?.toLowerCase().includes('group')
    const dataLines = hasHeader ? lines.slice(1) : lines
    let created = 0

    for (const line of dataLines) {
      const parts = line.split(',').map((p) => p.trim())
      const name = parts[0]
      const tags = parts[1] ? parseTagsFromString(parts[1]) : undefined
      if (!name) continue
      try {
        const group = await createOrGetGroup({ name, tags })
        created++
      } catch {
        console.error(`Failed to create group: ${name}`)
      }
    }

    toast({ variant: 'success', message: t('group.importedFromCSV', { count: created }) })
    refresh()
    sync()
  }

  const getGroupParticipants = (groupId: string) => {
    return participants.filter((p) => p.groupId === groupId)
  }

  const handleSetGroupLeader = async (
    group: Group,
    participantId: string | null,
    participantName: string | null
  ) => {
    try {
      await updateGroup(group.id, {
        leaderId: participantId,
        leaderName: participantName
      })
      toast({
        variant: 'success',
        message: participantId ? t('group.leaderSet') : t('group.leaderRemoved')
      })
      refresh()
      sync()
    } catch (error) {
      console.error('Failed to set group leader:', error)
      toast({ variant: 'danger', message: t('toast.updateFailed') })
    }
  }

  const renderGroupHoverContent = (group: Group) => {
    const groupParticipants = getGroupParticipants(group.id)
    return (
      <GroupHoverContent
        group={group}
        participants={groupParticipants}
        onSetLeader={handleSetGroupLeader}
        formatCapacity={formatCapacity}
      />
    )
  }

  const getStatusLabel = (status: CapacityStatus): string => {
    switch (status) {
      case CapacityStatus.Full:
        return t('room.full')
      case CapacityStatus.AlmostFull:
        return t('room.almostFull')
      case CapacityStatus.Available:
        return t('room.available')
      case CapacityStatus.NoLimit:
        return t('common.noLimit')
      default:
        return t('participant.unknown')
    }
  }

  const formatCapacity = (count: number, expectedCapacity?: number) => {
    if (expectedCapacity) {
      return `${count} / ${expectedCapacity}`
    }
    return `${count}`
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#050505]">{t('group.title')}</h1>
          <p className="text-[#65676B] mt-1">{t('group.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          <PrintableGroupRoster groups={paginatedGroups} participants={participants} />
          <button
            onClick={() => setIsImporting(!isImporting)}
            className="px-4 py-2 border border-[#DADDE1] text-[#65676B] rounded-lg text-sm font-semibold hover:bg-[#F0F2F5] transition-colors"
          >
            {t('nav.importCSV')}
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 bg-[#1877F2] text-white rounded-lg text-sm font-semibold hover:bg-[#166FE5] transition-colors"
          >
            {t('group.addGroup')}
          </button>
        </div>
      </div>

      {/* Import CSV Panel */}
      {isImporting && (
        <ImportCSVPanel
          title={t('group.importGroups')}
          placeholder={t('group.importPlaceholder')}
          helpText={t('group.importHelpText')}
          csvInput={csvInput}
          onCsvInputChange={setCsvInput}
          onFileSelect={handleFileImport}
          onImport={handleImportCSV}
          onCancel={() => {
            setIsImporting(false)
            setCsvInput('')
          }}
        />
      )}

      {/* Add Group Form */}
      {isAdding && (
        <AddGroupForm
          newGroupName={newGroupName}
          onGroupNameChange={setNewGroupName}
          newGroupCapacity={newGroupCapacity}
          onGroupCapacityChange={setNewGroupCapacity}
          newGroupTags={newGroupTags}
          customTagInput={customTagInput}
          onCustomTagInputChange={setCustomTagInput}
          presetTags={presetTags}
          onTogglePresetTag={togglePresetTag}
          onAddCustomTag={addCustomTag}
          onRemoveTag={removeTag}
          getTagLabel={getTagLabel}
          getTagColor={getTagColor}
          onSubmit={handleAddGroup}
          onCancel={() => {
            setIsAdding(false)
            setNewGroupName('')
            setNewGroupCapacity('')
            setNewGroupTags([])
            setCustomTagInput('')
          }}
        />
      )}

      {/* Filter and Sort Controls */}
      {totalCount > 0 && <GroupFilterBar filter={groupFilter} />}

      {/* Loading State */}
      {isLoading && totalCount === 0 && (
        <div className="bg-white rounded-lg border border-[#DADDE1] p-12 text-center">
          <div className="text-[#65676B] text-lg">{t('common.loading')}</div>
        </div>
      )}

      {/* Content */}
      {!isLoading && totalCount === 0 ? (
        <div className="bg-white rounded-lg border border-[#DADDE1] p-12 text-center">
          <div className="text-[#65676B] text-lg">{t('group.noGroups')}</div>
          <p className="text-[#65676B] mt-2 text-sm">{t('group.noGroupsDesc')}</p>
        </div>
      ) : filteredAndSortedGroups.length === 0 && totalCount > 0 ? (
        <div className="bg-white rounded-lg border border-[#DADDE1] p-12 text-center">
          <div className="text-[#65676B] text-lg">{t('group.noGroupsFiltered')}</div>
          <button
            onClick={clearFilters}
            className="mt-2 text-[#1877F2] hover:underline font-semibold"
          >
            {t('common.clearFilters')}
          </button>
        </div>
      ) : viewMode === ViewMode.List ? (
        /* List View */
        <div className="bg-white rounded-lg border border-[#DADDE1] overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F0F2F5] border-b border-[#DADDE1] rounded-t-lg">
              <tr>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#65676B] font-semibold rounded-tl-lg">
                  {t('common.name')}
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#65676B] font-semibold">
                  {t('group.tags')}
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#65676B] font-semibold">
                  {t('common.members')}
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-[#65676B] font-semibold">
                  {t('common.status')}
                </th>
                <th className="text-right px-4 py-3 text-xs uppercase tracking-wide text-[#65676B] font-semibold rounded-tr-lg">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedGroups.map((group) => {
                const status = getCapacityStatus(group.participantCount, group.expectedCapacity)
                return (
                  <HoverCard key={group.id} content={renderGroupHoverContent(group)}>
                    <tr
                      className="border-b border-[#DADDE1] last:border-b-0 hover:bg-[#F7F8FA] cursor-pointer relative"
                      onClick={() => navigate(`/groups/${group.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-[#050505]">
                        <div className="flex items-center gap-2">
                          {group.name}
                          {group.leaderId && <span className="text-purple-500">⭐</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {group.tags?.map((tag) => (
                            <span
                              key={tag}
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getTagColor(tag)}`}
                            >
                              {getTagLabel(tag)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#65676B]">
                        {formatCapacity(group.participantCount, group.expectedCapacity)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusDot status={status} />
                          <span className="text-sm text-[#65676B]">{getStatusLabel(status)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteGroup(group)
                          }}
                          className="text-[#FA383E] hover:underline text-sm font-semibold"
                        >
                          {t('common.delete')}
                        </button>
                      </td>
                    </tr>
                  </HoverCard>
                )
              })}
            </tbody>
          </table>

          {/* Load More Indicator */}
          {hasMore && (
            <div ref={loadMoreRef} className="px-6 py-4 text-center text-sm text-[#65676B]">
              {isLoading ? t('common.loading') : t('common.scrollForMore')}
            </div>
          )}

          {!hasMore && filteredAndSortedGroups.length > 0 && (
            <div className="px-6 py-4 text-center text-sm text-[#65676B]">
              {t('common.allLoaded')}
            </div>
          )}
        </div>
      ) : (
        /* Card View */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAndSortedGroups.map((group) => {
            const status = getCapacityStatus(group.participantCount, group.expectedCapacity)
            return (
              <HoverCard key={group.id} content={renderGroupHoverContent(group)}>
                <div
                  className="relative bg-white rounded-lg border border-[#DADDE1] p-4 hover:shadow-md hover:border-[#1877F2] transition-all cursor-pointer"
                  onClick={() => navigate(`/groups/${group.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#050505] text-lg">{group.name}</h3>
                        {group.leaderId && <span className="text-purple-500">⭐</span>}
                      </div>
                      <p className="text-sm text-[#65676B]">
                        {formatCapacity(group.participantCount, group.expectedCapacity)}{' '}
                        {t('common.members')}
                      </p>
                    </div>
                    <StatusDot status={status} size="md" />
                  </div>

                  {group.leaderName && (
                    <div className="flex items-center gap-1 mb-2 text-sm text-purple-700 bg-purple-50 px-2 py-1 rounded">
                      <span>⭐</span>
                      <span className="font-medium">{group.leaderName}</span>
                    </div>
                  )}

                  {group.tags && group.tags.length > 0 && (
                    <div className="flex gap-1 mb-2 flex-wrap">
                      {group.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTagColor(tag)}`}
                        >
                          {getTagLabel(tag)}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-[#F0F2F5] text-[#65676B]">
                      {group.expectedCapacity
                        ? `${group.participantCount} / ${group.expectedCapacity}`
                        : `${group.participantCount} ${t('common.members')}`}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteGroup(group)
                      }}
                      className="text-[#FA383E] hover:underline text-xs font-semibold"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              </HoverCard>
            )
          })}

          {/* Load More Card */}
          {hasMore && (
            <div ref={loadMoreRef} className="flex items-center justify-center p-8">
              <div className="text-sm text-[#65676B]">
                {isLoading ? t('common.loading') : t('common.scrollForMore')}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default GroupsPage
