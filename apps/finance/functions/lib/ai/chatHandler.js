"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleChat = handleChat;
const https_1 = require("firebase-functions/v2/https");
const openaiProvider_1 = require("./openaiProvider");
const claudeProvider_1 = require("./claudeProvider");
const promptBuilder_1 = require("./promptBuilder");
const MAX_MESSAGES = 20;
const MAX_CHARS_PER_MESSAGE = 2000;
const CONTEXT_CHECK_RE = /<context_check>[\s\S]*?<\/context_check>\s*/;
function validate(data) {
    if (!data.messages || !Array.isArray(data.messages)) {
        throw new https_1.HttpsError('invalid-argument', 'messages must be an array');
    }
    if (data.messages.length > MAX_MESSAGES) {
        throw new https_1.HttpsError('invalid-argument', `messages exceeds maximum of ${MAX_MESSAGES}`);
    }
    for (const msg of data.messages) {
        if (!msg.role || !msg.content) {
            throw new https_1.HttpsError('invalid-argument', 'each message must have role and content');
        }
        if (msg.content.length > MAX_CHARS_PER_MESSAGE) {
            throw new https_1.HttpsError('invalid-argument', `message content exceeds maximum of ${MAX_CHARS_PER_MESSAGE} characters`);
        }
        if (!['user', 'assistant'].includes(msg.role)) {
            throw new https_1.HttpsError('invalid-argument', 'message role must be user or assistant');
        }
    }
}
async function handleChat(request, secrets) {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in');
    }
    validate(request.data);
    const settings = await (0, promptBuilder_1.getAiSettings)();
    if (!settings.enabled) {
        throw new https_1.HttpsError('unavailable', 'AI chatbot is currently unavailable');
    }
    const systemPrompt = await (0, promptBuilder_1.buildSystemPrompt)(settings);
    const provider = settings.provider === 'claude'
        ? new claudeProvider_1.ClaudeProvider(secrets.anthropicApiKey)
        : new openaiProvider_1.OpenAIProvider(secrets.openaiApiKey);
    const raw = await provider.chat({
        systemPrompt,
        messages: request.data.messages,
        model: settings.model,
        temperature: settings.temperature,
        topP: settings.topP,
        maxTokens: settings.maxTokens,
    });
    // Strip <context_check> tags from response
    const reply = raw.replace(CONTEXT_CHECK_RE, '').trim();
    return { reply };
}
//# sourceMappingURL=chatHandler.js.map