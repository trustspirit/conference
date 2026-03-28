import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { UseChatReturn } from '../../hooks/useChatStream'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'

interface Props {
  onClose: () => void
  chat: UseChatReturn
  fullScreen?: boolean
}

export default function ChatPanel({ onClose, chat, fullScreen }: Props) {
  const { t } = useTranslation()
  const { messages, sendMessage, isLoading, error, isLimitReached } = chat
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [vpHeight, setVpHeight] = useState<number | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, isLoading, scrollToBottom])

  // visualViewport로 키보드 높이 대응 (카카오톡 UX)
  useEffect(() => {
    if (!fullScreen || !window.visualViewport) return
    const vv = window.visualViewport
    const onResize = () => {
      setVpHeight(vv.height)
      requestAnimationFrame(scrollToBottom)
    }
    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [fullScreen, scrollToBottom])

  return (
    <div
      ref={containerRef}
      className={fullScreen
        ? "flex w-full flex-col overflow-hidden bg-white"
        : "flex h-[500px] w-[380px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      }
      style={fullScreen && vpHeight ? { height: vpHeight } : fullScreen ? { height: '100%' } : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-blue-600 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">{t('chat.title')}</h3>
        <button
          onClick={onClose}
          className="text-white/80 transition-colors hover:text-white"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {/* Welcome message */}
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-800">
            {t('chat.welcome')}
          </div>
        </div>

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-gray-100 px-3 py-2">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.3s]" />
              </span>
            </div>
          </div>
        )}

        {error && <div className="text-center text-xs text-red-500">{t('chat.error')}</div>}

        {isLimitReached && (
          <div className="mx-2 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
            {t('chat.limitReached')}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isLoading || isLimitReached} />
    </div>
  )
}
