# AI Chatbot Design Spec

> Context-bound AI assistant for the conference finance app. Answers only questions about app usage and expense policies.

## Overview

Add a floating AI chatbot to the finance app that answers questions strictly within predefined context (app usage guide + expense/budget policies). Uses OpenAI or Claude API via a Cloud Function proxy with streaming responses.

## Requirements

| Requirement | Decision |
|-------------|----------|
| Context scope | App usage guide + expense/budget policies |
| Context source | Firestore `ai-context` collection (admin-managed) |
| Target users | All logged-in users |
| LLM support | OpenAI + Claude via abstraction layer |
| Chat history | None — cleared on panel close |
| Language | Auto-detect from user input |
| Streaming | Yes — Cloud Functions v2 (SSE) |
| UI pattern | Floating button (bottom-right) → slide-up panel overlay |

## Architecture

```
Frontend (React)
  FloatingChatButton → ChatPanel
                        │ messages[] (local state)
                        │ input
                        ▼
                   fetch() with ReadableStream
                        │
                        │ SSE / chunked response
                        ▼
Cloud Function v2 — onRequest (aiChat)
  NOTE: Uses onRequest (not onCall) to support SSE streaming.
        Frontend uses raw fetch(), not httpsCallable().
  1. CORS preflight handling
  2. Firebase Auth token verification (manual verifyIdToken)
  3. Fetch context documents from Firestore ai-context collection
  4. Build system prompt (role + rules + context injection)
  5. Call LLM Provider (OpenAI or Claude)
  6. Parse stream: buffer until </context_check>, strip tags, forward answer only
  7. Stream response to client
                        │
            ┌───────────┼───────────┐
            ▼                       ▼
   OpenAI API              Claude API
```

## 2-Step Verification Process

Every user question goes through a mandatory 2-step process enforced by the system prompt:

### Step 1: Context Verification (Internal Reasoning)

The LLM reads the provided context and determines whether the user's question falls within scope. This reasoning is wrapped in `<context_check>` tags and **stripped by the Cloud Function before streaming to the client**.

### Step 2: Response

- **In scope**: Answer based solely on context content
- **Out of scope**: Respond with refusal message (configurable in `ai-settings`)

### System Prompt Structure

```
[Role]
You are an assistant for a conference expense management app.

[Behavior Rules]
For every question, follow these steps:

Step 1 - Context Verification:
  Read the <context> provided below.
  Determine if the user's question is within scope.
  Write your assessment inside <context_check> tags.

Step 2 - Response:
  - If in scope: answer using ONLY the context content
  - If out of scope: respond with the refusal message

[Prohibitions]
- Do NOT guess or fabricate information not in the context
- Do NOT use general knowledge or external information
- Do NOT answer questions unrelated to app usage or expense policies

<context>
{Documents fetched from Firestore}
</context>
```

### LLM Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| temperature | 0.1 | Factual, non-creative responses |
| top_p | 0.9 | Limit extreme token choices |
| max_tokens | 1024 | Prevent overly long responses |

These are stored in Firestore `ai-settings` and adjustable without redeployment.

## Firestore Data Model

### `ai-context` Collection

Each document represents a knowledge category:

```
ai-context/{docId}
├── title: string          // "앱 사용법" | "경비 규정"
├── content: string        // Markdown or plain text content
├── order: number          // Display/injection order
└── enabled: boolean       // Toggle without deleting
```

### `ai-settings` Document (singleton)

```
ai-settings/config
├── provider: "openai" | "claude"
├── model: string          // e.g. "gpt-4o-mini", "claude-haiku-4-5-20251001"
├── temperature: number    // 0.0 - 1.0
├── topP: number           // 0.0 - 1.0
├── maxTokens: number
├── enabled: boolean       // Global chatbot on/off
└── refusalMessage: string // Customizable refusal text
```

## Frontend Components

```
apps/finance/src/components/chat/
├── FloatingChatButton.tsx   — FAB button, fixed bottom-right
├── ChatPanel.tsx            — Chat container (header, messages, input)
├── ChatMessage.tsx          — Individual message bubble (user/assistant)
├── ChatInput.tsx            — Text input + send button
└── StreamingText.tsx        — Renders streaming text with typing effect

apps/finance/src/hooks/
└── useChatStream.ts         — fetch + ReadableStream processing

apps/finance/src/services/
└── chatApi.ts               — Cloud Function call wrapper (raw fetch, not React Query)
```

**Note:** `services/` is a new directory. Unlike `hooks/queries/` which uses React Query for Firestore data, `chatApi.ts` uses raw `fetch()` with `ReadableStream` for SSE — a fundamentally different pattern that warrants a separate location.

### FloatingChatButton

- Fixed position: `bottom: 24px, right: 24px`
- Circular button with chat icon
- Click toggles ChatPanel visibility
- Badge or pulse animation for first-time hint
- Z-index above all content

### ChatPanel

- Dimensions: ~380px wide, ~500px tall (responsive)
- Slide-up animation from button position
- Header: title + close button
- Message list: scrollable, auto-scroll to bottom
- Welcome message on open

### ChatMessage

- User messages: right-aligned, primary color background
- Assistant messages: left-aligned, gray background
- Streaming indicator: animated dots while receiving

### ChatInput

