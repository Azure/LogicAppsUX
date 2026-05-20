# libs/a2a-core — A2A Protocol Chat Client SDK

## Purpose
React SDK for building chat interfaces that connect to AI agents using the
Agent-to-Agent (A2A) protocol. Provides real-time streaming, session management,
agent discovery, and chat persistence.

## NPM Package
`@microsoft/logic-apps-chat`

## Key Subsystems
- `api/` — A2A protocol API client
- `client/` — A2A client implementation
- `session/` — Session lifecycle management
- `streaming/` — Real-time response streaming (SSE)
- `storage/` — Message persistence (IndexedDB)
- `discovery/` — Agent discovery and capabilities
- `plugins/` — Plugin system for extensibility
- `react/` — React hooks and components for chat UI

## Key Features
- Real-time streaming responses (SSE with auto-reconnection and exponential backoff)
- Multi-session support (multiple concurrent agent conversations)
- Chat message persistence (IndexedDB via `storage/`)
- Server-side history persistence support
- Authentication support (Bearer, OAuth2, API Key, Cookie, custom handler)
- Agent discovery protocol with capability negotiation
- File upload support with multipart handling
- Syntax-highlighted code blocks in responses
- Zod schema validation for protocol messages
- Plugin system for analytics, logging, and extensibility

## React Exports (react/)
- `ChatWidget` — Full-featured embeddable chat widget
- `ChatWindow` — Chat window container
- `MessageList` — Message history display
- `MessageInput` — User input composing
- `AgentCard` — Agent info and capability display
- React hooks: `useA2AClient`, `useSession`, `useMessages`, `useStreaming`
- Zustand store for client-side state management

## Dependencies
- No internal dependencies on other libs (standalone SDK)
- React 19+, Zustand for state management

## Common Issue Patterns

### Issues that belong HERE:
- A2A protocol communication failures
- Chat streaming issues (messages cut off, connection drops)
- Agent discovery failures
- Message persistence/storage bugs
- Authentication flow issues with A2A agents

### Issues that are often MISATTRIBUTED here:
- Designer chatbot issues → `chatbot` library
- Copilot workflow editing → `designer` copilot service
- General chat UI styling → may be `designer-ui` components
