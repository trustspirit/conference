import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminRequestsPage from './AdminRequestsPage'

// Capture the `sort` argument passed to useInfiniteRequests on every render so we
// can assert what the page actually asks Firestore to order by.
const { sortCalls } = vi.hoisted(() => ({
  sortCalls: [] as Array<{ field: string; dir: string } | undefined>
}))

vi.mock('../hooks/queries/useRequests', () => ({
  useInfiniteRequests: (
    _projectId: string | undefined,
    _status: unknown,
    sort: { field: string; dir: string } | undefined
  ) => {
    sortCalls.push(sort)
    return {
      data: { pages: [{ items: [] }] },
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

describe('AdminRequestsPage sorting', () => {
  beforeEach(() => {
    sortCalls.length = 0
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
