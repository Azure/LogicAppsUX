# Parent Blade Integration Guide

This guide explains how to integrate the A2A Chat iframe from a parent Azure Portal blade, including how to populate chat history and manage context.

## Overview

When embedding the A2A Chat iframe in an Azure Portal blade, you can:

1. Pass initial configuration via URL parameters
2. Send chat history via postMessage
3. Receive updates about chat state

## Initial Setup

### 1. Embed the iframe

```html
<iframe
  id="a2a-chat-frame"
  src="https://your-domain.com/iframe.html?agentCard=https://api.example.com/agent-card.json&inPortal=true&trustedAuthority=https://portal.azure.com&contextId=unique-context-123"
  width="100%"
  height="600"
  frameborder="0"
></iframe>
```

### 2. Required URL Parameters for Portal Context

- `inPortal=true` - Indicates the iframe is running in portal context
- `trustedAuthority` - The portal's origin (e.g., `https://portal.azure.com`)
- `contextId` - Unique identifier for the chat session
- `agentCard` - URL to the agent configuration

## Sending Chat History

### Message Format

To populate the chat with existing conversation history, send a postMessage with the following format:

```typescript
interface ChatHistoryMessage {
  id: string; // Unique message ID
  role: 'user' | 'assistant' | 'system'; // Who sent the message
  content: string; // Message content
  timestamp: string | Date; // When the message was sent
  metadata?: {
    // Optional metadata
    artifacts?: Array<{
      id: string;
      type: string;
      title?: string;
      content: string;
    }>;
    [key: string]: any;
  };
}

interface ChatHistoryData {
  contextId: string; // Context ID for this chat
  messages: ChatHistoryMessage[]; // Array of messages
  sessionMetadata?: {
    // Optional session metadata
    startedAt?: string | Date;
    lastActivityAt?: string | Date;
    [key: string]: any;
  };
}
```

### Sending the History

```javascript
// Get reference to the iframe
const chatFrame = document.getElementById('a2a-chat-frame');

// Wait for the iframe to be ready
window.addEventListener('message', (event) => {
  if (event.data.signature === 'FxFrameBlade' && event.data.kind === 'ready') {
    // Frame is ready, send chat history
    sendChatHistory();
  }
});

function sendChatHistory() {
  const chatHistory = {
    signature: 'FxFrameBlade',
    kind: 'chatHistory',
    data: {
      contextId: 'unique-context-123',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello, I need help with my Azure subscription',
          timestamp: '2024-01-15T10:30:00Z',
          metadata: {},
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content:
            "I'd be happy to help you with your Azure subscription. What specific issue are you experiencing?",
          timestamp: '2024-01-15T10:30:15Z',
          metadata: {},
        },
        {
          id: 'msg-3',
          role: 'user',
          content: 'I want to upgrade my subscription plan',
          timestamp: '2024-01-15T10:31:00Z',
          metadata: {},
        },
      ],
      sessionMetadata: {
        startedAt: '2024-01-15T10:30:00Z',
        lastActivityAt: '2024-01-15T10:31:00Z',
        sourceTicketId: 'TICKET-12345',
      },
    },
  };

  chatFrame.contentWindow.postMessage(chatHistory, 'https://your-domain.com');
}
```

## Complete Example

Here's a complete example of how to integrate the chat iframe in a blade:

```javascript
class ChatIntegration {
  constructor() {
    this.chatFrame = null;
    this.chatReady = false;
  }

  initialize() {
    // Create iframe
    this.chatFrame = document.createElement('iframe');
    this.chatFrame.id = 'a2a-chat-frame';
    this.chatFrame.style.width = '100%';
    this.chatFrame.style.height = '600px';
    this.chatFrame.style.border = 'none';

    // Build URL with parameters
    const params = new URLSearchParams({
      agentCard: 'https://api.example.com/agent-card.json',
      inPortal: 'true',
      trustedAuthority: window.location.origin,
      contextId: this.generateContextId(),
      apiKey: 'your-api-key', // If using API key auth
      theme: 'azure', // Optional theme
    });

    this.chatFrame.src = `https://your-chat-domain.com/iframe.html?${params.toString()}`;

    // Add message listener
    window.addEventListener('message', this.handleMessage.bind(this));

    // Add to DOM
    document.getElementById('chat-container').appendChild(this.chatFrame);
  }

  handleMessage(event) {
    // Verify origin
    if (event.origin !== 'https://your-chat-domain.com') {
      return;
    }

    const message = event.data;

    // Check for Frame Blade signature
    if (message.signature !== 'FxFrameBlade') {
      return;
    }

    switch (message.kind) {
      case 'ready':
        console.log('Chat iframe is ready');
        this.chatReady = true;
        this.sendInitialData();
        break;

      case 'initializationcomplete':
        console.log('Chat initialization complete');
        break;

      default:
        console.log('Received message:', message);
    }
  }

  sendInitialData() {
    // Send chat history if available
    const chatHistory = this.loadChatHistory();
    if (chatHistory) {
      this.sendChatHistory(chatHistory);
    }
  }

  sendChatHistory(history) {
    if (!this.chatReady || !this.chatFrame) {
      console.error('Chat frame not ready');
      return;
    }

    const message = {
      signature: 'FxFrameBlade',
      kind: 'chatHistory',
      data: history,
    };

    this.chatFrame.contentWindow.postMessage(message, 'https://your-chat-domain.com');
  }

  loadChatHistory() {
    // Load from your backend or storage
    return {
      contextId: this.contextId,
      messages: [
        // Your messages here
      ],
      sessionMetadata: {
        startedAt: new Date().toISOString(),
        // Other metadata
      },
    };
  }

  generateContextId() {
    // Generate unique context ID based on your requirements
    return `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Initialize when blade loads
const chatIntegration = new ChatIntegration();
chatIntegration.initialize();
```

## Best Practices

1. **Always verify message origins** - Check that messages come from your expected chat domain
2. **Send history early** - Send chat history as soon as you receive the 'ready' message
3. **Use consistent context IDs** - Ensure the contextId in the URL matches the one in chat history
4. **Handle errors gracefully** - The iframe might not be ready immediately
5. **Include timestamps** - Always include proper timestamps for message ordering

## Message Timing

The typical message flow is:

1. Parent blade embeds iframe with configuration
2. Iframe sends 'ready' message when loaded
3. Parent blade sends chat history
4. Iframe sends 'initializationcomplete' when fully initialized
5. Normal chat operation begins

## Security Considerations

- Always validate the `trustedAuthority` parameter
- Use HTTPS for all communications
- Verify message origins before processing
- Don't send sensitive data that shouldn't be in chat history
- Consider encrypting chat history if it contains sensitive information
