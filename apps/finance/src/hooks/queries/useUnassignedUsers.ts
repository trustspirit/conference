import { useQuery } from '@tanstack/react-query'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@conference/firebase'
import { AppUser } from '../../types'

export function useUnassignedUsers() {
  return useQuery({
    queryKey: ['users', 'unassigned'],
    queryFn: async (): Promise<AppUser[]> => {
      const q = query(collection(db, 'users'), where('assignedProjectCount', '==', 0))
      const snap = await getDocs(q)
      return snap.docs.map((d) => d.data() as AppUser)
    }
  })
}
