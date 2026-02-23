import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore'
import { db, SURVEY_RESPONSES_COLLECTION, PARTICIPANTS_COLLECTION, convertTimestamp, Timestamp } from './firebase'
import type { SurveyResponse, RegistrationData } from '../types'

const generatePersonalCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

const generateSearchKeys = (name: string, email: string): string[] => {
  const keys: string[] = []
  const normalized = name.toLowerCase().trim()
  for (let i = 1; i <= normalized.length; i++) {
    keys.push(normalized.substring(0, i))
  }
  if (email) {
    const emailLower = email.toLowerCase().trim()
    for (let i = 1; i <= emailLower.length; i++) {
      keys.push(emailLower.substring(0, i))
    }
  }
  return keys
}

export const submitRegistration = async (
  surveyId: string,
  data: RegistrationData
): Promise<{ personalCode: string; responseId: string }> => {
  const personalCode = generatePersonalCode()
  const now = Timestamp.now()

  // 1. Create participant in shared collection
  const participantsRef = collection(db, PARTICIPANTS_COLLECTION)
  const participantRef = doc(participantsRef)
  await setDoc(participantRef, {
    name: data.name,
    email: data.email,
    phoneNumber: data.phoneNumber || '',
    gender: data.gender || '',
    age: data.age || '',
    stake: data.stake || '',
    ward: data.ward || '',
    groupId: '',
    groupName: '',
    roomId: '',
    roomNumber: '',
    checkIns: [],
    createdAt: now,
    updatedAt: now,
    searchKeys: generateSearchKeys(data.name, data.email),
    metadata: { registrationSurveyId: surveyId, personalCode }
  })

  // 2. Create survey response
  const responsesRef = collection(db, SURVEY_RESPONSES_COLLECTION)
  const responseRef = doc(responsesRef)
  await setDoc(responseRef, {
    surveyId,
    personalCode,
    participantId: participantRef.id,
    email: data.email,
    data,
    createdAt: now,
    updatedAt: now
  })

  return { personalCode, responseId: responseRef.id }
}

export const getResponseByCode = async (
  surveyId: string,
  personalCode: string
): Promise<SurveyResponse | null> => {
  const q = query(
    collection(db, SURVEY_RESPONSES_COLLECTION),
    where('surveyId', '==', surveyId),
    where('personalCode', '==', personalCode)
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const docSnap = snapshot.docs[0]
  const d = docSnap.data()
  return {
    id: docSnap.id,
    surveyId: d.surveyId,
    personalCode: d.personalCode,
    participantId: d.participantId,
    email: d.email,
    data: d.data,
    createdAt: convertTimestamp(d.createdAt),
    updatedAt: convertTimestamp(d.updatedAt)
  }
}

export const updateRegistration = async (
  responseId: string,
  participantId: string,
  data: RegistrationData
): Promise<void> => {
  const now = Timestamp.now()

  await updateDoc(doc(db, SURVEY_RESPONSES_COLLECTION, responseId), {
    data,
    email: data.email,
    updatedAt: now
  })

  await updateDoc(doc(db, PARTICIPANTS_COLLECTION, participantId), {
    name: data.name,
    email: data.email,
    phoneNumber: data.phoneNumber || '',
    gender: data.gender || '',
    age: data.age || '',
    stake: data.stake || '',
    ward: data.ward || '',
    updatedAt: now,
    searchKeys: generateSearchKeys(data.name, data.email)
  })
}

export const getResponsesBySurvey = async (surveyId: string): Promise<SurveyResponse[]> => {
  const q = query(
    collection(db, SURVEY_RESPONSES_COLLECTION),
    where('surveyId', '==', surveyId),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => {
    const d = docSnap.data()
    return {
      id: docSnap.id,
      surveyId: d.surveyId,
      personalCode: d.personalCode,
      participantId: d.participantId,
      email: d.email,
      data: d.data,
      createdAt: convertTimestamp(d.createdAt),
      updatedAt: convertTimestamp(d.updatedAt)
    }
  })
}
