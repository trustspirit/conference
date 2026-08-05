import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from 'trust-ui-react'
import { useUpdateRequestReceiptDisplaySizes } from './queries/useRequests'
import type { PaymentRequest, ReceiptDisplaySize, ReceiptDisplaySizes } from '../types'

export interface ReceiptSizeToggle {
  /** storagePath → 명시적 표시 크기 병합 맵. 권한과 무관하게 항상 채워진다 (배지 표시용). */
  displaySizes: ReceiptDisplaySizes
  /** `enabled`가 false이거나 소유 신청서 인덱스가 비어 있으면(예: 로드 실패) undefined —
   *  ReceiptGallery가 토글 버튼을 숨긴다. 실패할 수밖에 없는 버튼을 보여주지 않기 위함. */
  onToggleDisplaySize?: (storagePath: string, next: 'normal' | 'large') => Promise<void>
  /** 저장 중이면 true. `enabled`가 false일 때도 항상 채워진다 (그때는 항상 false). */
  isPending: boolean
  /** 프로젝트의 기본 표시 크기. 그대로 ReceiptGallery의 `defaultSize` prop으로 스프레드된다. */
  defaultSize?: ReceiptDisplaySize
}

/**
 * 영수증의 PDF 표시 크기 토글을 여러 갤러리에서 공유하기 위한 훅.
 *
 * 값은 언제나 **원본 신청서 문서**(`requests/{id}.receiptDisplaySizes`)에 저장된다.
 * `pdfExport`가 원본 신청서를 PDF 소스로 삼기 때문에, 정산서 화면에서 눌러도 결과가
 * 그대로 PDF에 반영된다. 정산서의 `receipts`는 신청서 스냅샷이라 `storagePath`가
 * 동일하므로, 역인덱스로 소유 신청서를 되찾을 수 있다.
 *
 * 훅은 `map()` 안에서 호출할 수 없으므로 페이지 상단에서 한 번 호출하고 모든 갤러리가
 * 결과를 공유한다. 훅 호출 횟수는 `requests` 길이와 무관하게 고정이다.
 *
 * 표시 크기는 3상태 모델을 따른다: 명시적으로 저장된 값 > 프로젝트 기본값(`projectDefault`)
 * > `'normal'`. 그래서 토글은 'normal'로 되돌릴 때도 키를 지우지 않고 값을 명시 저장한다 —
 * 키 삭제는 "기본값 상속"을 뜻하게 되므로, 프로젝트 기본값이 'large'인 경우 의도와 달라진다.
 */
export function useReceiptSizeToggle(
  requests: PaymentRequest[] | undefined,
  projectId: string | undefined,
  enabled: boolean,
  projectDefault?: ReceiptDisplaySize
): ReceiptSizeToggle {
  const { t } = useTranslation()
  const { toast } = useToast()
  const mutation = useUpdateRequestReceiptDisplaySizes()

  const { displaySizes, ownerByPath } = useMemo(() => {
    const sizes: ReceiptDisplaySizes = {}
    const owner = new Map<string, PaymentRequest>()
    for (const request of requests ?? []) {
      Object.assign(sizes, request.receiptDisplaySizes ?? {})
      for (const receipt of request.receipts ?? []) {
        // 나중에 오는 신청서가 이기지 않도록 첫 소유자를 유지한다. storagePath는
        // Storage 전역에서 유일하므로 실제로 충돌하는 경우는 없다.
        if (receipt.storagePath && !owner.has(receipt.storagePath)) {
          owner.set(receipt.storagePath, request)
        }
      }
    }
    return { displaySizes: sizes, ownerByPath: owner }
  }, [requests])

  if (!enabled) return { displaySizes, isPending: false, defaultSize: projectDefault }
  // 소유 신청서 인덱스가 비어 있으면 (예: `useRequestsByIds`가 아직 안 불러왔거나 실패한 경우)
  // 어떤 토글도 성공할 수 없다. 실패할 수밖에 없는 버튼 대신 아예 숨긴다.
  if (ownerByPath.size === 0) return { displaySizes, isPending: false, defaultSize: projectDefault }

  const onToggleDisplaySize = async (storagePath: string, next: 'normal' | 'large') => {
    const owner = ownerByPath.get(storagePath)
    // 원본 신청서가 삭제됐거나 프로젝트가 아직 안 잡힌 경우. 버튼이 조용히 아무 일도
    // 안 하는 대신 실패를 알린다.
    if (!owner || !projectId) {
      toast({ variant: 'danger', message: t('receipts.sizeUpdateFailed') })
      return
    }
    // 두 값 모두 명시 저장한다. 프로젝트 기본값이 'large'일 수 있으므로 키를 지우면
    // '일반'이 아니라 '기본값 상속'을 뜻하게 되어 의도와 달라진다.
    const map: ReceiptDisplaySizes = { ...(owner.receiptDisplaySizes ?? {}) }
    map[storagePath] = next

    try {
      await mutation.mutateAsync({
        requestId: owner.id,
        projectId,
        receiptDisplaySizes: map
      })
    } catch {
      toast({ variant: 'danger', message: t('receipts.sizeUpdateFailed') })
    }
  }

  return {
    displaySizes,
    onToggleDisplaySize,
    isPending: mutation.isPending,
    defaultSize: projectDefault
  }
}
