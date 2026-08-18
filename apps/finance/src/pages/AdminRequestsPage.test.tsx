import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminRequestsPage from './AdminRequestsPage'

// Capture the `sort` argument passed to useInfiniteRequests on every render so we
// can assert what the page actually asks Firestore to order by.
const { sortCalls, argCalls, mockItems } = vi.hoisted(() => ({
  sortCalls: [] as Array<{ field: string; dir: string } | undefined>,
  argCalls: [] as Array<{ committee?: string; corporateCardOnly?: boolean }>,
  mockItems: { current: [] as Array<Record<string, unknown>> }
}))

vi.mock('../hooks/queries/useRequests', () => ({
  useInfiniteRequests: (
    _projectId: string | undefined,
    _status: unknown,
    sort: { field: string; dir: string } | undefined,
    committee?: string,
    corporateCardOnly?: boolean
  ) => {
    sortCalls.push(sort)
    argCalls.push({ committee, corporateCardOnly })
    return {
      data: { pages: [{ items: mockItems.current }] },
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn()
    }
  },
  fetchAllRequests: vi.fn()
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } })
}))
vi.mock('../components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))
vi.mock('../components/CsvExportDialog', () => ({ default: () => null }))
vi.mock('../components/InfiniteScrollSentinel', () => ({ default: () => null }))
vi.mock('../contexts/ProjectContext', () => ({
  useProject: () => ({ currentProject: { id: 'p1', directorApprovalThreshold: 600000 } })
}))
vi.mock('../hooks/useProjectRole', () => ({ useProjectRole: () => 'admin' }))
vi.mock('trust-ui-react', () => ({
  Select: ({
    value,
    onChange,
    options
  }: {
    value: string
    onChange: (v: string) => void
    options: Array<{ value: string; label: string }>
  }) => (
    <select data-testid="sort-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
  useToast: () => ({ toast: vi.fn() })
}))

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    projectId: 'p1',
    status: 'pending',
    committee: 'operations',
    date: '2026-08-10',
    payee: '홍길동',
    totalAmount: 100000,
    totalAmountUsd: 0,
    items: [],
    receipts: [],
    requestedBy: { uid: 'u1', name: 'A', email: 'a@example.com' },
    reviewedBy: null,
    approvedBy: null,
    createdAt: null,
    originalRequestId: null,
    rejectionReason: null,
    settlementId: null,
    ...overrides
  }
}

describe('AdminRequestsPage sorting', () => {
  beforeEach(() => {
    sortCalls.length = 0
    argCalls.length = 0
    mockItems.current = []
  })

  it('switching to a different sort column updates the sort field, not just the direction', () => {
    render(
      <MemoryRouter initialEntries={['/admin/requests']}>
        <AdminRequestsPage />
      </MemoryRouter>
    )
    sortCalls.length = 0

    // Default sort is date/desc. Click the 신청자(payee) column header.
    fireEvent.click(screen.getByText('field.payee'))

    const last = sortCalls[sortCalls.length - 1]
    // Bug: the second setSearchParams (dir) clobbers the first (sort), so the page
    // ends up still ordered by 'date' instead of 'payee'.
    expect(last).toEqual({ field: 'payee', dir: 'asc' })
  })

  it('mobile sort selector applies both field and direction together', () => {
    render(
      <MemoryRouter initialEntries={['/admin/requests']}>
        <AdminRequestsPage />
      </MemoryRouter>
    )
    sortCalls.length = 0

    fireEvent.change(screen.getByTestId('sort-select'), { target: { value: 'totalAmount-desc' } })

    const last = sortCalls[sortCalls.length - 1]
    expect(last).toEqual({ field: 'totalAmount', dir: 'desc' })
  })
})

describe('AdminRequestsPage corporate card badge', () => {
  beforeEach(() => {
    sortCalls.length = 0
    argCalls.length = 0
    mockItems.current = []
  })

  it('renders the badge only for corporate card requests', () => {
    mockItems.current = [
      makeRequest({ id: 'r1', isCorporateCard: true }),
      makeRequest({ id: 'r2' })
    ]

    render(
      <MemoryRouter initialEntries={['/admin/requests']}>
        <AdminRequestsPage />
      </MemoryRouter>
    )

    // 데스크톱 테이블과 모바일 카드가 둘 다 DOM 에 있으므로 법인카드 1건당 2개가 렌더된다.
    // 숨김은 CSS 클래스로만 이뤄지고 jsdom 은 그것을 제거하지 않는다.
    expect(screen.getAllByText('form.requestTypeCorporateCardShort')).toHaveLength(2)
  })

  it('renders no badge when no request is a corporate card', () => {
    mockItems.current = [makeRequest({ id: 'r1' }), makeRequest({ id: 'r2' })]

    render(
      <MemoryRouter initialEntries={['/admin/requests']}>
        <AdminRequestsPage />
      </MemoryRouter>
    )

    expect(screen.queryByText('form.requestTypeCorporateCardShort')).toBeNull()
  })
})

describe('AdminRequestsPage corporate card filter', () => {
  beforeEach(() => {
    sortCalls.length = 0
    argCalls.length = 0
    mockItems.current = []
  })

  it('passes corporateCardOnly to the query when the URL param is set', () => {
    render(
      <MemoryRouter initialEntries={['/admin/requests?type=corporate_card']}>
        <AdminRequestsPage />
      </MemoryRouter>
    )

    expect(argCalls[argCalls.length - 1].corporateCardOnly).toBe(true)
  })

  it('does not pass corporateCardOnly by default', () => {
    render(
      <MemoryRouter initialEntries={['/admin/requests']}>
        <AdminRequestsPage />
      </MemoryRouter>
    )

    expect(argCalls[argCalls.length - 1].corporateCardOnly).toBe(false)
  })

  it('turns the filter on when the chip is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/admin/requests']}>
        <AdminRequestsPage />
      </MemoryRouter>
    )
    argCalls.length = 0

    fireEvent.click(screen.getByText('filter.corporateCardOnly'))

    expect(argCalls[argCalls.length - 1].corporateCardOnly).toBe(true)
  })

  it('hides the sort selector and shows the lock notice while the filter is on', () => {
    render(
      <MemoryRouter initialEntries={['/admin/requests?type=corporate_card']}>
        <AdminRequestsPage />
      </MemoryRouter>
    )

    expect(screen.queryByTestId('sort-select')).toBeNull()
    expect(screen.getAllByText('filter.sortLockedByCorporateCard').length).toBeGreaterThan(0)
  })

  it('ignores header clicks for sorting while the filter is on', () => {
    render(
      <MemoryRouter initialEntries={['/admin/requests?type=corporate_card']}>
        <AdminRequestsPage />
      </MemoryRouter>
    )
    sortCalls.length = 0

    fireEvent.click(screen.getByText('field.payee'))

    // 정렬이 잠겨 있으므로 URL 이 바뀌지 않고 새 쿼리 인자도 생기지 않는다.
    expect(sortCalls).toHaveLength(0)
  })
})
