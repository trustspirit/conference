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
  /** 영수증 PDF 기본 표시 크기. undefined = 'normal' (하위 호환). */
  defaultReceiptDisplaySize?: ReceiptDisplaySize
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

/** 영수증이 PDF에서 렌더되는 크기. 'large'는 한 장에 한 개로 렌더된다. */
export type ReceiptDisplaySize = 'normal' | 'large'

/** storagePath → 표시 크기. 키가 없으면 프로젝트 기본값
 *  (`Project.defaultReceiptDisplaySize`, 그것도 없으면 'normal')을 상속한다.
 *  receipts 배열과 분리된 top-level 맵이라, 스태프가 영수증 신원 필드
 *  (storagePath / url / fileName)에 쓰기 권한 없이 크기만 바꿀 수 있다. */
export type ReceiptDisplaySizes = Record<string, ReceiptDisplaySize>

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
  /** 다른 신청서에서 법인카드 분리로 생성된 경우 원본 신청서 id. */
  splitFromRequestId?: string
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
  /** Read-only fallback; this app never writes it — settlements created here leave it
   *  `undefined`. Used only when the source requests can't be loaded (see `pdfExport.ts`),
   *  in which case every receipt resolves to the project default. Older documents may
   *  still carry a value from a previous implementation. */
  receiptDisplaySizes?: ReceiptDisplaySizes
  requestIds: string[]
  requestedBySignature: string | null
  approvedBy: { uid: string; name: string; email: string } | null
  approvers?: Array<{ uid: string; name: string; email: string }>
  approvalSignature: string | null
  createdBySignature?: string | null
  isCorporateCard?: boolean
}
