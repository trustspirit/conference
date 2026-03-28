import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import ChatPanel from './ChatPanel'
import { useChat } from '../../hooks/useChatStream'

function useIsMobile() {
  return useSyncExternalStore(
    (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) },
    () => window.innerWidth < 640,
    () => false
  )
}

export default function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false)
  const isMobile = useIsMobile()
  const chat = useChat()

  // 모바일 전체화면 챗봇 열림 시 배경 터치 스크롤 차단
  const overlayRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!isOpen || !isMobile) return
    const el = overlayRef.current
    if (!el) return
    // 오버레이 바깥의 터치 스크롤을 차단 (내부 스크롤 영역은 overscroll-contain으로 처리)
    const prevent = (e: TouchEvent) => {
      if (e.target === el) e.preventDefault()
    }
    el.addEventListener('touchmove', prevent, { passive: false })
    return () => el.removeEventListener('touchmove', prevent)
  }, [isOpen, isMobile])

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Panel - single instance, full screen on mobile */}
      {isOpen && (
        <div
          ref={isMobile ? overlayRef : undefined}
          className={isMobile
            ? "fixed inset-0 z-50"
            : "absolute bottom-16 right-0 chat-panel-enter"
          }
        >
          <ChatPanel onClose={() => setIsOpen(false)} chat={chat} fullScreen={isMobile} />
        </div>
      )}

      {/* FAB Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl active:scale-95 animate-pulse-subtle"
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
  )
}
