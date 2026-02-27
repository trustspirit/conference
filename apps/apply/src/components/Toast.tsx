import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ToastVariant = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

const VARIANT_STYLE: Record<ToastVariant, { bg: string; color: string; border: string }> = {
  success: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  error: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  info: { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = ++nextId
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            maxWidth: '24rem',
          }}
        >
          {toasts.map((t) => {
            const s = VARIANT_STYLE[t.variant]
            return (
              <div
                key={t.id}
                onClick={() => removeToast(t.id)}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${s.border}`,
                  backgroundColor: s.bg,
                  color: s.color,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  cursor: 'pointer',
                  animation: 'toast-in 0.25s ease-out',
                }}
              >
                {t.message}
              </div>
            )
          })}
        </div>
      )}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(0.5rem); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}
