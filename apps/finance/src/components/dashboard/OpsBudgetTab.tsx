import { useMemo, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { useProject } from '../../contexts/ProjectContext'
import {
  useOpsBudgetInclusions,
  useOpsBudgetIncludableItems,
} from '../../hooks/queries/useOpsBudget'
import OpsBudgetSummaryCards from './OpsBudgetSummaryCards'
import OpsBudgetCharts from './OpsBudgetCharts'
import OpsBudgetCategoryTable from './OpsBudgetCategoryTable'
import OpsBudgetItemPicker from './OpsBudgetItemPicker'
import OpsBudgetIncludedList from './OpsBudgetIncludedList'
import Spinner from '../Spinner'
import Tabs, { type TabDef } from '../Tabs'

type PanelTab = 'picker' | 'included'

function SkeletonBlock({ height, label }: { height: number; label: string }) {
  return (
    <div
      className="finance-panel rounded-lg animate-pulse bg-finance-bg mt-6"
      style={{ height }}
      aria-label={label}
      role="status"
    />
  )
}

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

export default function OpsBudgetTab() {
  const { t } = useTranslation()
  const { appUser } = useAuth()
  const { currentProject } = useProject()
  const projectId = currentProject?.id

  const inclusions = useOpsBudgetInclusions(projectId)
  const includable = useOpsBudgetIncludableItems(projectId)

  const categories = useMemo(
    () => [...(currentProject?.opsBudget?.categories ?? [])].sort((a, b) => a.sortIndex - b.sortIndex),
    [currentProject?.opsBudget?.categories]
  )

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  useEffect(() => {
    if (selectedCategoryId && categories.some((c) => c.id === selectedCategoryId)) return
    setSelectedCategoryId(categories[0]?.id ?? null)
  }, [categories, selectedCategoryId])

  const [panelTab, setPanelTab] = useState<PanelTab>('picker')

  const pickerRef = useRef<HTMLDivElement>(null)
  const isDesktop = useIsDesktop()

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null
  const currentUser = appUser
    ? { uid: appUser.uid, name: appUser.displayName || appUser.name, email: appUser.email }
    : null

  if (!projectId || !currentUser) return <Spinner />
  if (inclusions.error) {
    return (
      <div className="text-center py-12 text-finance-danger">
        {t('common.loadError')}: {(inclusions.error as Error).message}
      </div>
    )
  }

  const inclusionsLoading = inclusions.isLoading && !inclusions.data
  const incData = inclusions.data ?? []

  const panelTabs: TabDef<PanelTab>[] = [
    { key: 'picker',   label: t('dashboard.opsBudget.panelTabPicker') },
    { key: 'included', label: t('dashboard.opsBudget.panelTabIncluded') },
  ]

  return (
    <div className="pt-4">
      {inclusionsLoading ? (
        <SkeletonBlock label="summary" height={100} />
      ) : (
        <OpsBudgetSummaryCards
          categories={categories}
          inclusions={incData}
          unassignedCount={includable.data?.length ?? 0}
          onJumpToPicker={() => pickerRef.current?.scrollIntoView({ behavior: 'smooth' })}
        />
      )}

      {inclusionsLoading ? (
        <SkeletonBlock label="charts" height={240} />
      ) : (
        <OpsBudgetCharts categories={categories} inclusions={incData} />
      )}

      <OpsBudgetCategoryTable
        project={currentProject!}
        inclusions={incData}
        currentUser={currentUser}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
      />

      {isDesktop ? (
        /* Desktop: side-by-side, single mount */
        <div ref={pickerRef} className="grid grid-cols-2 gap-4 mt-6">
          <OpsBudgetItemPicker
            projectId={projectId}
            categories={categories}
            currentUser={currentUser}
          />
          <OpsBudgetIncludedList
            projectId={projectId}
            category={selectedCategory}
            categories={categories}
            inclusions={incData}
            onSelectCategory={setSelectedCategoryId}
          />
        </div>
      ) : (
        /* Mobile: sub-tabs, single mount */
        <div className="mt-6">
          <Tabs<PanelTab>
            tabs={panelTabs}
            active={panelTab}
            onChange={setPanelTab}
          />
          <div ref={pickerRef} className="mt-4">
            {panelTab === 'picker' && (
              <OpsBudgetItemPicker
                projectId={projectId}
                categories={categories}
                currentUser={currentUser}
              />
            )}
            {panelTab === 'included' && (
              <OpsBudgetIncludedList
                projectId={projectId}
                category={selectedCategory}
                categories={categories}
                inclusions={incData}
                onSelectCategory={setSelectedCategoryId}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
