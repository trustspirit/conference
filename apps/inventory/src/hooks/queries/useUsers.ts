import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '@conference/firebase'
import { INVENTORY_USERS_COLLECTION } from '../../collections'
import { AppUser, UserRole } from '../../types'
import { queryKeys } from './queryKeys'

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: async () => {
      const snap = await getDocs(collection(db, INVENTORY_USERS_COLLECTION))
      return snap.docs.map((d) => d.data() as AppUser)
    }
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ uid, role }: { uid: string; role: UserRole }) => {
      await updateDoc(doc(db, INVENTORY_USERS_COLLECTION, uid), { role })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all() })
  })
}

export function useUpdateUserProjects() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ uid, projectIds }: { uid: string; projectIds: string[] }) => {
      await updateDoc(doc(db, INVENTORY_USERS_COLLECTION, uid), { projectIds })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all() })
  })
}
