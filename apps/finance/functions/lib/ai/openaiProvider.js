'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.OpenAIProvider = void 0
const openai_1 = __importDefault(require('openai'))
class OpenAIProvider {
  constructor(apiKey) {
    this.client = new openai_1.default({ apiKey })
  }
  async chat(params) {
    const response = await this.client.chat.completions.create({
      model: params.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        ...params.messages.map((m) => ({
          role: m.role,
          content: m.content
        }))
      ],
      temperature: params.temperature,
      top_p: params.topP,
      max_tokens: params.maxTokens
    })
    return response.choices[0]?.message?.content || ''
  }
}
exports.OpenAIProvider = OpenAIProvider
//# sourceMappingURL=openaiProvider.js.map
