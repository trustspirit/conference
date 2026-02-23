// --- Survey Field Types ---

export type FieldType =
  | 'short_text'
  | 'long_text'
  | 'radio'
  | 'checkbox'
  | 'dropdown'
  | 'linear_scale'
  | 'grid'
  | 'date'
  | 'time'
  | 'section'
  | 'church_info'

export type ParticipantFieldKey =
  | 'name'
  | 'email'
  | 'phoneNumber'
  | 'gender'
  | 'age'
  | 'birthDate'
  | 'stake'
  | 'ward'
  | 'isPaid'
  | 'memo'

export interface LinearScaleConfig {
  min: number
  max: number
  minLabel?: string
  maxLabel?: string
}

export interface GridConfig {
  rows: string[]
  columns: string[]
  allowMultiple: boolean
}

export interface FieldValidation {
  minLength?: number
  maxLength?: number
  pattern?: string
}

export type FieldWidth = 'full' | 'half'

export interface SurveyField {
  id: string
  type: FieldType
  label: string
  description?: string
  required: boolean
  width?: FieldWidth
  group?: string                            // same group → same row
  inputType?: 'text' | 'number' | 'email' | 'tel'
  participantField?: ParticipantFieldKey
  options?: string[]
  dependsOn?: string                          // field id this field depends on
  conditionalOptions?: Record<string, string[]> // parent value → options
  linearScale?: LinearScaleConfig
  grid?: GridConfig
  validation?: FieldValidation
}

// --- Survey Theme ---

export interface SurveyTheme {
  primaryColor?: string    // hex, e.g. "#2563eb"
  headerImageUrl?: string  // URL
}

// --- Survey ---

export interface Survey {
  id: string
  title: string
  description: string
  isActive: boolean
  shareToken: string
  createdAt: Date
  createdBy: string
  fields?: SurveyField[]
  theme?: SurveyTheme
}

// --- Survey Response ---

export interface SurveyResponse {
  id: string
  surveyId: string
  personalCode: string
  participantId: string
  email: string
  data: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

// Legacy type kept for backward compatibility
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
