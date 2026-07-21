import { describe, it, expect, vi } from 'vitest'

// pdfExport imports pdfjs-dist at module load, which references DOMMatrix (absent
// in jsdom). expandReceiptImages is pure and never touches pdfjs, so stub the module.
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn()
}))
vi.mock('@conference/firebase', () => ({ functions: {} }))

import { expandReceiptImages } from './pdfExport'
import type { Receipt } from '../types'

const receipt = (fileName: string): Receipt => ({
  fileName,
  storagePath: fileName,
  url: `https://x/${fileName}`
})

describe('expandReceiptImages', () => {
  it('renders every page of a multi-page PDF receipt as its own card', () => {
    const entries = [{ label: '#1 Alice', receipt: receipt('invoice.pdf') }]
    const images = [
      { fileName: 'invoice.pdf', dataUrls: ['data:img/p1', 'data:img/p2', 'data:img/p3'] }
    ]

    const result = expandReceiptImages(entries, images)

    expect(result).toHaveLength(3)
    expect(result.map((r) => r.img.dataUrl)).toEqual(['data:img/p1', 'data:img/p2', 'data:img/p3'])
    // Same receipt number badge across all pages, page fraction in the filename
    expect(result.every((r) => r.nr.label === '#1 Alice')).toBe(true)
    expect(result.map((r) => r.img.fileName)).toEqual([
      'invoice.pdf (1/3)',
      'invoice.pdf (2/3)',
      'invoice.pdf (3/3)'
    ])
  })

  it('keeps a single-page receipt filename unchanged (no page suffix)', () => {
    const entries = [{ label: '#1 Bob', receipt: receipt('photo.jpg') }]
    const images = [{ fileName: 'photo.jpg', dataUrls: ['data:img/only'] }]

    const result = expandReceiptImages(entries, images)

    expect(result).toHaveLength(1)
    expect(result[0].img.fileName).toBe('photo.jpg')
    expect(result[0].img.dataUrl).toBe('data:img/only')
  })

  it('preserves a failed receipt as a single null-image card', () => {
    const entries = [{ label: '#1 Carol', receipt: receipt('broken.pdf') }]
    const images = [{ fileName: 'broken.pdf', dataUrls: [null] }]

    const result = expandReceiptImages(entries, images)

    expect(result).toHaveLength(1)
    expect(result[0].img.dataUrl).toBeNull()
    expect(result[0].img.fileName).toBe('broken.pdf')
  })

  it('carries the large display-size hint onto every page of a receipt', () => {
    const entries = [
      { label: '#1 Dave', receipt: receipt('contract.pdf'), displaySize: 'large' as const }
    ]
    const images = [{ fileName: 'contract.pdf', dataUrls: ['data:p1', 'data:p2'] }]

    const result = expandReceiptImages(entries, images)

    expect(result).toHaveLength(2)
    expect(result.every((r) => r.nr.displaySize === 'large')).toBe(true)
  })

  it('expands multiple receipts independently and in order', () => {
    const entries = [
      { label: '#1 Eve', receipt: receipt('a.pdf') },
      { label: '#2 Eve', receipt: receipt('b.jpg') }
    ]
    const images = [
      { fileName: 'a.pdf', dataUrls: ['data:a1', 'data:a2'] },
      { fileName: 'b.jpg', dataUrls: ['data:b1'] }
    ]

    const result = expandReceiptImages(entries, images)

    expect(result.map((r) => r.nr.label)).toEqual(['#1 Eve', '#1 Eve', '#2 Eve'])
    expect(result.map((r) => r.img.dataUrl)).toEqual(['data:a1', 'data:a2', 'data:b1'])
  })
})
