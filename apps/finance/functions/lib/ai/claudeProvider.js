"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeProvider = void 0;
// Note: Same ESM/CJS consideration as openaiProvider.ts
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
class ClaudeProvider {
    constructor(apiKey) {
        this.client = new sdk_1.default({ apiKey });
    }
    async *streamChat(params) {
        const stream = await this.client.messages.stream({
            model: params.model,
            system: params.systemPrompt,
            messages: params.messages.map((m) => ({
                role: m.role,
                content: m.content,
            })),
            temperature: params.temperature,
            top_p: params.topP,
            max_tokens: params.maxTokens,
        });
        for await (const event of stream) {
            if (event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta') {
                yield event.delta.text;
            }
        }
    }
}
exports.ClaudeProvider = ClaudeProvider;
//# sourceMappingURL=claudeProvider.js.map