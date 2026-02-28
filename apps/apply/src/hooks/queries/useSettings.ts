import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@conference/firebase'
import { APPLY_SETTINGS_COLLECTION } from '../../collections'
import { queryKeys } from './queryKeys'
import { useAuth } from '../../contexts/AuthContext'

interface EligibilitySettings {
  requirements: string[]
  updatedAt: Date
  updatedBy: string
}

export function useEligibility() {
  return useQuery({
    queryKey: queryKeys.settings.eligibility(),
    queryFn: async () => {
      const snap = await getDoc(doc(db, APPLY_SETTINGS_COLLECTION, 'eligibility'))
      if (!snap.exists()) return { requirements: [] } as EligibilitySettings
      const data = snap.data()
      return {
        requirements: data.requirements || [],
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        updatedBy: data.updatedBy || '',
      } as EligibilitySettings
    },
  })
}

export function useUpdateEligibility() {
  const queryClient = useQueryClient()
  const { appUser } = useAuth()

  return useMutation({
    mutationFn: async (requirements: string[]) => {
      await setDoc(doc(db, APPLY_SETTINGS_COLLECTION, 'eligibility'), {
        requirements,
        updatedAt: serverTimestamp(),
        updatedBy: appUser?.uid || '',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.eligibility() })
    },
  })
}
