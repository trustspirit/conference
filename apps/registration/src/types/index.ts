export interface Survey {
  id: string
  title: string
  description: string
  isActive: boolean
  shareToken: string
  createdAt: Date
  createdBy: string
}

export interface SurveyResponse {
  id: string
  surveyId: string
  personalCode: string
  participantId: string
  email: string
  data: RegistrationData
  createdAt: Date
  updatedAt: Date
}

export interface RegistrationData {
  name: string
  email: string
  phoneNumber?: string
  gender?: string
  age?: string
  stake?: string
  ward?: string
}

export interface Participant {
  id: string
  name: string
  email: string
  phoneNumber: string
  gender: string
  age: string
  stake: string
  ward: string
  groupId?: string
  groupName?: string
  roomId?: string
  roomNumber?: string
  checkIns: CheckIn[]
  createdAt: Date
  updatedAt: Date
  searchKeys: string[]
  metadata?: Record<string, string>
}

export interface CheckIn {
  timestamp: Date
  type: 'check-in' | 'check-out'
  by: string
}
