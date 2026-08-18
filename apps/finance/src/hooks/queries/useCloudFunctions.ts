import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@conference/firebase'
import type { Receipt } from '../../types'
import { queryKeys } from './queryKeys'
import { invalidateRequestCaches } from './useRequests'

interface UploadReceiptsInput {
  files: Array<{ name: string; data: string }>
  committee: string
  projectId: string
}

interface UploadBankBookInput {
  file: { name: string; data: string }
}

interface UploadBankBookResult {
  fileName: string
  storagePath: string
  url: string
}

export function useUploadReceipts() {
  return useMutation({
    mutationFn: async (input: UploadReceiptsInput) => {
      const uploadFn = httpsCallable<UploadReceiptsInput, Receipt[]>(functions, 'uploadReceiptsV2')
      const result = await uploadFn(input)
      return result.data
    }
  })
}

export function useUploadBankBook() {
  return useMutation({
    mutationFn: async (input: UploadBankBookInput) => {
      const uploadFn = httpsCallable<UploadBankBookInput, UploadBankBookResult>(
        functions,
        'uploadBankBookV2'
      )
      const result = await uploadFn(input)
      return result.data
    }
  })
}

export interface DashboardStats {
  total: number
  pending: number
  reviewed: number
  approvedOnly: number
  settled: number
  rejected: number
  totalAmount: number
  approvedAmount: number
  approvedOnlyAmount: number
  settledAmount: number
  pendingAmount: number
  reviewedAmount: number
  byCommittee: Record<string, { count: number; amount: number; approvedAmount: number }>
  byBudgetCode: Record<number, { count: number; amount: number; approvedAmount: number }>
  monthlyTrend: Record<string, number>
  monthlyCount: Record<string, number>
  dailyTrend: Record<string, number>
  dailyCount: Record<string, number>
  usdToKrwRate?: number
}

export function useDashboardStats(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(projectId!),
    queryFn: async () => {
      const fn = httpsCallable<{ projectId: string }, DashboardStats>(
        functions,
        'getDashboardStats'
      )
      const result = await fn({ projectId: projectId! })
      return result.data
    },
    enabled: !!projectId
  })
}

interface SplitCorporateCardInput {
  requestId: string
  corporateItemIndexes: number[]
  corporateReceiptPaths: string[]
}

interface SplitCorporateCardResult {
  originalId: string
  corporateCardId: string
}

/**
 * 신청서의 일부 항목을 법인카드 신청서로 분리한다. Firestore 규칙이 items 수정과
 * 대리 create 를 모두 막고 있어 서버에서만 수행할 수 있다.
 */
export function useSplitCorporateCardRequest(projectId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SplitCorporateCardInput) => {
      const fn = httpsCallable<SplitCorporateCardInput, SplitCorporateCardResult>(
        functions,
        'splitCorporateCardRequest'
      )
      const result = await fn(input)
      return result.data
    },
    onSuccess: (_data, variables) => {
      if (projectId) invalidateRequestCaches(queryClient, projectId, variables.requestId)
    }
  })
}
