import React from 'react'
import { useTranslation } from 'react-i18next'
import { useParticipantsListPage } from '../hooks'
import {
  TabBar,
  ParticipantsListSkeleton,
  ParticipantsTab,
  GroupsTab,
  RoomsTab
} from '../components'

function ParticipantsListPage(): React.ReactElement {
  const { t } = useTranslation()
  const { isLoading, activeTab, setActiveTab, tabs } = useParticipantsListPage()

  if (isLoading) {
    return <ParticipantsListSkeleton />
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#050505] mb-1">{t('participant.allData')}</h1>
        <p className="text-[#65676B]">{t('participant.viewAllSubtitle')}</p>
      </div>

      <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'participants' && <ParticipantsTab />}
      {activeTab === 'groups' && <GroupsTab />}
      {activeTab === 'rooms' && <RoomsTab />}
    </div>
  )
}

export default ParticipantsListPage
