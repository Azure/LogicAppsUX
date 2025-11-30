# A2A Chat Iframe App

Iframe-based chat application that implements the A2A (Agent-to-Agent) protocol for AI-powered conversations.

## Purpose

- **Embeddable chat interface** for Logic Apps Designer
- **A2A protocol client** for AI agent communication
- **Streaming message support** for real-time responses
- **Persistent chat history** via IndexedDB

## Commands

```bash
pnpm run dev            # Start dev server
pnpm run build          # Production build (outputs iframe.html)
pnpm run test           # Run unit tests
pnpm run test:watch     # Watch mode
pnpm run test:coverage  # Coverage report
pnpm run type-check     # TypeScript validation
```

## Architecture

### Core Components
- Uses `@microsoft/logicAppsChat` SDK for A2A protocol
- Fluent UI v9 for consistent styling
- IndexedDB for message persistence
- React 19 with streaming support

### Key Files
- `src/App.tsx` - Main application component
- `src/components/` - Chat UI components
- `src/hooks/` - Custom React hooks
- `src/services/` - A2A client services

## Integration

The iframe is embedded in:
- Logic Apps Designer (via chatbot panel)
- VS Code extension webviews
- Azure Portal integration

### PostMessage Communication
Parent windows communicate via `postMessage`:
```typescript
// Initialize chat session
window.postMessage({ type: 'INIT', agentUrl: '...' }, '*')

// Receive chat events
window.addEventListener('message', (e) => {
  if (e.data.type === 'CHAT_RESPONSE') { ... }
})
```

## Development Notes

- **React 19**: Uses latest React features including streaming
- **Fluent UI v9**: Modern styling with design tokens
- **Vitest**: Unit testing framework
- **Build output**: `dist/iframe.html` for embedding

## Testing

```bash
pnpm run test                    # Run all tests
pnpm run test:multi-session      # Test multiple chat sessions
```

## Dependencies

- `@microsoft/logicAppsChat` - A2A protocol SDK
- `@fluentui/react-components` - UI framework
- `idb` - IndexedDB wrapper
