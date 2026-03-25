import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore'
import { db } from '@conference/firebase'
import { INVENTORY_PROJECTS_COLLECTION } from '../../collections'
import { Project } from '../../types'
import { queryKeys } from './queryKeys'

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  if (typeof val === 'string') return new Date(val)
  return new Date()
}

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects.all(),
    queryFn: async () => {
      const snap = await getDocs(collection(db, INVENTORY_PROJECTS_COLLECTION))
      return snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          name: data.name,
          description: data.description || '',
          startDate: toDate(data.startDate),
          endDate: toDate(data.endDate),
          createdBy: data.createdBy,
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
          isActive: data.isActive ?? true
        } as Project
      })
    }
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
      const ref = doc(collection(db, INVENTORY_PROJECTS_COLLECTION))
      const now = Timestamp.now()
      await setDoc(ref, {
        ...project,
        startDate: Timestamp.fromDate(project.startDate),
        endDate: Timestamp.fromDate(project.endDate),
        createdAt: now,
        updatedAt: now
      })
      return ref.id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects.all() })
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<Project> & { id: string }) => {
      const data: Record<string, unknown> = { ...fields, updatedAt: Timestamp.now() }
      if (fields.startDate) data.startDate = Timestamp.fromDate(fields.startDate)
      if (fields.endDate) data.endDate = Timestamp.fromDate(fields.endDate)
      await updateDoc(doc(db, INVENTORY_PROJECTS_COLLECTION, id), data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects.all() })
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, INVENTORY_PROJECTS_COLLECTION, id))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects.all() })
  })
}
