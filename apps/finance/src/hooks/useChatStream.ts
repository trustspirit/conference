import { useState, useCallback, useRef } from 'react'
import type { ChatMessage } from '../types/chat'
import { streamChatMessage } from '../services/chatApi'

let messageIdCounter = 0
function nextId(): string {
  return `msg-${++messageIdCounter}-${Date.now()}`
}

export interface UseChatStreamReturn {
  messages: ChatMessage[]
  sendMessage: (content: string) => void
  isStreaming: boolean
  error: string | null
  clearMessages: () => void
}

export function useChatStream(): UseChatStreamReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  // Use ref to avoid stale closure when building API messages
  const messagesRef = useRef<ChatMessage[]>([])
  messagesRef.current = messages

  const sendMessage = useCallback(
    (content: string) => {
      if (isStreaming || !content.trim()) return

      const userMessage: ChatMessage = {
        id: nextId(),
        role: 'user',
        content: content.trim(),
      }

      const assistantId = nextId()
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
      }

      setMessages((prev) => [...prev, userMessage, assistantMessage])
      setIsStreaming(true)
      setError(null)

      const abortController = new AbortController()
      abortRef.current = abortController

      // Build message history from ref (avoids stale closure)
      const apiMessages = [...messagesRef.current, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      let done = false
      streamChatMessage(
        apiMessages,
        {
          onChunk: (text) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + text }
                  : m,
              ),
            )
          },
          onDone: () => {
            if (done) return // Guard against double-fire
            done = true
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, isStreaming: false } : m,
              ),
            )
            setIsStreaming(false)
            abortRef.current = null
          },
          onError: (errorMsg) => {
            if (done) return
            done = true
            setError(errorMsg)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content || errorMsg, isStreaming: false }
                  : m,
              ),
            )
            setIsStreaming(false)
            abortRef.current = null
          },
        },
        abortController.signal,
      )
    },
    [isStreaming],
  )

  const clearMessages = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setIsStreaming(false)
    setError(null)
  }, [])

  return { messages, sendMessage, isStreaming, error, clearMessages }
}
