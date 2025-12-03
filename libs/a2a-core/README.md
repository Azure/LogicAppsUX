# @microsoft/logicAppsChat

React SDK for building chat interfaces that connect to AI agents.

## Features

- ⚛️ **React 19+ compatible**: Built for modern React applications
- 🚀 **Small bundle size**: ~45KB with React as peer dependency
- 📦 **Complete React toolkit**: Components, hooks, and utilities
- 📝 **Markdown support**: Rich text formatting with syntax highlighting
- 📎 **File uploads**: Built-in file attachment support with progress tracking
- 🏢 **Company branding**: Add your logo to the chat interface
- 🤖 **Agent-to-Agent Protocol**: Built on the A2A protocol (implementation detail)
- 🔐 **Authentication**: Bearer, API Key, OAuth2, Cookie, and custom handlers
- 🌊 **Real-time streaming**: Server-Sent Events (SSE) for real-time agent responses
- 💾 **Chat history**: Client-side (IndexedDB) or server-side storage
- 💬 **Multi-session**: Multiple concurrent conversations with sidebar UI
- 🔍 **Agent discovery**: Automatic agent card resolution
- 🔌 **Plugin system**: Extensible with custom analytics, logging, and more
- ✅ **TypeScript**: Full type safety with Zod schema validation

## Installation

```bash
npm install @microsoft/logicAppsChat
# or
pnpm add @microsoft/logicAppsChat
# or
yarn add @microsoft/logicAppsChat
```

**Peer Dependencies:**

- `react` >= 19.2.0

## What's Included

React components and hooks for building chat interfaces:

- **Components**: `ChatWidget`, `ChatWindow`, `MessageList`, `MessageInput`, etc.
- **Hooks**: `useA2A`, `useChatWidget`, `useTheme`, `useChatStore`
- **Utilities**: Message helpers, file handling, theming
- **Storage**: Client-side (IndexedDB) and server-side chat history
- **Styles**: Pre-built CSS with customizable themes

**Import styles:**

```tsx
import '@microsoft/logicAppsChat/styles.css';
```

## Quick Start

### 1. React Components

Full-featured UI with built-in state management:

```tsx
import { ChatWidget } from '@microsoft/logicAppsChat';
import '@microsoft/logicAppsChat/styles.css';

export default function App() {
  return (
    <ChatWidget
      agentCard="https://api.example.com"
      auth={{ type: 'bearer', token: 'your-token' }}
      welcomeMessage="Hello! How can I help you today?"
      allowFileUpload={true}
      theme={{
        colors: {
          primary: '#0066cc',
          primaryText: '#ffffff',
          background: '#f5f5f5',
        },
        branding: {
          logoUrl: 'https://example.com/logo.png',
          logoSize: 'medium',
          logoPosition: 'header',
        },
      }}
      onMessage={(message) => console.log('New message:', message)}
      onConnectionChange={(connected) => console.log('Connected:', connected)}
    />
  );
}
```

### 2. React Hooks

For custom UI implementations:

```tsx
import { useA2A } from '@microsoft/logicAppsChat';

function CustomChat() {
  const { messages, isLoading, isConnected, sendMessage, clearMessages, authState } = useA2A({
    agentCard: 'https://api.example.com',
    auth: { type: 'bearer', token: 'token' },
  });

  return (
    <div>
      <div>{isConnected ? 'Connected' : 'Disconnected'}</div>

      {authState.isRequired && <div>Authentication required...</div>}

      <div>
        {messages.map((msg) => (
          <div key={msg.id}>
            <strong>{msg.sender}:</strong> {msg.content}
          </div>
        ))}
      </div>

      {isLoading && <div>Loading...</div>}

      <input
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            sendMessage((e.target as HTMLInputElement).value);
          }
        }}
      />
      <button onClick={clearMessages}>Clear</button>
    </div>
  );
}
```

## API Reference

> **Note**: This library is built on the A2A (Agent-to-Agent) protocol, but the protocol details are abstracted away. You work with React components and hooks - the underlying communication protocol is an implementation detail.

### React Components & Hooks

#### ChatWidget / ChatWindow

Full-featured chat interface with built-in UI:

