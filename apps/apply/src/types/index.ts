// Enums
export type UserRole = 'admin' | 'session_leader' | 'stake_president' | 'bishop' | 'applicant'
export type LeaderStatus = 'pending' | 'approved'
export type ApplicationStatus = 'draft' | 'awaiting' | 'approved' | 'rejected'
export type RecommendationStatus = 'draft' | 'submitted' | 'approved' | 'rejected'
export type Gender = 'male' | 'female'

// Conference (대회/행사)
export interface Conference {
  id: string
  name: string
  description: string
  deadline: Date | null
  isClosed: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

// Position (포지션/직분)
export interface Position {
  id: string
  conferenceId: string
  name: string
  description: string
  eligibilityRequirements: string[]
  createdAt: Date
  updatedAt: Date
}

// User (Firebase Auth + Firestore)
export interface AppUser {
  uid: string
  name: string
  email: string
  role: UserRole | null
  leaderStatus: LeaderStatus | null
  ward: string
  stake: string
  phone: string
  picture: string
  pendingWard?: string
  pendingStake?: string
}

// Application
export interface Application {
  id: string
  conferenceId?: string
  positionId?: string
  positionName?: string
  userId: string
  name: string
  age: number
  email: string
  phone: string
  stake: string
  ward: string
  gender: Gender
  moreInfo: string
  servedMission?: boolean
  status: ApplicationStatus
  createdAt: Date
  updatedAt: Date
  linkedRecommendationId?: string
  memos?: ApplicationMemo[]
}

// Leader Recommendation
export interface LeaderRecommendation {
  id: string
  conferenceId?: string
  positionId?: string
  positionName?: string
  leaderId: string
  name: string
  age: number
  email?: string
  phone: string
  stake: string
  ward: string
  gender: Gender
  moreInfo: string
  servedMission?: boolean
  status: RecommendationStatus
  createdAt: Date
  updatedAt: Date
  linkedApplicationId?: string
  comments?: RecommendationComment[]
}

// Memo (Application Comment)
export interface ApplicationMemo {
  id: string
  applicationId: string
  authorId: string
  authorName: string
  authorRole: UserRole
  content: string
  createdAt: Date
  updatedAt: Date
}

// Recommendation Comment
export interface RecommendationComment {
  id: string
  recommendationId?: string
  applicationId?: string
  authorId: string
  authorName: string
  authorRole: UserRole
  content: string
  createdAt: Date
  updatedAt: Date
}

// Stake/Ward Change Request
export interface StakeWardChangeRequest {
  id: string
  userId: string
  userName: string
  userEmail: string
  userRole: UserRole
  currentStake: string
  currentWard: string
  requestedStake: string
  requestedWard: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: Date
  approvedAt?: Date
  approvedBy?: string
  approvedByName?: string
}

// Discriminated union types for UI
export interface ExtendedApplication extends Application {
  itemType: 'application'
  isApplication: true
}

export interface ExtendedRecommendation extends LeaderRecommendation {
  itemType: 'recommendation'
  hasApplication?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

export type CombinedItem = ExtendedApplication | ExtendedRecommendation

export interface ReviewItem {
  key: string
  type: 'application' | 'recommendation'
  entityId: string
  status: string
  rawStatus: string
  name: string
  email: string
  phone: string
  age: number
  gender: string
  stake: string
  ward: string
  moreInfo: string
  positionName?: string
  comments?: RecommendationComment[]
  createdAt: Date
  updatedAt: Date
  hasRecommendation?: boolean
  recommendationId?: string
  hasApplication?: boolean
  applicationId?: string
  conferenceName?: string
}

export interface ValidationErrors {
  [key: string]: string
}

export interface TabItem {
  id: string
  label: string
}

export interface StatusOption {
  value: string
  label: string
}

export interface StatusDisplayItem {
  label: string
  tone: 'draft' | 'awaiting' | 'reviewed' | 'rejected'
}
