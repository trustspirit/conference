export type UserRole = 'admin' | 'writer' | 'viewer'

export interface AppUser {
  uid: string
  email: string
  name: string
  role: UserRole
  projectIds: string[]
  consentAgreedAt?: string
}

export interface Project {
  id: string
  name: string
  description: string
  startDate: Date
  endDate: Date
  createdBy: { uid: string; name: string; email: string }
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

export interface InventoryItem {
  id: string
  name: string
  stock: number
  location: string
  projectIds: string[]
  lastEditedBy: { uid: string; name: string; email: string } | null
  lastEditedAt: Date | null
  createdBy: { uid: string; name: string; email: string }
  createdAt: Date
}
