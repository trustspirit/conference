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
Cloud Function v2 (aiChat)
  1. Firebase Auth token verification
  2. Fetch context documents from Firestore ai-context collection
  3. Build system prompt (role + rules + context injection)
  4. Call LLM Provider (OpenAI or Claude)
  5. Parse stream: strip <context_check> tags, forward answer only
  6. Stream response to client
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
src/components/chat/
├── FloatingChatButton.tsx   — FAB button, fixed bottom-right
├── ChatPanel.tsx            — Chat container (header, messages, input)
├── ChatMessage.tsx          — Individual message bubble (user/assistant)
├── ChatInput.tsx            — Text input + send button
└── StreamingText.tsx        — Renders streaming text with typing effect

src/hooks/
└── useChatStream.ts         — fetch + ReadableStream processing

src/services/
└── chatApi.ts               — Cloud Function call wrapper
```

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

### `aiChat` (v2 — Cloud Run based)

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

Processes the raw LLM stream and:
1. Buffers content until `<context_check>` close tag is detected
2. Strips everything between `<context_check>` and `</context_check>`
3. Forwards remaining content chunks to client

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

### Authentication

- Extract Bearer token from Authorization header
- Verify via `admin.auth().verifyIdToken(token)`
- Reject with 401 if invalid

### Error Handling

- Auth failure → 401
- AI settings disabled → 503 with "chatbot is currently unavailable"
- LLM API failure → 500 with generic error message
- Rate limiting: optional, via Firestore counter per user (future consideration)

## Environment Variables (Cloud Functions)

```
AI_PROVIDER=openai              # or "claude"
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

Provider selection can be overridden by Firestore `ai-settings.provider` (Firestore takes precedence over env var).

## Security Considerations

- API keys stored only in Cloud Functions environment — never exposed to client
- Firebase Auth required for all requests
- Context documents are read-only for non-admin users
- System prompt injection mitigation: user messages are clearly delimited
- LLM parameters controlled server-side only

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
