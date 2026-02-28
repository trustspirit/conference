import React from 'react'
import { useTranslation } from 'react-i18next'
import { Tabs } from 'trust-ui-react'
import { useParticipantsListPage } from '../hooks'
import {
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

      <Tabs value={activeTab} onChange={(value: string) => setActiveTab(value as typeof activeTab)}>
        <Tabs.List>
          {tabs.map((tab) => (
            <Tabs.Trigger key={tab.id} value={tab.id}>
              {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs>

      {activeTab === 'participants' && <ParticipantsTab />}
      {activeTab === 'groups' && <GroupsTab />}
      {activeTab === 'rooms' && <RoomsTab />}
    </div>
  )
}

export default ParticipantsListPage
