// Note: Same ESM/CJS consideration as openaiProvider.ts
import Anthropic from '@anthropic-ai/sdk'
import { LLMProvider, LLMStreamParams } from './types'

export class ClaudeProvider implements LLMProvider {
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async *streamChat(params: LLMStreamParams): AsyncIterable<string> {
    const stream = await this.client.messages.stream({
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

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text
      }
    }
  }
}
