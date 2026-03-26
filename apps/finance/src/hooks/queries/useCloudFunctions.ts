import { useMutation, useQuery } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@conference/firebase'
import type { Receipt } from '../../types'
import { queryKeys } from './queryKeys'

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
