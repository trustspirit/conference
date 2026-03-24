import { functions } from '@conference/firebase'
import { httpsCallable } from 'firebase/functions'
import type { ChatMessage } from '../types/chat'

interface AiChatResponse {
  reply: string
}

const aiChatFn = httpsCallable<
  { messages: { role: ChatMessage['role']; content: string }[] },
  AiChatResponse
>(functions, 'aiChat')

export async function sendChatMessage(
  messages: { role: ChatMessage['role']; content: string }[],
): Promise<string> {
  const result = await aiChatFn({ messages })
  return result.data.reply
}
