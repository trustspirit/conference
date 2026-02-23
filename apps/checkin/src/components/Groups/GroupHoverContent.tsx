import React from 'react'
import { useTranslation } from 'react-i18next'
import type { Group, Participant } from '../../types'

interface GroupHoverContentProps {
  group: Group
  participants: Participant[]
  onSetLeader: (group: Group, participantId: string | null, participantName: string | null) => void
  formatCapacity: (current: number, expected?: number) => string
}

function GroupHoverContent({
  group,
  participants,
  onSetLeader,
  formatCapacity
}: GroupHoverContentProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3 -mx-0 -mt-0">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-white">{group.name}</h4>
          <span className="text-sm text-white/80 bg-white/20 px-2 py-0.5 rounded-full">
            {formatCapacity(group.participantCount, group.expectedCapacity)}
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Current Leader */}
        {group.leaderId && group.leaderName && (
          <div className="flex items-center justify-between mb-3 p-2 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2">
              <span className="text-purple-600">⭐</span>
              <span className="font-semibold text-purple-800">{group.leaderName}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSetLeader(group, null, null)
              }}
              className="text-xs text-purple-600 hover:text-purple-800 hover:underline font-medium"
            >
              {t('group.removeLeader')}
            </button>
          </div>
        )}

        {/* Participants List */}
        {participants.length > 0 ? (
          <div>
            <h5 className="text-xs uppercase text-[#65676B] font-semibold mb-2">
              {group.leaderId ? t('group.changeLeader') : t('group.setLeader')}
            </h5>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {participants.map((p) => {
                const isLeader = group.leaderId === p.id
                return (
                  <button
                    key={p.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isLeader) {
                        onSetLeader(group, p.id, p.name)
                      }
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                      isLeader
                        ? 'bg-purple-100 text-purple-800 cursor-default'
                        : 'hover:bg-[#F0F2F5] text-[#050505]'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${isLeader ? 'bg-purple-500' : 'bg-[#31A24C]'}`}
                    />
                    <span className="text-sm font-medium flex-1">{p.name}</span>
                    {isLeader ? (
                      <span className="text-purple-500">⭐</span>
                    ) : (
                      <span className="text-xs text-[#65676B] opacity-0 group-hover:opacity-100">
                        {t('group.setLeader')}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#65676B] text-center py-4">{t('group.noMembers')}</p>
        )}

        {/* View Detail Link */}
        <div className="mt-3 pt-3 border-t border-[#DADDE1]">
          <div className="text-xs text-center text-[#1877F2] font-medium">
            {t('common.clickToChange')}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GroupHoverContent
