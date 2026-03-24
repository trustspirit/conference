import { auth } from '@conference/firebase'
import type { ChatMessage } from '../types/chat'

const AI_CHAT_URL =
  import.meta.env.VITE_AI_CHAT_FUNCTION_URL ||
  (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true'
    ? `http://localhost:5001/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/asia-northeast3/aiChat`
    : '')

interface StreamCallbacks {
  onChunk: (text: string) => void
  onDone: () => void
  onError: (error: string) => void
}

export async function streamChatMessage(
  messages: { role: ChatMessage['role']; content: string }[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  if (!AI_CHAT_URL) {
    callbacks.onError('AI chat URL is not configured')
    return
  }

  const user = auth.currentUser
  if (!user) {
    callbacks.onError('Not authenticated')
    return
  }

  const idToken = await user.getIdToken()

  const response = await fetch(AI_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ messages }),
    signal,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    callbacks.onError(
      (errorBody as { error?: string }).error || `HTTP ${response.status}`,
    )
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    callbacks.onError('No response body')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          callbacks.onDone()
          return
        }

        try {
          const parsed = JSON.parse(data) as {
            chunk?: string
            error?: string
          }
          if (parsed.error) {
            callbacks.onError(parsed.error)
            return
          }
          if (parsed.chunk) {
            callbacks.onChunk(parsed.chunk)
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
    callbacks.onDone()
  } catch (error) {
    if ((error as Error).name === 'AbortError') return
    callbacks.onError('Connection lost')
  }
}