- Text input with placeholder
- Send button (disabled when empty or streaming)
- Enter to send, Shift+Enter for newline

### useChatStream Hook

```typescript
interface UseChatStreamReturn {
  messages: ChatMessage[]
  sendMessage: (content: string) => void
  isStreaming: boolean
  error: string | null
  clearMessages: () => void
}
```

- Manages local message state (no persistence)
- Handles fetch with ReadableStream
- Decodes SSE chunks and appends to current assistant message
- Handles errors gracefully

## Cloud Function

### `aiChat` (v2 — Cloud Run based, `onRequest`)

**Note:** This departs from the existing `onCall` pattern used by other functions. `onRequest` is required because `onCall` does not support SSE streaming. The frontend uses raw `fetch()` instead of `httpsCallable()`.

#### Function Configuration

```typescript
export const aiChat = onRequest({
  timeoutSeconds: 120,    // LLM streaming can take 30s+
  memory: '512MiB',       // OpenAI/Anthropic SDKs need more memory
  region: 'asia-northeast3',  // Match Firestore region (Seoul)
  cors: true,             // Required for cross-origin fetch from hosting domain
  secrets: [openaiApiKey, anthropicApiKey],
}, handler)
```

#### File Structure

```
functions/src/
├── ai/
│   ├── chatHandler.ts       — HTTP handler
│   ├── providers/
│   │   ├── types.ts         — Common LLMProvider interface
│   │   ├── openai.ts        — OpenAI implementation
│   │   └── claude.ts        — Claude implementation
│   ├── promptBuilder.ts     — System prompt assembly
│   └── streamParser.ts      — <context_check> tag filtering
└── index.ts                 — Export aiChat function
```

### LLM Provider Interface

```typescript
interface LLMProvider {
  streamChat(params: {
    systemPrompt: string
    messages: { role: 'user' | 'assistant'; content: string }[]
    temperature: number
    topP: number
    maxTokens: number
  }): AsyncIterable<string>
}
```

### Stream Parser

Processes the raw LLM stream with a stateful buffering strategy:

1. **Buffering phase**: Accumulate all chunks until `</context_check>` is detected
2. **Strip phase**: Remove everything between `<context_check>` and `</context_check>` (inclusive)
3. **Streaming phase**: Forward remaining content chunks to client

**Edge cases:**
- Tag split across chunks: the parser buffers until the full closing tag is detected
- Malformed/unclosed tag: if `</context_check>` is not found within 2000 characters after `<context_check>`, flush buffer as-is and log a warning
- The system prompt enforces that `<context_check>` always appears **first** before the answer text
- If the entire response is a refusal (out-of-scope), the answer text after the tag is the refusal message

### Request/Response Format

```
POST /aiChat
Headers: { Authorization: "Bearer <firebase-id-token>" }
Body: {
  messages: [
    { role: "user", content: "교통비 한도가 얼마인가요?" }
  ]
}

Response: text/event-stream
  data: {"chunk": "교통비"}
  data: {"chunk": " 한도는"}
  data: {"chunk": " 건당 60만원입니다."}
  data: [DONE]
```

### Input Validation

- Maximum messages per request: **20** (prevents excessive token usage)
- Maximum characters per message: **2000**
- User messages are passed as distinct `user` role in the messages array — never concatenated into the system prompt
- Reject with 400 if validation fails

### Authentication

- Extract Bearer token from Authorization header
- Verify via `admin.auth().verifyIdToken(token)`
- Reject with 401 if invalid

### Error Handling

- Auth failure → 401
- AI settings disabled → 503 with "chatbot is currently unavailable"
- LLM API failure → 500 with generic error message
- Rate limiting: optional, via Firestore counter per user (future consideration)

## Secrets & Configuration (Cloud Functions)

API keys use `defineSecret` (consistent with existing codebase pattern):

```typescript
import { defineSecret } from 'firebase-functions/params'

const openaiApiKey = defineSecret('OPENAI_API_KEY')
const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY')
```

Provider selection is controlled by Firestore `ai-settings.provider` field. No environment variable needed for provider switching — it is managed dynamically via Firestore.

## Security Considerations

- API keys stored via `defineSecret` — encrypted at rest, injected only at runtime
- Firebase Auth required for all requests
- **Firestore rules**: Deny all client-side access to `ai-context` and `ai-settings` collections. All access goes through the Cloud Function using Admin SDK. This prevents leaking system prompt content, refusal messages, and LLM configuration
- System prompt injection mitigation: user messages are passed as distinct `user` role, never interpolated into the system prompt
- LLM parameters controlled server-side only
- Input size limits enforced (20 messages, 2000 chars each)

## UI/UX Details

- Chat button appears on all authenticated pages
- Panel opens with slide-up animation (200ms ease-out)
- Welcome message: "안녕하세요! 경비 정산 앱 사용법이나 규정에 대해 물어보세요."
- Refusal message is customizable via `ai-settings.refusalMessage`
- Input placeholder: "질문을 입력하세요..."
- Streaming text renders with natural typing appearance
- Auto-scroll to latest message during streaming
- Close button or click-outside to dismiss panel

## Out of Scope

- Chat history persistence
- Admin UI for managing ai-context documents (use Firebase console)
- Multi-turn context window management (send only recent N messages)
- Rate limiting (future enhancement)
- Analytics on chatbot usage (future enhancement)
