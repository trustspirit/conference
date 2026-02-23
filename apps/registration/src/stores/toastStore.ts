import { atom } from 'jotai'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

export const toastsAtom = atom<Toast[]>([])

export const addToastAtom = atom(null, (get, set, toast: Omit<Toast, 'id'>) => {
  const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const newToast: Toast = { ...toast, id }
  set(toastsAtom, [...get(toastsAtom), newToast])

  const duration = toast.duration ?? 3000
  if (duration > 0) {
    setTimeout(() => {
      set(toastsAtom, (toasts) => toasts.filter((t) => t.id !== id))
    }, duration)
  }
})

export const removeToastAtom = atom(null, (get, set, id: string) => {
  set(toastsAtom, (toasts) => toasts.filter((t) => t.id !== id))
})
