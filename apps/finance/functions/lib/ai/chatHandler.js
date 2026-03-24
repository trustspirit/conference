"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleChat = handleChat;
const admin = __importStar(require("firebase-admin"));
const openaiProvider_1 = require("./openaiProvider");
const claudeProvider_1 = require("./claudeProvider");
const promptBuilder_1 = require("./promptBuilder");
const streamParser_1 = require("./streamParser");
const MAX_MESSAGES = 20;
const MAX_CHARS_PER_MESSAGE = 2000;
function validateRequest(body) {
    if (!body.messages || !Array.isArray(body.messages)) {
        return 'messages must be an array';
    }
    if (body.messages.length > MAX_MESSAGES) {
        return `messages exceeds maximum of ${MAX_MESSAGES}`;
    }
    for (const msg of body.messages) {
        if (!msg.role || !msg.content) {
            return 'each message must have role and content';
        }
        if (msg.content.length > MAX_CHARS_PER_MESSAGE) {
            return `message content exceeds maximum of ${MAX_CHARS_PER_MESSAGE} characters`;
        }
        if (!['user', 'assistant'].includes(msg.role)) {
            return 'message role must be user or assistant';
        }
    }
    return null;
}
async function handleChat(req, res, secrets) {
    // Handle CORS preflight (safety net — cors:true should handle this, but just in case)
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    // Only allow POST
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    // Verify Firebase Auth token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid authorization header' });
        return;
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
        await admin.auth().verifyIdToken(idToken);
    }
    catch {
        res.status(401).json({ error: 'Invalid auth token' });
        return;
    }
    // Validate input
    const body = req.body;
    const validationError = validateRequest(body);
    if (validationError) {
        res.status(400).json({ error: validationError });
        return;
    }
    try {
        // Load AI settings
        const settings = await (0, promptBuilder_1.getAiSettings)();
        if (!settings.enabled) {
            res.status(503).json({ error: 'AI chatbot is currently unavailable' });
            return;
        }
        // Build system prompt with context
        const systemPrompt = await (0, promptBuilder_1.buildSystemPrompt)(settings);
        // Create provider
        const provider = settings.provider === 'claude'
            ? new claudeProvider_1.ClaudeProvider(secrets.anthropicApiKey)
            : new openaiProvider_1.OpenAIProvider(secrets.openaiApiKey);
        // Set up SSE streaming response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        const parser = new streamParser_1.StreamParser();
        const stream = provider.streamChat({
            systemPrompt,
            messages: body.messages,
            model: settings.model,
            temperature: settings.temperature,
            topP: settings.topP,
            maxTokens: settings.maxTokens,
        });
        for await (const chunk of stream) {
            const parsed = parser.push(chunk);
            if (parsed) {
                res.write(`data: ${JSON.stringify({ chunk: parsed })}\n\n`);
            }
        }
        // Flush any remaining buffer
        const remaining = parser.flush();
        if (remaining) {
            res.write(`data: ${JSON.stringify({ chunk: remaining })}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
    }
    catch (error) {
        console.error('AI chat error:', error);
        // If headers already sent (streaming started), end the stream
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify({ error: 'An error occurred' })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
//# sourceMappingURL=chatHandler.js.map