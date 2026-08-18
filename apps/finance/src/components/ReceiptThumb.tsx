import { useState } from 'react'

/** 영수증 썸네일. PDF 와 로드 실패는 라벨로 대체한다. */
export default function ReceiptThumb({ url, fileName }: { url: string; fileName: string }) {
  const [failed, setFailed] = useState(false)
  const isPdf = /\.pdf$/i.test(fileName)
  if (isPdf || failed) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-finance-surface text-[10px] font-semibold text-finance-muted">
        {isPdf ? 'PDF' : 'FILE'}
      </span>
    )
  }
  return (
    <img
      src={url}
      alt={fileName}
      onError={() => setFailed(true)}
      className="h-11 w-11 shrink-0 rounded object-cover bg-finance-surface"
    />
  )
}
