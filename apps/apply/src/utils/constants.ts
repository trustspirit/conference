import type { UserRole, ApplicationStatus, RecommendationStatus, Gender } from '../types'

// Routes
export const ROUTES = {
  LOGIN: '/login',
  COMPLETE_PROFILE: '/complete-profile',
  ADMIN_ROOT: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_REVIEW: '/admin/review',
  ADMIN_ROLES: '/admin/roles',
  LEADER_DASHBOARD: '/leader/dashboard',
  LEADER_RECOMMENDATIONS: '/leader/recommendations',
  LEADER_PENDING: '/leader/pending',
  APPLICATION: '/application',
  ACCOUNT_SETTINGS: '/settings',
} as const

// Tab IDs
export const ADMIN_REVIEW_TABS = {
  ALL: 'all',
  AWAITING: 'awaiting' as ApplicationStatus,
  APPROVED: 'approved' as ApplicationStatus,
  REJECTED: 'rejected' as ApplicationStatus,
} as const

export const RECOMMENDATION_TABS = {
  ALL: 'all',
  DRAFT: 'draft' as RecommendationStatus,
  SUBMITTED: 'submitted' as RecommendationStatus,
  APPROVED: 'approved' as RecommendationStatus,
  REJECTED: 'rejected' as RecommendationStatus,
} as const

export const ACCOUNT_TABS = {
  SETTINGS: 'settings',
  APPROVALS: 'approvals',
  DELETE: 'delete',
} as const

// Item types
export const ITEM_TYPES = {
  APPLICATION: 'application',
  RECOMMENDATION: 'recommendation',
} as const

export type ItemType = (typeof ITEM_TYPES)[keyof typeof ITEM_TYPES]

// Role tones
export type RoleTone = 'admin' | 'sessionLeader' | 'stakePresident' | 'bishop' | 'applicant'

const ROLE_TONE_MAP: Record<string, RoleTone> = {
  admin: 'admin',
  session_leader: 'sessionLeader',
  stake_president: 'stakePresident',
  bishop: 'bishop',
  applicant: 'applicant',
}

export const getRoleTone = (role: UserRole | string | null | undefined): RoleTone => {
  return role ? ROLE_TONE_MAP[role] || 'applicant' : 'applicant'
}

// Status display
export const STATUS_TONES: Record<string, string> = {
  draft: 'draft',
  awaiting: 'awaiting',
  submitted: 'awaiting',
  approved: 'approved',
  rejected: 'rejected',
  reviewed: 'reviewed',
  pending: 'awaiting',
}

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  awaiting: 'Awaiting',
  submitted: 'Awaiting',
  approved: 'Approved',
  rejected: 'Rejected',
  reviewed: 'Reviewed',
  pending: 'Pending',
}

// Valid genders
export const VALID_GENDERS: Gender[] = ['male', 'female']
