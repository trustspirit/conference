import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from './Modal'
import { RequestItem } from '../types'

interface SummaryItem {
  label: string
  value: string
}

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  items: SummaryItem[]
  totalAmount?: number
  totalLabel?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Items for receipt cross-check */
  requestItems?: RequestItem[]
  /** Receipt files for preview */
  receiptFiles?: File[]
}

export default function ConfirmModal({
  open, onClose, onConfirm, title,
  items, totalAmount, totalLabel,
  confirmLabel, cancelLabel,
  requestItems, receiptFiles,
}: Props) {
  const { t } = useTranslation()
  const resolvedTitle = title ?? t('form.confirmTitle')
  const resolvedTotalLabel = totalLabel ?? t('field.totalAmount')
  const resolvedConfirm = confirmLabel ?? t('form.confirmSubmit')
  const resolvedCancel = cancelLabel ?? t('common.cancel')

  const previews = useMemo(() =>
    (receiptFiles || []).map((f) => ({
      url: URL.createObjectURL(f),
      isImage: f.type.startsWith('image/'),
    })), [receiptFiles])

  const hasReceiptPreview = receiptFiles && receiptFiles.length > 0

  return (
    <Modal open={open} onClose={onClose} title={resolvedTitle}
      maxWidth={hasReceiptPreview ? 'max-w-2xl' : 'max-w-md'}>
      <div className="text-sm space-y-2 mb-4">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between">
            <span className="text-gray-500">{item.label}</span>
            <span>{item.value}</span>
          </div>
        ))}
      </div>

      {totalAmount !== undefined && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
          <div className="flex justify-between text-sm font-medium">
            <span>{resolvedTotalLabel}</span>
            <span>₩{totalAmount.toLocaleString()}</span>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            {t('form.totalAmountCheck', { amount: totalAmount.toLocaleString() })}
          </p>
        </div>
      )}

      {/* Receipt preview with items cross-check */}
      {hasReceiptPreview && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-2">{t('form.receiptPreview')}</p>

          {/* Items summary */}
          {requestItems && requestItems.length > 0 && (
            <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs">
              <table className="w-full">
                <tbody>
                  {requestItems.map((item, i) => (
                    <tr key={i}>
                      <td className="py-0.5 text-gray-600">{item.description}</td>
                      <td className="py-0.5 text-right text-gray-900 font-medium">₩{item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Receipt images */}
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
            {receiptFiles!.map((f, i) => (
              <div key={i} className="border border-gray-200 rounded overflow-hidden bg-gray-50">
                {previews[i].isImage ? (
                  <img src={previews[i].url} alt={f.name}
                    className="w-full h-48 object-contain bg-white" />
                ) : (
                  <object data={previews[i].url} type="application/pdf"
                    className="w-full h-48 bg-white">
                    <p className="text-xs text-gray-400 p-2">{f.name}</p>
                  </object>
                )}
                <p className="text-[10px] text-gray-500 px-1.5 py-1 truncate border-t">{f.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">
          {resolvedCancel}
        </button>
        <button onClick={onConfirm}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700">
          {resolvedConfirm}
        </button>
      </div>
    </Modal>
  )
}
