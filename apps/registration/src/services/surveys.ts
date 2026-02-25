import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore'
import { db, SURVEYS_COLLECTION, convertTimestamp, Timestamp } from './firebase'
import type { Survey, SurveyField, SurveyTheme } from '../types'

const generateShareToken = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => chars[b % chars.length]).join('')
}

const mapSurveyDoc = (docSnap: { id: string; data: () => Record<string, unknown> }): Survey => {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    title: data.title as string,
    description: (data.description as string) || '',
    isActive: (data.isActive as boolean) ?? true,
    shareToken: (data.shareToken as string) || '',
    createdAt: convertTimestamp(data.createdAt as Timestamp | Date | undefined),
    createdBy: (data.createdBy as string) || '',
    fields: (data.fields as SurveyField[] | undefined) || undefined,
    theme: (data.theme as SurveyTheme | undefined) || undefined,
  }
}

export const getAllSurveys = async (): Promise<Survey[]> => {
  const q = query(collection(db, SURVEYS_COLLECTION), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(mapSurveyDoc)
}

export const getSurveyById = async (id: string): Promise<Survey | null> => {
  const docSnap = await getDoc(doc(db, SURVEYS_COLLECTION, id))
  if (!docSnap.exists()) return null
  return mapSurveyDoc(docSnap)
}

export const createSurvey = async (title: string, description: string, createdBy: string, fields?: SurveyField[]): Promise<Survey> => {
  const surveysRef = collection(db, SURVEYS_COLLECTION)
  const newRef = doc(surveysRef)
  const now = Timestamp.now()
  const shareToken = generateShareToken()
  const docData: Record<string, unknown> = {
    title,
    description,
    isActive: true,
    shareToken,
    createdAt: now,
    createdBy
  }
  if (fields) {
    docData.fields = fields
  }
  await setDoc(newRef, docData)
  return {
    id: newRef.id,
    title,
    description,
    isActive: true,
    shareToken,
    createdAt: now.toDate(),
    createdBy,
    fields,
  }
}

export const updateSurvey = async (id: string, data: Partial<Pick<Survey, 'title' | 'description' | 'isActive' | 'fields' | 'theme'>>): Promise<void> => {
  await updateDoc(doc(db, SURVEYS_COLLECTION, id), data)
}

export const deleteSurvey = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, SURVEYS_COLLECTION, id))
}
