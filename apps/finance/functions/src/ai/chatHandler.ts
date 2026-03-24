import * as admin from 'firebase-admin'
import { Request, Response } from 'express'
import { ChatMessage } from './types'
import { OpenAIProvider } from './openaiProvider'
import { ClaudeProvider } from './claudeProvider'
import { getAiSettings, buildSystemPrompt } from './promptBuilder'
import { StreamParser } from './streamParser'

const MAX_MESSAGES = 20
const MAX_CHARS_PER_MESSAGE = 2000

interface ChatRequestBody {
  messages: ChatMessage[]
}

function validateRequest(body: ChatRequestBody): string | null {
  if (!body.messages || !Array.isArray(body.messages)) {
    return 'messages must be an array'
  }
  if (body.messages.length > MAX_MESSAGES) {
    return `messages exceeds maximum of ${MAX_MESSAGES}`
  }
  for (const msg of body.messages) {
    if (!msg.role || !msg.content) {
      return 'each message must have role and content'
    }
    if (msg.content.length > MAX_CHARS_PER_MESSAGE) {
      return `message content exceeds maximum of ${MAX_CHARS_PER_MESSAGE} characters`
    }
    if (!['user', 'assistant'].includes(msg.role)) {
      return 'message role must be user or assistant'
    }
  }
  return null
}

export async function handleChat(
  req: Request,
  res: Response,
  secrets: { openaiApiKey: string; anthropicApiKey: string },
): Promise<void> {
  // Handle CORS preflight (safety net — cors:true should handle this, but just in case)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Verify Firebase Auth token
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' })
    return
  }

  const idToken = authHeader.split('Bearer ')[1]
  try {
    await admin.auth().verifyIdToken(idToken)
  } catch {
    res.status(401).json({ error: 'Invalid auth token' })
    return
  }

  // Validate input
  const body = req.body as ChatRequestBody
  const validationError = validateRequest(body)
  if (validationError) {
    res.status(400).json({ error: validationError })
    return
  }

  try {
    // Load AI settings
    const settings = await getAiSettings()
    if (!settings.enabled) {
      res.status(503).json({ error: 'AI chatbot is currently unavailable' })
      return
    }

    // Build system prompt with context
    const systemPrompt = await buildSystemPrompt(settings)

    // Create provider
    const provider =
      settings.provider === 'claude'
        ? new ClaudeProvider(secrets.anthropicApiKey)
        : new OpenAIProvider(secrets.openaiApiKey)

    // Set up SSE streaming response
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const parser = new StreamParser()
    const stream = provider.streamChat({
      systemPrompt,
      messages: body.messages,
      model: settings.model,
      temperature: settings.temperature,
      topP: settings.topP,
      maxTokens: settings.maxTokens,
    })

    for await (const chunk of stream) {
      const parsed = parser.push(chunk)
      if (parsed) {
        res.write(`data: ${JSON.stringify({ chunk: parsed })}\n\n`)
      }
    }

    // Flush any remaining buffer
    const remaining = parser.flush()
    if (remaining) {
      res.write(`data: ${JSON.stringify({ chunk: remaining })}\n\n`)
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error) {
    console.error('AI chat error:', error)
    // If headers already sent (streaming started), end the stream
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: 'An error occurred' })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
