// Note: functions tsconfig uses commonjs + esModuleInterop.
// If default import fails at runtime, change to: import * as OpenAIModule from 'openai'
// and use: const OpenAI = (OpenAIModule as any).default || OpenAIModule
import OpenAI from 'openai'
import { LLMProvider, LLMStreamParams } from './types'

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async *streamChat(params: LLMStreamParams): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: params.model,
      messages: [
        { role: 'system' as const, content: params.systemPrompt },
        ...params.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      temperature: params.temperature,
      top_p: params.topP,
      max_tokens: params.maxTokens,
      stream: true,
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) {
        yield delta
      }
    }
  }
}
