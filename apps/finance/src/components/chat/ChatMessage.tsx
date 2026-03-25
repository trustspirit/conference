import Markdown from 'react-markdown'
import type { ChatMessage as ChatMessageType } from '../../types/chat'

interface Props {
  message: ChatMessageType
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <Markdown
            components={{
              h4: ({ children }) => <h4 className="mt-3 mb-1 font-semibold">{children}</h4>,
              ul: ({ children }) => <ul className="ml-4 list-disc space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="ml-4 list-decimal space-y-0.5">{children}</ol>,
              li: ({ children }) => <li>{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
              table: ({ children }) => (
                <table className="my-2 w-full text-xs border-collapse">{children}</table>
              ),
              th: ({ children }) => (
                <th className="border border-gray-300 bg-gray-200 px-2 py-1 text-left font-semibold">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-gray-300 px-2 py-1">{children}</td>
              ),
              code: ({ children }) => (
                <code className="rounded bg-gray-200 px-1 text-xs">{children}</code>
              ),
              hr: () => <hr className="my-2 border-gray-300" />
            }}
          >
            {message.content}
          </Markdown>
        )}
      </div>
    </div>
  )
}
