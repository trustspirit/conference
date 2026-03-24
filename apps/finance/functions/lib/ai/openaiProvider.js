"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
// Note: functions tsconfig uses commonjs + esModuleInterop.
// If default import fails at runtime, change to: import * as OpenAIModule from 'openai'
// and use: const OpenAI = (OpenAIModule as any).default || OpenAIModule
const openai_1 = __importDefault(require("openai"));
class OpenAIProvider {
    constructor(apiKey) {
        this.client = new openai_1.default({ apiKey });
    }
    async *streamChat(params) {
        const stream = await this.client.chat.completions.create({
            model: params.model,
            messages: [
                { role: 'system', content: params.systemPrompt },
                ...params.messages.map((m) => ({
                    role: m.role,
                    content: m.content,
                })),
            ],
            temperature: params.temperature,
            top_p: params.topP,
            max_tokens: params.maxTokens,
            stream: true,
        });
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
                yield delta;
            }
        }
    }
}
exports.OpenAIProvider = OpenAIProvider;
//# sourceMappingURL=openaiProvider.js.map