```typescript
interface ChatWidgetProps {
  // Agent configuration
  agentCard: string | AgentCard; // Agent URL or object (required)
  auth?: AuthConfig; // Authentication
  agentUrl?: string; // Override agent endpoint

  // UI content
  welcomeMessage?: string;
  placeholder?: string;
  userName?: string;

  // Features
  allowFileUpload?: boolean;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  theme?: Partial<ChatTheme>;

  // Session management
  sessionKey?: string;
  sessionId?: string;
  sessionName?: string;
  storageConfig?: StorageConfig;
  initialContextId?: string;

  // User data
  userId?: string;
  metadata?: Record<string, any>;

  // Callbacks
  onMessage?: (message: Message) => void;
  onConnectionChange?: (connected: boolean) => void;
  onToggleSidebar?: () => void;
  onContextIdChange?: (contextId: string) => void;
  onRenameSession?: (newName: string) => void | Promise<void>;
  onUnauthorized?: (event: UnauthorizedEvent) => void | Promise<void>;
}
```

#### Individual Components

```typescript
// Message list display
<MessageList messages={messages} isLoading={isLoading} />

// Message input
<MessageInput
  onSend={sendMessage}
  placeholder="Type a message..."
  disabled={isLoading}
  allowFileUpload={true}
/>

// Individual message
<MessageComponent message={message} />

// Typing indicator
<TypingIndicator visible={isTyping} />

// Company logo
<CompanyLogo
  logoUrl="https://example.com/logo.png"
  logoSize="medium"
  position="header"
/>

// File upload
<FileUpload
  onFileSelect={handleFile}
  maxSize={10 * 1024 * 1024}
  allowedTypes={['image/*', 'application/pdf']}
/>

// Session list (multi-session)
<SessionList
  sessions={sessions}
  activeSessionId={activeId}
  onSelectSession={handleSelect}
  onRenameSession={handleRename}
  onDeleteSession={handleDelete}
/>

// Authentication message
<AuthenticationMessage authEvent={authEvent} />
```

### React Hooks

#### useA2A

Main hook for chat functionality:

```typescript
interface UseA2AOptions {
  agentCard?: string | AgentCard;
  auth?: AuthConfig;
  storageConfig?: StorageConfig;
  initialContextId?: string;
  autoConnect?: boolean;
}

interface UseA2AReturn {
  // State
  isConnected: boolean;
  isLoading: boolean;
  messages: ChatMessage[];
  agentCard: AgentCard | undefined;
  error: Error | undefined;
  contextId: string | undefined;
  authState: {
    isRequired: boolean;
    authEvent?: AuthRequiredEvent;
  };

  // Actions
  connect: (agentCard: AgentCard) => Promise<void>;
  disconnect: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  sendAuthenticationCompleted: () => Promise<void>;
}

function useA2A(options: UseA2AOptions = {}): UseA2AReturn;
```

#### useChatWidget

Widget-specific behavior:

```typescript
function useChatWidget(options: ChatWidgetOptions) {
  // Returns chat state and handlers specific to widget UI
}
```

#### useTheme

Theme management:

```typescript
function useTheme() {
  return {
    theme: currentTheme,
    setTheme: (theme: Partial<ChatTheme>) => void,
    isDarkMode: boolean,
    toggleDarkMode: () => void,
  };
}
```

#### useChatStore

Direct access to Zustand store:

```typescript
function useChatStore(): ChatStore & ChatActions;
```

### Chat History Storage

#### StorageConfig

```typescript
type StorageConfig =
  | { type: 'indexeddb' } // Client-side IndexedDB
  | {
      type: 'server'; // Server-side storage
      agentUrl: string;
      getAuthToken?: () => string | Promise<string>;
    };
```

#### ChatHistoryStorage Interface

```typescript
interface ChatHistoryStorage {
  saveMessage(message: Message, options?: SaveMessageOptions): Promise<void>;
  getMessages(sessionId: string): Promise<Message[]>;
  deleteMessage(messageId: string): Promise<void>;
  listSessions(options?: ListSessionsOptions): Promise<ChatSession[]>;
  deleteSession(sessionId: string): Promise<void>;
  exportSession(sessionId: string): Promise<ExportData>;
  importSession(sessionId: string, data: ExportData): Promise<void>;
}
```

