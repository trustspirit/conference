export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface LLMParams {
  systemPrompt: string
  messages: ChatMessage[]
  model: string
  temperature: number
  topP: number
  maxTokens: number
}

export interface LLMProvider {
  chat(params: LLMParams): Promise<string>
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
