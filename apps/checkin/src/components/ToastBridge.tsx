import { useEffect, useRef } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { useToast } from 'trust-ui-react'
import { toastsAtom, removeToastAtom } from '../stores/toastStore'
import type { ToastType } from '../stores/toastStore'

const typeToVariant: Record<ToastType, 'success' | 'danger' | 'warning' | 'info'> = {
  success: 'success',
  error: 'danger',
  info: 'info',
  warning: 'warning',
}

/**
 * Bridges Jotai-based toasts (from dataStore/scheduleStore) to trust-ui-react ToastProvider.
 * Mount this inside the ToastProvider tree.
 */
export default function ToastBridge() {
  const toasts = useAtomValue(toastsAtom)
  const removeToast = useSetAtom(removeToastAtom)
  const { toast } = useToast()
  const forwarded = useRef(new Set<string>())

  useEffect(() => {
    for (const t of toasts) {
      if (!forwarded.current.has(t.id)) {
        forwarded.current.add(t.id)
        toast({ variant: typeToVariant[t.type] || 'info', message: t.message })
        removeToast(t.id)
      }
    }
  }, [toasts, toast, removeToast])

  return null
}