#### Usage

```typescript
import { createHistoryStorage, ServerHistoryStorage } from '@microsoft/logicAppsChat';

// Client-side (IndexedDB)
const clientStorage = createHistoryStorage({ type: 'indexeddb' });

// Server-side
const serverStorage = new ServerHistoryStorage({
  agentUrl: 'https://api.example.com',
  getAuthToken: () => localStorage.getItem('token') || '',
});

// Use with ChatWidget
<ChatWidget
  agentCard="https://api.example.com"
  storageConfig={{
    type: 'server',
    agentUrl: 'https://api.example.com',
  }}
  initialContextId="conv-123"
/>
```

### Theming

#### ChatTheme Interface

```typescript
interface ChatTheme {
  colors: {
    primary: string;
    primaryText: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    // Dark mode variants
    backgroundDark?: string;
    surfaceDark?: string;
    textDark?: string;
    textSecondaryDark?: string;
    borderDark?: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      small: string;
      base: string;
      large: string;
    };
  };
  spacing: {
    unit: number;
  };
  borderRadius: {
    small: string;
    medium: string;
    large: string;
  };
  branding?: {
    logoUrl?: string;
    logoSize?: 'small' | 'medium' | 'large';
    logoPosition?: 'header' | 'footer';
    name?: string;
  };
}
```

#### Theme Utilities

```typescript
import {
  createCustomTheme,
  defaultLightTheme,
  defaultDarkTheme,
  ChatThemeProvider,
} from '@microsoft/logicAppsChat';

// Create custom theme
const myTheme = createCustomTheme({
  primaryColor: '#0066cc',
  backgroundColor: '#ffffff',
});

// Use theme provider
<ChatThemeProvider theme={myTheme}>
  <ChatWidget agentCard="https://api.example.com" />
</ChatThemeProvider>
```

### Utilities

#### Message Utilities

```typescript
import { generateMessageId, createMessage, formatCodeContent } from '@microsoft/logicAppsChat';

// Generate unique message ID
const id = generateMessageId();

// Create message object
const message = createMessage({
  content: 'Hello',
  sender: 'user',
});

// Format code with syntax highlighting
const formatted = formatCodeContent(code, 'typescript');
```

#### File Utilities

```typescript
import { downloadFile, getMimeType } from '@microsoft/logicAppsChat';

// Download file
downloadFile(blob, 'filename.txt');

// Get MIME type from file extension
const mimeType = getMimeType('.pdf'); // 'application/pdf'
```

#### Popup Window

```typescript
import { openPopupWindow } from '@microsoft/logicAppsChat';

// Open popup for OAuth or consent
const popup = openPopupWindow({
  url: 'https://auth.example.com',
  title: 'Authentication',
  width: 600,
  height: 700,
});
```

## TypeScript Support

Full TypeScript support with comprehensive types and schemas:

```typescript
import type {
  // Core types
  AgentCard,
  AgentCapabilities,
  Task,
  Message,
  Part,
  AuthConfig,
  AuthRequiredEvent,

  // React types
  ChatMessage,
  MessageRole,
  MessageStatus,
  ChatTheme,
  StorageConfig,
  ChatSession,

  // Plugin types
  Plugin,
  PluginHooks,
  PluginContext,

  // Storage types
  ChatHistoryStorage,
  SaveMessageOptions,
  ListSessionsOptions,
} from '@microsoft/logicAppsChat';
```

All types are derived from Zod schemas for runtime validation:

```typescript
import { MessageSchema, AgentCardSchema } from '@microsoft/logicAppsChat';

// Validate at runtime
const result = MessageSchema.safeParse(data);
if (result.success) {
  const message = result.data; // Fully typed
}
```

## Examples

See the [main repository README](../../README.md) for comprehensive examples including:

- Server-side history with multi-session
- Custom UI with useA2A hook
- Handling OBO authentication
- Low-level client with streaming
- Plugin usage

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android 90+)

Requires:

- ES2020+
- Server-Sent Events (SSE)
- IndexedDB (for client-side storage)

## License

MIT - see [LICENSE.md](../../LICENSE.md)
