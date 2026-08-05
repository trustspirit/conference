import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@conference/firebase', () => ({
  app: {},
  db: {},
  auth: {},
  functions: {},
  googleProvider: {},
  convertTimestamp: vi.fn(),
  Timestamp: {},
  isInAppBrowser: false
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k })
}))

const toastSpy = vi.fn()
vi.mock('trust-ui-react', () => ({
  useToast: () => ({ toast: toastSpy })
}))

const mutateAsyncSpy = vi.fn()
vi.mock('./queries/useRequests', () => ({
  useUpdateRequestReceiptDisplaySizes: () => ({ mutateAsync: mutateAsyncSpy })
}))

import { useReceiptSizeToggle } from './useReceiptSizeToggle'
import type { PaymentRequest } from '../types'

/** 테스트에 필요한 필드만 채운 최소 request. 나머지 필드는 훅이 읽지 않는다. */
function req(
  id: string,
  storagePaths: string[],
  receiptDisplaySizes?: Record<string, 'large'>
): PaymentRequest {
  return {
    id,
    receipts: storagePaths.map((p) => ({ fileName: `${p}.jpg`, storagePath: p })),
    receiptDisplaySizes
  } as unknown as PaymentRequest
}

describe('useReceiptSizeToggle', () => {
  beforeEach(() => {
    toastSpy.mockReset()
    mutateAsyncSpy.mockReset()
    mutateAsyncSpy.mockResolvedValue(undefined)
  })

  it('여러 request의 displaySizes를 하나의 맵으로 병합한다', () => {
    const { result } = renderHook(() =>
      useReceiptSizeToggle(
        [req('r1', ['a', 'b'], { a: 'large' }), req('r2', ['c'], { c: 'large' })],
        'p1',
        true
      )
    )
    expect(result.current.displaySizes).toEqual({ a: 'large', c: 'large' })
  })

  it('enabled=false 이면 토글 핸들러를 주지 않지만 displaySizes는 그대로 준다', () => {
    const { result } = renderHook(() =>
      useReceiptSizeToggle([req('r1', ['a'], { a: 'large' })], 'p1', false)
    )
    expect(result.current.onToggleDisplaySize).toBeUndefined()
    expect(result.current.displaySizes).toEqual({ a: 'large' })
  })

  it("'large' 토글은 그 영수증을 소유한 request 문서만 갱신한다", async () => {
    const { result } = renderHook(() =>
      useReceiptSizeToggle([req('r1', ['a']), req('r2', ['c'])], 'p1', true)
    )
    await act(async () => {
      await result.current.onToggleDisplaySize!('c', 'large')
    })
    expect(mutateAsyncSpy).toHaveBeenCalledTimes(1)
    expect(mutateAsyncSpy).toHaveBeenCalledWith({
      requestId: 'r2',
      projectId: 'p1',
      receiptDisplaySizes: { c: 'large' }
    })
  })

  it("'normal' 토글은 키를 삭제하고 같은 request의 다른 키는 보존한다", async () => {
    const { result } = renderHook(() =>
      useReceiptSizeToggle([req('r1', ['a', 'b'], { a: 'large', b: 'large' })], 'p1', true)
    )
    await act(async () => {
      await result.current.onToggleDisplaySize!('a', 'normal')
    })
    expect(mutateAsyncSpy).toHaveBeenCalledWith({
      requestId: 'r1',
      projectId: 'p1',
      receiptDisplaySizes: { b: 'large' }
    })
  })

  it('소유 request를 찾을 수 없으면 저장하지 않고 실패 토스트를 띄운다', async () => {
    const { result } = renderHook(() => useReceiptSizeToggle([req('r1', ['a'])], 'p1', true))
    await act(async () => {
      await result.current.onToggleDisplaySize!('nope', 'large')
    })
    expect(mutateAsyncSpy).not.toHaveBeenCalled()
    expect(toastSpy).toHaveBeenCalledWith({
      variant: 'danger',
      message: 'receipts.sizeUpdateFailed'
    })
  })

  it('projectId가 없으면 저장하지 않고 실패 토스트를 띄운다', async () => {
    const { result } = renderHook(() =>
      useReceiptSizeToggle([req('r1', ['a'])], undefined, true)
    )
    await act(async () => {
      await result.current.onToggleDisplaySize!('a', 'large')
    })
    expect(mutateAsyncSpy).not.toHaveBeenCalled()
    expect(toastSpy).toHaveBeenCalledWith({
      variant: 'danger',
      message: 'receipts.sizeUpdateFailed'
    })
  })

  it('뮤테이션이 실패하면 실패 토스트를 띄운다', async () => {
    mutateAsyncSpy.mockRejectedValue(new Error('permission-denied'))
    const { result } = renderHook(() => useReceiptSizeToggle([req('r1', ['a'])], 'p1', true))
    await act(async () => {
      await result.current.onToggleDisplaySize!('a', 'large')
    })
    expect(toastSpy).toHaveBeenCalledWith({
      variant: 'danger',
      message: 'receipts.sizeUpdateFailed'
    })
  })

  it('requests가 undefined여도 터지지 않는다', () => {
    const { result } = renderHook(() => useReceiptSizeToggle(undefined, 'p1', true))
    expect(result.current.displaySizes).toEqual({})
  })
})
