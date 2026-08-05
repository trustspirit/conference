import type { ReceiptDisplaySize, ReceiptDisplaySizes } from '../types'

/** 프로젝트 설정이 없을 때의 크기. 이 기능 이전의 하드코딩 동작과 같다. */
export const DEFAULT_RECEIPT_DISPLAY_SIZE: ReceiptDisplaySize = 'normal'

/**
 * 영수증 하나의 최종 표시 크기를 정한다: 명시값 > 프로젝트 기본값 > 'normal'.
 *
 * 갤러리(배지·토글 버튼), PDF 렌더, 토글 훅이 모두 이 함수만 쓴다. 판정이 흩어지면
 * 화면에 보이는 상태와 PDF 결과가 어긋나기 때문이다.
 *
 * `storagePath`가 비어 있으면 (Storage 이전 레거시 영수증) 프로젝트 기본값을 무시하고
 * 'normal'을 준다. storagePath가 곧 영수증의 신원이라 오버라이드를 저장할 키가 없고,
 * 갤러리도 그래서 토글 버튼을 숨긴다. 되돌릴 수단이 없는 영수증을 기본값 'large'가
 * 쓸어담으면 한 장에 한 개로 영영 고정되므로 여기서 끊는다.
 */
export function resolveReceiptDisplaySize(
  sizes: ReceiptDisplaySizes | undefined,
  storagePath: string,
  projectDefault: ReceiptDisplaySize | undefined
): ReceiptDisplaySize {
  if (!storagePath) return DEFAULT_RECEIPT_DISPLAY_SIZE
  return sizes?.[storagePath] ?? projectDefault ?? DEFAULT_RECEIPT_DISPLAY_SIZE
}
