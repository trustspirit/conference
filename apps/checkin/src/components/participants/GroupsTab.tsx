import React, { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Tooltip, ExpandArrow, MemberSelectionTable, MoveToModal } from '../'
import { useGroupsTabLogic } from '../../hooks'
import { useBatchedInfiniteScrollWithRealtime } from '../../hooks/useBatchedInfiniteScrollWithRealtime'
import { getGroupsPaginated, subscribeToGroups } from '../../services/firebase'
import type { Group } from '../../types'

export function GroupsTab() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { displayedItems: groups, isLoading, hasMore, loadMore } =
    useBatchedInfiniteScrollWithRealtime<Group>({
      fetchBatchSize: 1000,
      displayBatchSize: 100,
      fetchFunction: getGroupsPaginated,
      getItemId: (group) => group.id,
      subscribeFunction: (callback) => subscribeToGroups(callback)
    })

  const {
    expandedGroupId,
    toggleGroupExpand,
    selectedGroupMembers,
    setSelectedGroupMembers,
    toggleGroupMemberSelection,
    showMoveToGroupModal,
    isMoving,
    moveError,
    handleMoveToGroup,
    openMoveModal,
    closeMoveModal,
    hoveredGroupId,
    setHoveredGroupId,
    getGroupMembers
  } = useGroupsTabLogic()

  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoading) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { threshold: 0.1 }
    )
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, isLoading, loadMore])

  const navigateToParticipant = (participantId: string) => {
    navigate(`/participant/${participantId}`)
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-[#DADDE1] shadow-sm overflow-visible">
        <div className="overflow-visible">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F0F2F5] border-b border-[#DADDE1]">
                <th className="px-4 py-3 text-left text-sm font-semibold text-[#65676B] w-8"></th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#65676B] uppercase tracking-wide">
                  Group Name
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#65676B] uppercase tracking-wide">
                  Members
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold text-[#65676B] uppercase tracking-wide">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const isExpanded = expandedGroupId === group.id
                const members = getGroupMembers(group.id)
                return (
                  <React.Fragment key={group.id}>
                    <tr
                      onClick={() => toggleGroupExpand(group.id)}
                      onMouseEnter={() => setHoveredGroupId(group.id)}
                      onMouseLeave={() => setHoveredGroupId(null)}
                      className="border-b border-[#DADDE1] last:border-0 hover:bg-[#F0F2F5] cursor-pointer transition-colors relative"
                    >
                      <td className="px-4 py-3 text-[#65676B]">
                        <ExpandArrow isExpanded={isExpanded} />
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#050505] relative">
                        {group.name}
                        {hoveredGroupId === group.id && members.length > 0 && !isExpanded && (
                          <Tooltip
                            title={t('common.membersTitle')}
                            items={members.map((m) => ({ id: m.id, name: m.name }))}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-3 py-1 bg-[#E7F3FF] text-[#1877F2] rounded-full text-sm font-medium">
                          {group.participantCount} members
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#65676B]">
                        {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(
                          group.createdAt
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td
                          colSpan={4}
                          className="bg-[#F0F2F5] px-4 py-2 border-b border-[#DADDE1]"
                        >
                          {members.length > 0 ? (
                            <MemberSelectionTable
                              members={members}
                              selectedIds={selectedGroupMembers}
                              onToggle={toggleGroupMemberSelection}
                              onToggleAll={() => {
                                if (members.every((m) => selectedGroupMembers.has(m.id))) {
                                  setSelectedGroupMembers(new Set())
                                } else {
                                  setSelectedGroupMembers(new Set(members.map((m) => m.id)))
                                }
                              }}
                              onNavigate={navigateToParticipant}
                              onClearSelection={() => setSelectedGroupMembers(new Set())}
                              onMoveAction={openMoveModal}
                              moveActionLabel="Move to Another Group"
                            />
                          ) : (
                            <div className="ml-6 py-2 text-sm text-[#65676B]">
                              No members in this group
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
          {hasMore && (
            <div ref={loadMoreRef} className="py-4 text-center text-sm text-[#65676B]">
              Loading more groups...
            </div>
          )}
          {groups.length === 0 && !isLoading && (
            <div className="text-center py-8 text-[#65676B]">{t('group.noGroupsCreated')}</div>
          )}
        </div>
      </div>

      {showMoveToGroupModal && (
        <MoveToModal
          type="group"
          selectedCount={selectedGroupMembers.size}
          items={groups}
          currentId={expandedGroupId}
          isMoving={isMoving}
          error={moveError}
          onMove={handleMoveToGroup}
          onClose={closeMoveModal}
        />
      )}
    </>
  )
}
