import Anthropic from '@anthropic-ai/sdk'
import { LLMProvider, LLMParams } from './types'

// Thinking tokens count toward max_tokens on current Claude models, so leave headroom on top of
// the configured reply length; otherwise a short maxTokens can be spent entirely on thinking.
const THINKING_HEADROOM_TOKENS = 2048

export class ClaudeProvider implements LLMProvider {
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async chat(params: LLMParams): Promise<string> {
    // temperature / top_p are intentionally NOT sent: current Claude models reject non-default
    // sampling parameters (and the API rejects them for every model from 2026-10-21).
    // Reply depth is controlled with effort; this is a short FAQ-style chat, so keep it low.
    const response = await this.client.messages.create({
      model: params.model,
      system: params.systemPrompt,
      messages: params.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      max_tokens: params.maxTokens + THINKING_HEADROOM_TOKENS,
      output_config: { effort: 'low' }
    })

    if (response.stop_reason === 'refusal') {
      throw new Error('Claude declined to answer this request')
    }

    // content may start with thinking blocks, so collect every text block rather than content[0].
    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
  }
}
