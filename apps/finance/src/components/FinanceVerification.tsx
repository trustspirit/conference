interface Props {
  documentNo?: string
}

export default function FinanceVerification({ documentNo = '' }: Props) {
  return (
    <div className="mb-6 border border-finance-border rounded-lg p-4">
      <h3 className="text-sm font-semibold text-finance-primary mb-3">
        Area Office Finance Verification
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-finance-muted">Document No.</p>
          <p className="font-mono font-medium">{documentNo || '-'}</p>
        </div>
        <div>
          <p className="text-xs text-finance-muted">Signature</p>
          <div className="border-b border-finance-border h-8" />
        </div>
        <div>
          <p className="text-xs text-finance-muted">Date approved</p>
          <div className="border-b border-finance-border h-6" />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xs text-finance-muted">Additional Information / Comments</p>
        <div className="border-b border-finance-border h-8" />
      </div>
    </div>
  )
}
