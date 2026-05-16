import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import ChatPanel from './ChatPanel'
import { useChat } from '../../hooks/useChatStream'

function useIsMobile() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('resize', cb)
      return () => window.removeEventListener('resize', cb)
    },
    () => window.innerWidth < 640,
    () => false
  )
}

export default function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false)
  const isMobile = useIsMobile()
  const chat = useChat()
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen || !isMobile) return
    const vv = window.visualViewport
    const el = overlayRef.current
    if (!vv || !el) return

    const sync = () => {
      el.style.top = `${vv.offsetTop}px`
      el.style.height = `${vv.height}px`
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)

    // 배경 스크롤 차단 (메시지 영역 내부 스크롤만 허용)
    const onTouchMove = (e: TouchEvent) => {
      let node = e.target as HTMLElement | null
      while (node && node !== el) {
        if (node.scrollHeight > node.clientHeight && node.classList.contains('overflow-y-auto'))
          return
        node = node.parentElement
      }
      e.preventDefault()
    }
    document.addEventListener('touchmove', onTouchMove, { passive: false })

    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      document.removeEventListener('touchmove', onTouchMove)
    }
  }, [isOpen, isMobile])

  const mobilePanel =
    isOpen && isMobile
      ? createPortal(
          <div
            ref={overlayRef}
            className="fixed left-0 right-0 z-[9999] bg-white"
            style={{ top: 0, height: '100%' }}
          >
            <ChatPanel onClose={() => setIsOpen(false)} chat={chat} fullScreen />
          </div>,
          document.body
        )
      : null

  return (
    <>
      {mobilePanel}
      <div className="fixed bottom-4 right-4 z-50 print:hidden sm:bottom-6 sm:right-6">
        {isOpen && !isMobile && (
          <div className="absolute bottom-16 right-0 chat-panel-enter">
            <ChatPanel onClose={() => setIsOpen(false)} chat={chat} />
          </div>
        )}

        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-finance-primary text-white shadow-lg transition-all hover:bg-finance-primary-hover hover:shadow-xl active:scale-95 animate-pulse-subtle"
            aria-label="Open AI chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-6 w-6"
            >
              <path
                fillRule="evenodd"
                d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </>
  )
}
