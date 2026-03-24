export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface LLMStreamParams {
  systemPrompt: string
  messages: ChatMessage[]
  model: string
  temperature: number
  topP: number
  maxTokens: number
}

export interface LLMProvider {
  streamChat(params: LLMStreamParams): AsyncIterable<string>
}

export interface AiSettings {
  provider: 'openai' | 'claude'
  model: string
  temperature: number
  topP: number
  maxTokens: number
  enabled: boolean
  refusalMessage: string
}
