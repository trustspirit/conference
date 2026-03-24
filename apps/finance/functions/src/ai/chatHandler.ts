import { HttpsError, CallableRequest } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { ChatMessage } from './types'
import { OpenAIProvider } from './openaiProvider'
import { ClaudeProvider } from './claudeProvider'
import { getAiSettings, buildSystemPrompt } from './promptBuilder'

const MAX_MESSAGES = 20
const MAX_CHARS_PER_MESSAGE = 2000

interface ChatRequestData {
  messages: ChatMessage[]
}

function validate(data: ChatRequestData): void {
  if (!data.messages || !Array.isArray(data.messages)) {
    throw new HttpsError('invalid-argument', 'messages must be an array')
  }
  if (data.messages.length > MAX_MESSAGES) {
    throw new HttpsError('invalid-argument', `messages exceeds maximum of ${MAX_MESSAGES}`)
  }
  for (const msg of data.messages) {
    if (!msg.role || !msg.content) {
      throw new HttpsError('invalid-argument', 'each message must have role and content')
    }
    if (msg.content.length > MAX_CHARS_PER_MESSAGE) {
      throw new HttpsError('invalid-argument', `message content exceeds maximum of ${MAX_CHARS_PER_MESSAGE} characters`)
    }
    if (!['user', 'assistant'].includes(msg.role)) {
      throw new HttpsError('invalid-argument', 'message role must be user or assistant')
    }
  }
}

export async function handleChat(
  request: CallableRequest<ChatRequestData>,
  secrets: { openaiApiKey: string; anthropicApiKey: string },
): Promise<{ reply: string }> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in')
  }

  validate(request.data)

  const settings = await getAiSettings()
  if (!settings.enabled) {
    throw new HttpsError('unavailable', 'AI chatbot is currently unavailable')
  }

  // Lookup user role from Firestore for role-based context filtering
  const uid = request.auth.uid
  const userDoc = await admin.firestore().collection('users').doc(uid).get()
  const userRole: string = userDoc.exists ? (userDoc.data()?.role ?? 'user') : 'user'

  const systemPrompt = await buildSystemPrompt(settings, userRole)

  console.log('User role:', userRole)
  console.log('System prompt length:', systemPrompt.length)
  console.log('System prompt context preview:', systemPrompt.includes('<context>') ? 'has context' : 'NO CONTEXT')
  console.log('Context snippet:', systemPrompt.substring(systemPrompt.indexOf('<context>'), systemPrompt.indexOf('<context>') + 200))

  const provider =
    settings.provider === 'claude'
      ? new ClaudeProvider(secrets.anthropicApiKey)
      : new OpenAIProvider(secrets.openaiApiKey)

  const raw = await provider.chat({
    systemPrompt,
    messages: request.data.messages,
    model: settings.model,
    temperature: settings.temperature,
    topP: settings.topP,
    maxTokens: settings.maxTokens,
  })

  return { reply: raw.trim() }
}
