interface Props {
  documentNo?: string
}

export default function FinanceVerification({ documentNo = '' }: Props) {
  return (
    <div className="mb-6 border border-[#D8DDE5] rounded-lg p-4">
      <h3 className="text-sm font-semibold text-[#002C5F] mb-3">
        Area Office Finance Verification
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-[#667085]">Document No.</p>
          <p className="font-mono font-medium">{documentNo || '-'}</p>
        </div>
        <div>
          <p className="text-xs text-[#667085]">Signature</p>
          <div className="border-b border-[#D8DDE5] h-8" />
        </div>
        <div>
          <p className="text-xs text-[#667085]">Date approved</p>
          <div className="border-b border-[#D8DDE5] h-6" />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xs text-[#667085]">Additional Information / Comments</p>
        <div className="border-b border-[#D8DDE5] h-8" />
      </div>
    </div>
  )
}
