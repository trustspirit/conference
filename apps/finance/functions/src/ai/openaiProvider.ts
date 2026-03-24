import OpenAI from 'openai'
import { LLMProvider, LLMParams } from './types'

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async chat(params: LLMParams): Promise<string> {
    const response = await this.client.chat.completions.create({
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
    })

    return response.choices[0]?.message?.content || ''
  }
}
