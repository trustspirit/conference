import { useQuery } from '@tanstack/react-query'
import {
  collection,
  query,
  where,
  getAggregateFromServer,
  sum
} from 'firebase/firestore'
import { db } from '@conference/firebase'
import { useProject } from '../contexts/ProjectContext'
import { queryKeys } from './queries/queryKeys'
import { BUDGET_COUNTED_STATUSES } from '../lib/budgetStatuses'

export interface BudgetUsage {
  percent: number
  warningThreshold: number
  exceeded: boolean
  warning: boolean
}

export function useBudgetUsage(): BudgetUsage | null {
  const { currentProject } = useProject()
  const projectId = currentProject?.id
  const totalBudget = currentProject?.budgetConfig?.totalBudget || 0

  // Server-side sum aggregation — avoids fetching every request document
  // (which previously loaded the entire project's requests into memory).
  const { data: usedAmount = 0 } = useQuery({
    queryKey: queryKeys.budget.usage(projectId!),
    queryFn: async () => {
      const q = query(
        collection(db, 'requests'),
        where('projectId', '==', projectId),
        where('status', 'in', [...BUDGET_COUNTED_STATUSES])
      )
      const snap = await getAggregateFromServer(q, { total: sum('totalAmount') })
      return (snap.data().total as number | null) ?? 0
    },
    enabled: !!projectId && totalBudget > 0,
    staleTime: 30_000
  })

  if (totalBudget <= 0) return null

  const percent = Math.round((usedAmount / totalBudget) * 100)
  const warningThreshold = currentProject?.budgetWarningThreshold ?? 85

  return {
    percent,
    warningThreshold,
    exceeded: percent >= 100,
    warning: percent >= warningThreshold
  }
}
