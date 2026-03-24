import Anthropic from '@anthropic-ai/sdk'
import { LLMProvider, LLMParams } from './types'

export class ClaudeProvider implements LLMProvider {
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async chat(params: LLMParams): Promise<string> {
    const response = await this.client.messages.create({
      model: params.model,
      system: params.systemPrompt,
      messages: params.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      temperature: params.temperature,
      top_p: params.topP,
      max_tokens: params.maxTokens,
    })

    const block = response.content[0]
    return block.type === 'text' ? block.text : ''
  }
}
