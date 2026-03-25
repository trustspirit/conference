"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeProvider = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
class ClaudeProvider {
    constructor(apiKey) {
        this.client = new sdk_1.default({ apiKey });
    }
    async chat(params) {
        const response = await this.client.messages.create({
            model: params.model,
            system: params.systemPrompt,
            messages: params.messages.map((m) => ({
                role: m.role,
                content: m.content
            })),
            temperature: params.temperature,
            top_p: params.topP,
            max_tokens: params.maxTokens
        });
        const block = response.content[0];
        return block.type === 'text' ? block.text : '';
    }
}
exports.ClaudeProvider = ClaudeProvider;
//# sourceMappingURL=claudeProvider.js.map