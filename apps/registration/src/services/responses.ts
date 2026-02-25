import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  writeBatch,
  QueryDocumentSnapshot
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions, SURVEY_RESPONSES_COLLECTION, PARTICIPANTS_COLLECTION, convertTimestamp, Timestamp } from './firebase'
import type { SurveyResponse, RegistrationData, SurveyField } from '../types'

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

const extractParticipantFromFields = (
  data: Record<string, unknown>,
  fields: SurveyField[]
): Record<string, string> => {
  const participant: Record<string, string> = {}
  for (const field of fields) {
    // church_info → stake + ward
    if (field.type === 'church_info' && data[field.id]) {
      const info = data[field.id] as { stake?: string; ward?: string }
      const stake = (info.stake === '__other__' || info.stake === '__non_member__') ? '' : (info.stake || '')
      if (stake) participant.stake = stake
      if (info.ward) participant.ward = info.ward
      continue
    }
    if (field.participantField && data[field.id] !== undefined) {
      participant[field.participantField] = String(data[field.id] || '')
    }
  }
  return participant
}

// ─── Cloud Function wrappers ──────────────────────────────────────

const submitRegistrationFn = httpsCallable<
  { surveyId: string; data: Record<string, unknown>; participantData: Record<string, string> },
  { personalCode: string; responseId: string }
>(functions, 'submitRegistration')

const lookupByCodeFn = httpsCallable<
  { code: string },
  { responseId: string; surveyId: string; personalCode: string }
>(functions, 'lookupByCode')

/** Rate-limited code lookup via Cloud Function */
export const lookupByCode = async (
  code: string
): Promise<{ responseId: string; surveyId: string; personalCode: string } | null> => {
  try {
    const result = await lookupByCodeFn({ code })
    return result.data
  } catch {
    return null
  }
}

// ─── Submit (via Cloud Function — rate limited) ───────────────────

export const submitRegistration = async (
  surveyId: string,
  data: RegistrationData
): Promise<{ personalCode: string; responseId: string }> => {
  const result = await submitRegistrationFn({
    surveyId,
    data: { ...data },
    participantData: {
      name: data.name,
      email: data.email,
      phoneNumber: data.phoneNumber || '',
      gender: data.gender || '',
      age: data.age || '',
      stake: data.stake || '',
      ward: data.ward || '',
    }
  })
  return result.data
}

export const submitDynamicRegistration = async (
  surveyId: string,
  data: Record<string, unknown>,
  fields: SurveyField[]
): Promise<{ personalCode: string; responseId: string }> => {
  const participantData = extractParticipantFromFields(data, fields)
  const result = await submitRegistrationFn({
    surveyId,
    data,
    participantData
  })
  return result.data
}

// ─── Update (still client-side — guarded by Firestore rules) ──────

const KNOWN_PARTICIPANT_FIELDS = ['name', 'email', 'phoneNumber', 'gender', 'age', 'stake', 'ward'] as const

export const updateRegistration = async (
  responseId: string,
  participantId: string,
  data: RegistrationData
): Promise<void> => {
  const now = Timestamp.now()

  await updateDoc(doc(db, SURVEY_RESPONSES_COLLECTION, responseId), {
    data,
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

export const updateDynamicRegistration = async (
  responseId: string,
  participantId: string,
  data: Record<string, unknown>,
  fields: SurveyField[]
): Promise<void> => {
  const now = Timestamp.now()
  const participantData = extractParticipantFromFields(data, fields)
  const name = participantData.name || ''
  const email = participantData.email || ''

  const extraMetadata: Record<string, string> = {}
  for (const [key, value] of Object.entries(participantData)) {
    if (!(KNOWN_PARTICIPANT_FIELDS as readonly string[]).includes(key) && value) {
      extraMetadata[key] = value
    }
  }

  const batch = writeBatch(db)

  batch.update(doc(db, SURVEY_RESPONSES_COLLECTION, responseId), {
    data,
    updatedAt: now
  })

  batch.update(doc(db, PARTICIPANTS_COLLECTION, participantId), {
    name,
    email,
    phoneNumber: participantData.phoneNumber || '',
    gender: participantData.gender || '',
    age: participantData.age || '',
    stake: participantData.stake || '',
    ward: participantData.ward || '',
    updatedAt: now,
    searchKeys: generateSearchKeys(name, email),
    ...(Object.keys(extraMetadata).length > 0 ? { metadata: extraMetadata } : {})
  })

  await batch.commit()
}

// ─── Response document mapping helper ─────────────────────────────

const mapResponseDoc = (docSnap: QueryDocumentSnapshot): SurveyResponse => {
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

// ─── Read operations (still client-side for edit flow) ────────────

export const getAllResponses = async (): Promise<SurveyResponse[]> => {
  const q = query(
    collection(db, SURVEY_RESPONSES_COLLECTION),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(mapResponseDoc)
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
  return mapResponseDoc(snapshot.docs[0])
}

export const getResponsesBySurvey = async (surveyId: string): Promise<SurveyResponse[]> => {
  const q = query(
    collection(db, SURVEY_RESPONSES_COLLECTION),
    where('surveyId', '==', surveyId),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(mapResponseDoc)
}
