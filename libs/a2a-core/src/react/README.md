# A2A Chat React Components

This directory contains the React components and utilities for the A2A Chat SDK, providing a complete chat widget implementation that can be easily integrated into any React application.

## Components

### Main Component

- **ChatWidget** - The main chat widget component that combines all features into a ready-to-use chat interface
- **ChatWindow** - The container component that manages the chat UI layout

### UI Components

- **MessageList** - Displays the list of chat messages with auto-scrolling
- **MessageInput** - Input field for sending messages with file upload support
- **Message** - Individual message component with markdown and code highlighting support
- **TypingIndicator** - Shows when the agent is typing
- **CompanyLogo** - Displays company branding/logo
- **FileUpload** - File selection and upload component

## Hooks

- **useA2A** - Core hook for A2A SDK integration
- **useChatWidget** - High-level hook that combines A2A SDK with local state management
- **useTheme** - Theme management hook with CSS variable application

## State Management

- **chatStore** - Zustand store for managing chat state (messages, connection status, typing indicators)

## Utilities

- **messageUtils** - Message creation and formatting utilities
- **downloadUtils** - File download helpers with MIME type detection

## Usage

### Important: CSS Import Required

The chat widget requires its CSS file to be imported for proper styling:

```tsx
// Import the chat widget component
import { ChatWidget } from '@microsoft/logicAppsChat/react';

// IMPORTANT: Import the styles - without this, the widget will appear broken
import '@microsoft/logicAppsChat/react/styles.css';

function App() {
  return (
    <div style={{ height: '600px' }}>
      <ChatWidget
        agentCard="https://agent.example.com/agent-card.json"
        theme={{
          colors: {
            primary: '#007bff',
          },
        }}
        welcomeMessage="Hello! How can I help you today?"
        allowFileUpload={true}
        onMessage={(message) => console.log('New message:', message)}
        onConnectionChange={(connected) => console.log('Connected:', connected)}
      />
    </div>
  );
}
```

**Note**: The widget takes up 100% of its container's height and width, so make sure to set a height on the parent container.

## Features

- Real-time messaging with WebSocket support
- Markdown rendering with syntax highlighting
- File uploads and attachments
- Typing indicators
- Customizable theming
- Session persistence
- Auto-reconnection
- Message status tracking

## TypeScript Support

All components and hooks are fully typed with TypeScript, providing excellent IDE support and type safety.
