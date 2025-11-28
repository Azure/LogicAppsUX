# A2A Core (Logic Apps Chat SDK)

React SDK for building chat interfaces that connect to AI agents using the A2A (Agent-to-Agent) protocol.

**Package**: `@microsoft/logicAppsChat`

## Purpose

- **A2A protocol client** - Connect to A2A-compatible AI agents
- **React components** - Pre-built chat UI components
- **State management** - Zustand-based chat state
- **Message streaming** - Real-time response handling
- **Persistence** - IndexedDB message storage

## Commands

```bash
pnpm run build        # Build library
pnpm run dev          # Watch mode
pnpm run test         # Run tests
pnpm run test:ui      # Tests with Vitest UI
pnpm run test:coverage # Coverage report
pnpm run typecheck    # TypeScript validation
```

## Architecture

### Entry Point
Multiple entry points:
- `dist/index.js` - Core SDK
- `dist/react/index.js` - React components
- `dist/react/styles.css` - Component styles

### Structure
```
/src
  /core/              - A2A protocol implementation
    /client/          - A2A client
    /types/           - Protocol types
    /events/          - Event emitter
  /react/             - React integration
    /components/      - Chat components
    /hooks/           - React hooks
    /store/           - Zustand store
  /utils/             - Utilities
```

## Core SDK

### A2A Client
```typescript
import { A2AClient } from '@microsoft/logicAppsChat'

const client = new A2AClient({
  agentUrl: 'https://agent.example.com',
  onMessage: (message) => console.log(message),
})

await client.sendMessage('Hello!')
```

### Message Types
```typescript
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  streaming?: boolean
}
```

## React Components

### ChatProvider
```tsx
import { ChatProvider, ChatWindow } from '@microsoft/logicAppsChat/react'

<ChatProvider agentUrl="https://...">
  <ChatWindow />
</ChatProvider>
```

### Available Components
- `ChatWindow` - Full chat interface
- `MessageList` - Message display
- `MessageInput` - User input
- `Message` - Individual message
- `CodeBlock` - Code display with syntax highlighting

## State Management

Uses Zustand for chat state:
```typescript
import { useChatStore } from '@microsoft/logicAppsChat/react'

const { messages, sendMessage, isLoading } = useChatStore()
```

## Persistence

IndexedDB storage via `idb`:
- Message history
- Session state
- Offline support

## Validation

Uses Zod for runtime validation:
```typescript
import { MessageSchema } from '@microsoft/logicAppsChat'

const validated = MessageSchema.parse(rawMessage)
```

## Technologies

- **React 19** - Latest React features
- **Zustand** - State management
- **Zod** - Schema validation
- **Immer** - Immutable updates
- **marked** - Markdown rendering
- **Prism.js** - Syntax highlighting
- **IndexedDB (idb)** - Persistence
- **EventEmitter3** - Event handling

## Testing

```bash
pnpm run test              # Run all tests
pnpm run test:coverage     # With coverage
pnpm run test:ui           # Vitest UI
```

## Dependencies

Minimal external dependencies:
- `@fluentui/react-components` - UI framework
- `eventemitter3` - Events
- `idb` - IndexedDB
- `immer` - Immutability
- `marked` - Markdown
- `prismjs` - Highlighting
- `zod` - Validation
- `zustand` - State

## Development Tips

1. **Protocol compliance**: Follow A2A specification
2. **Streaming**: Handle partial message updates
3. **Error recovery**: Implement retry logic (p-retry)
4. **Offline support**: Consider IndexedDB persistence
5. **Accessibility**: Ensure chat is screen-reader friendly
