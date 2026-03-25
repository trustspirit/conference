import type { SortKey, SortDir } from '../../pages/items/types'

export interface ItemsFilterParams {
  projectId: string
  search: string
  locationFilter: string
  sortKey: SortKey
  sortDir: SortDir
}

export const queryKeys = {
  items: {
    all: (projectId: string) => ['inventory-items', projectId] as const,
    infinite: (params: ItemsFilterParams) => ['inventory-items', 'infinite', params] as const,
    detail: (id: string) => ['inventory-items', 'detail', id] as const,
    dangling: () => ['inventory-items', 'dangling'] as const,
    allItems: () => ['inventory-items', 'all'] as const
  },
  projects: {
    all: () => ['inventory-projects'] as const,
    detail: (id: string) => ['inventory-projects', id] as const
  },
  users: {
    all: () => ['inventory-users'] as const,
    detail: (uid: string) => ['inventory-users', uid] as const
  }
} as const
