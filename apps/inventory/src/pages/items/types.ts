export type SortKey = 'name' | 'stock' | 'location' | 'createdAt'
export type SortDir = 'asc' | 'desc'

export interface EditRow {
  id: string
  name: string
  stock: number
  location: string
  isNew?: boolean
}
