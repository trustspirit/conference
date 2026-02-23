import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  writeBatch
} from 'firebase/firestore'
import { db, SURVEY_RESPONSES_COLLECTION, PARTICIPANTS_COLLECTION, convertTimestamp, Timestamp } from './firebase'
import type { SurveyResponse, RegistrationData, SurveyField } from '../types'

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

const KNOWN_PARTICIPANT_FIELDS = ['name', 'email', 'phoneNumber', 'gender', 'age', 'stake', 'ward'] as const

const buildParticipantDoc = (
  participantData: Record<string, string>,
  surveyId: string,
  personalCode: string
) => {
  const metadata: Record<string, string> = { registrationSurveyId: surveyId, personalCode }
  for (const [key, value] of Object.entries(participantData)) {
    if (!(KNOWN_PARTICIPANT_FIELDS as readonly string[]).includes(key) && value) {
      metadata[key] = value
    }
  }
  return {
    name: participantData.name || '',
    email: participantData.email || '',
    phoneNumber: participantData.phoneNumber || '',
    gender: participantData.gender || '',
    age: participantData.age || '',
    stake: participantData.stake || '',
    ward: participantData.ward || '',
    metadata,
  }
}

export const submitDynamicRegistration = async (
  surveyId: string,
  data: Record<string, unknown>,
  fields: SurveyField[]
): Promise<{ personalCode: string; responseId: string }> => {
  const personalCode = generatePersonalCode()
  const now = Timestamp.now()

  const participantData = extractParticipantFromFields(data, fields)
  const name = participantData.name || ''
  const email = participantData.email || ''
  const pDoc = buildParticipantDoc(participantData, surveyId, personalCode)

  const batch = writeBatch(db)

  const participantRef = doc(collection(db, PARTICIPANTS_COLLECTION))
  batch.set(participantRef, {
    ...pDoc,
    groupId: '',
    groupName: '',
    roomId: '',
    roomNumber: '',
    checkIns: [],
    createdAt: now,
    updatedAt: now,
    searchKeys: generateSearchKeys(name, email),
  })

  const responseRef = doc(collection(db, SURVEY_RESPONSES_COLLECTION))
  batch.set(responseRef, {
    surveyId,
    personalCode,
    participantId: participantRef.id,
    email,
    data,
    createdAt: now,
    updatedAt: now
  })

  await batch.commit()
  return { personalCode, responseId: responseRef.id }
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
    email,
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

export const getResponseByEmail = async (
  surveyId: string,
  email: string
): Promise<SurveyResponse | null> => {
  const q = query(
    collection(db, SURVEY_RESPONSES_COLLECTION),
    where('surveyId', '==', surveyId),
    where('email', '==', email.toLowerCase().trim())
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

/** Find a response by personal code across all surveys */
export const findResponseByCode = async (
  personalCode: string
): Promise<SurveyResponse | null> => {
  const q = query(
    collection(db, SURVEY_RESPONSES_COLLECTION),
    where('personalCode', '==', personalCode.toUpperCase().trim())
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

/** Search all surveys for a response by email */
export const findResponsesByEmail = async (
  email: string
): Promise<SurveyResponse[]> => {
  const q = query(
    collection(db, SURVEY_RESPONSES_COLLECTION),
    where('email', '==', email.toLowerCase().trim())
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
