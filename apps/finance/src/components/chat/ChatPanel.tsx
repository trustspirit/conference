import { useEffect, useRef, useCallback } from 'react'
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

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  // 키보드 열릴 때 최신 메시지로 스크롤
  useEffect(() => {
    if (!fullScreen || !window.visualViewport) return
    const onResize = () => requestAnimationFrame(scrollToBottom)
    window.visualViewport.addEventListener('resize', onResize)
    return () => window.visualViewport?.removeEventListener('resize', onResize)
  }, [fullScreen, scrollToBottom])

  return (
    <div
      className={
        fullScreen
          ? 'flex h-full w-full flex-col bg-white'
          : 'flex h-[500px] w-[380px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl'
      }
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between bg-finance-primary px-4 py-3">
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
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-lg bg-finance-primary-subtle px-3 py-2 text-sm text-finance-primary-hover">
            {t('chat.welcome')}
          </div>
        </div>

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-finance-primary-subtle px-3 py-2">
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
      <div className="shrink-0">
        <ChatInput onSend={sendMessage} disabled={isLoading || isLimitReached} />
      </div>
    </div>
  )
}
