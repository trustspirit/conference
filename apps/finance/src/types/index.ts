// UserRole — removed in Phase H (superseded by ProjectRole + SystemRole)

export type SystemRole = 'super_admin' | 'admin' | 'member'

export type ProjectRole =
  | 'admin'
  | 'finance_ops'
  | 'approver_ops'
  | 'finance_prep'
  | 'approver_prep'
  | 'session_director'
  | 'logistic_admin'
  | 'executive'
  | 'user'

export interface ProjectBudgetConfig {
  totalBudget: number
  byCode: Record<number, number>
}

export interface OpsBudgetCategory {
  id: string
  name: string
  budgetCode: number
  allocatedKrw: number
  sortIndex: number
  color?: string
}

export interface OpsBudget {
  categories: OpsBudgetCategory[]
  totalKrw?: number    // undefined/0 means no constraint
  /** @deprecated read fallback only — write to project.usdToKrwRate instead */
  usdToKrwRate?: number
  updatedAt: Date
  updatedBy: { uid: string; name: string; email: string }
}

export interface OpsBudgetInclusionSnapshot {
  amount: number
  amountUsd: number
  currency: Currency
  budgetCode: number
  budgetDescKey?: string
  description: string
  payee: string
  /** Snapshot of req.requestedBy.name at inclusion time. Optional for legacy items. */
  submitterName?: string
  date: string
  session: string
  requestStatus: RequestStatus
}

export interface OpsBudgetInclusion {
  id: string
  categoryId: string
  requestId: string
  itemIndex: number
  snapshot: OpsBudgetInclusionSnapshot
  addedBy: { uid: string; name: string; email: string }
  addedAt: Date
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
  // memberUids: string[] — removed in Phase H
  memberRoles: Record<string /* uid */, ProjectRole>
  isActive: boolean
  deletedAt?: Date | null
  opsBudget?: OpsBudget
  /** USD → KRW rate applied across all dashboards. 0/undefined = USD not converted. */
  usdToKrwRate?: number
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
  systemRole: SystemRole
  /** Maintained by `onProjectMembersWrite` trigger. */
  assignedProjectCount: number
  // role: UserRole       — removed in Phase H
  // projectIds: string[] — removed in Phase H
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

export type Currency = 'KRW' | 'USD'

export interface RequestItem {
  description: string
  budgetCode: number
  budgetDescKey?: string
  amount: number
  /** Optional — undefined treated as 'KRW' for backwards compatibility with legacy items */
  currency?: Currency
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

/** Storage-path → display-size override for PDF rendering. Only `large` is stored
 *  explicitly; absence implies the default `normal` size. Kept as a top-level map so
 *  staff can flip a flag without ever gaining write access to receipt identity fields
 *  (`storagePath`, `url`, `fileName`). */
export type ReceiptDisplaySizes = Record<string, 'large'>

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
  /** Optional USD sum — undefined treated as 0 for backwards compatibility */
  totalAmountUsd?: number
  receipts: Receipt[]
  /** Per-receipt PDF display-size override, keyed by `storagePath`. */
  receiptDisplaySizes?: ReceiptDisplaySizes
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
  /** Optional USD sum — undefined treated as 0 for backwards compatibility */
  totalAmountUsd?: number
  /** Settlement currency. Undefined on legacy docs (may contain mixed-currency items). */
  currency?: Currency
  receipts: Receipt[]
  /** Inherited from the source request(s) at settlement creation time. */
  receiptDisplaySizes?: ReceiptDisplaySizes
  requestIds: string[]
  requestedBySignature: string | null
  approvedBy: { uid: string; name: string; email: string } | null
  approvers?: Array<{ uid: string; name: string; email: string }>
  approvalSignature: string | null
  createdBySignature?: string | null
  isCorporateCard?: boolean
}
