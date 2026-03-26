import { useState, useCallback, useRef } from 'react'
import type { ChatMessage } from '../types/chat'
import { sendChatMessage } from '../services/chatApi'

const MAX_MESSAGES = 20

let messageIdCounter = 0
function nextId(): string {
  return `msg-${++messageIdCounter}-${Date.now()}`
}

export interface UseChatReturn {
  messages: ChatMessage[]
  sendMessage: (content: string) => void
  isLoading: boolean
  error: string | null
  isLimitReached: boolean
  clearMessages: () => void
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesRef = useRef<ChatMessage[]>([])
  messagesRef.current = messages

  const isLimitReached = messages.length >= MAX_MESSAGES

  const sendMessage = useCallback(
    async (content: string) => {
      if (isLoading || !content.trim() || isLimitReached) return

      const userMessage: ChatMessage = {
        id: nextId(),
        role: 'user',
        content: content.trim()
      }

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)
      setError(null)

      const apiMessages = [...messagesRef.current, userMessage].map((m) => ({
        role: m.role,
        content: m.content
      }))

      try {
        const reply = await sendChatMessage(apiMessages)
        const assistantMessage: ChatMessage = {
          id: nextId(),
          role: 'assistant',
          content: reply
        }
        setMessages((prev) => [...prev, assistantMessage])
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An error occurred'
        setError(errorMsg)
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, isLimitReached]
  )

  const clearMessages = useCallback(() => {
    setMessages([])
    setIsLoading(false)
    setError(null)
  }, [])

  return { messages, sendMessage, isLoading, error, isLimitReached, clearMessages }
}
