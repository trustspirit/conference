export type UserRole =
  | 'user'
  | 'finance_ops'
  | 'approver_ops'
  | 'finance_prep'
  | 'approver_prep'
  | 'session_director'
  | 'logistic_admin'
  | 'executive'
  | 'admin'
  | 'super_admin'

export interface ProjectBudgetConfig {
  totalBudget: number
  byCode: Record<number, number>
}

export interface Project {
  id: string
  name: string
  description: string
  createdAt: Date
  createdBy: { uid: string; name: string; email: string }
  budgetConfig: ProjectBudgetConfig
  documentNo: string
  directorApprovalThreshold: number
  budgetWarningThreshold?: number
  perKmRate?: number
  corporateCardReportTitle?: string
  memberUids: string[]
  isActive: boolean
  deletedAt?: Date | null
}

export interface GlobalSettings {
  defaultProjectId: string
}

export interface AppUser {
  uid: string
  email: string
  name: string
  displayName: string
  phone: string
  bankName: string
  bankAccount: string
  defaultCommittee: Committee
  signature: string
  bankBookImage: string
  bankBookPath: string
  bankBookUrl: string
  /** @deprecated legacy Drive field — kept for existing data compatibility */
  bankBookDriveId?: string
  /** @deprecated legacy Drive field — kept for existing data compatibility */
  bankBookDriveUrl?: string
  role: UserRole
  projectIds: string[]
  consentAgreedAt?: string
}

export type Committee = 'operations' | 'preparation'

export type RequestStatus =
  | 'pending'
  | 'reviewed'
  | 'approved'
  | 'rejected'
  | 'settled'
  | 'cancelled'
  | 'force_rejected'

export type TransportType = 'car' | 'public'
export type TripType = 'round' | 'one_way'

export interface PlaceCoord {
  lat: number
  lng: number
  placeName: string
  addressName: string
}

export interface RouteMapImage {
  storagePath: string
  url: string
}

export interface TransportDetail {
  transportType: TransportType
  tripType: TripType
  departure: string
  destination: string
  departureCoord?: PlaceCoord
  destinationCoord?: PlaceCoord
  distanceKm?: number
  routeMapImage?: RouteMapImage
}

export interface RequestItem {
  description: string
  budgetCode: number
  budgetDescKey?: string
  amount: number
  transportDetail?: TransportDetail
}

export interface Receipt {
  fileName: string
  storagePath: string
  url: string
  /** @deprecated legacy Drive field — kept for existing data compatibility */
  driveFileId?: string
  /** @deprecated legacy Drive field — kept for existing data compatibility */
  driveUrl?: string
}

export interface PaymentRequest {
  id: string
  projectId: string
  createdAt: Date
  status: RequestStatus
  payee: string
  phone: string
  bankName: string
  bankAccount: string
  date: string
  session: string
  committee: Committee
  items: RequestItem[]
  totalAmount: number
  receipts: Receipt[]
  requestedBy: { uid: string; name: string; email: string }
  reviewedBy: { uid: string; name: string; email: string } | null
  reviewedAt: Date | null
  approvedBy: { uid: string; name: string; email: string } | null
  requestedBySignature: string | null
  approvalSignature: string | null
  approvedAt: Date | null
  rejectionReason: string | null
  settlementId: string | null
  originalRequestId: string | null
  comments: string
  isVendorRequest?: boolean
  isCorporateCard?: boolean
  vendorBankBookPath?: string
  vendorBankBookUrl?: string
}

export interface Settlement {
  id: string
  projectId: string
  batchId: string
  createdAt: Date
  createdBy: { uid: string; name: string; email: string }
  payee: string
  phone: string
  bankName?: string
  bankAccount?: string
  bankBookUrl?: string
  session: string
  committee: Committee
  items: RequestItem[]
  totalAmount: number
  receipts: Receipt[]
  requestIds: string[]
  requestedBySignature: string | null
  approvedBy: { uid: string; name: string; email: string } | null
  approvers?: Array<{ uid: string; name: string; email: string }>
  approvalSignature: string | null
  createdBySignature?: string | null
  isCorporateCard?: boolean
}
