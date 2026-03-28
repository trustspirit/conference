import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import './scroll-lock.css'
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

  // 모바일 전체화면 챗봇 열림 시 배경 스크롤 완전 차단 (iOS Safari 대응)
  const scrollYRef = useRef(0)
  useEffect(() => {
    if (!isOpen || !isMobile) return
    scrollYRef.current = window.scrollY
    const { style } = document.documentElement
    style.setProperty('--scroll-lock-top', `-${scrollYRef.current}px`)
    document.documentElement.classList.add('scroll-locked')
    return () => {
      document.documentElement.classList.remove('scroll-locked')
      style.removeProperty('--scroll-lock-top')
      window.scrollTo(0, scrollYRef.current)
    }
  }, [isOpen, isMobile])

  // 모바일 전체화면은 Portal로 body에 직접 렌더링 (부모 DOM에서 분리)
  const mobilePanel = isOpen && isMobile
    ? createPortal(
        <div className="fixed inset-0 z-[9999]">
          <ChatPanel onClose={() => setIsOpen(false)} chat={chat} fullScreen />
        </div>,
        document.body
      )
    : null

  return (
    <>
      {mobilePanel}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Desktop popup */}
        {isOpen && !isMobile && (
          <div className="absolute bottom-16 right-0 chat-panel-enter">
            <ChatPanel onClose={() => setIsOpen(false)} chat={chat} />
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
    </>
  )
}
