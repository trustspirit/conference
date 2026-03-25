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
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const openaiProvider_1 = require("./openaiProvider");
const claudeProvider_1 = require("./claudeProvider");
const promptBuilder_1 = require("./promptBuilder");
const MAX_MESSAGES = 20;
const MAX_CHARS_PER_MESSAGE = 2000;
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
    // Lookup user role from Firestore for role-based context filtering
    const uid = request.auth.uid;
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    const userRole = userDoc.exists ? (userDoc.data()?.role ?? 'user') : 'user';
    const systemPrompt = await (0, promptBuilder_1.buildSystemPrompt)(settings, userRole);
    console.log('User role:', userRole);
    console.log('System prompt length:', systemPrompt.length);
    console.log('System prompt context preview:', systemPrompt.includes('<context>') ? 'has context' : 'NO CONTEXT');
    console.log('Context snippet:', systemPrompt.substring(systemPrompt.indexOf('<context>'), systemPrompt.indexOf('<context>') + 200));
    const provider = settings.provider === 'claude'
        ? new claudeProvider_1.ClaudeProvider(secrets.anthropicApiKey)
        : new openaiProvider_1.OpenAIProvider(secrets.openaiApiKey);
    const raw = await provider.chat({
        systemPrompt,
        messages: request.data.messages,
        model: settings.model,
        temperature: settings.temperature,
        topP: settings.topP,
        maxTokens: settings.maxTokens
    });
    return { reply: raw.trim() };
}
//# sourceMappingURL=chatHandler.js.map