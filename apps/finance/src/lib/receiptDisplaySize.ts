import type { ReceiptDisplaySize, ReceiptDisplaySizes } from '../types'

/** 프로젝트 설정이 없을 때의 크기. 이 기능 이전의 하드코딩 동작과 같다. */
export const DEFAULT_RECEIPT_DISPLAY_SIZE: ReceiptDisplaySize = 'normal'

/**
 * 영수증 하나의 최종 표시 크기를 정한다: 명시값 > 프로젝트 기본값 > 'normal'.
 *
 * 갤러리(배지·토글 버튼), PDF 렌더, 토글 훅이 모두 이 함수만 쓴다. 판정이 흩어지면
 * 화면에 보이는 상태와 PDF 결과가 어긋나기 때문이다.
 */
export function resolveReceiptDisplaySize(
  sizes: ReceiptDisplaySizes | undefined,
  storagePath: string,
  projectDefault: ReceiptDisplaySize | undefined
): ReceiptDisplaySize {
  return sizes?.[storagePath] ?? projectDefault ?? DEFAULT_RECEIPT_DISPLAY_SIZE
}
