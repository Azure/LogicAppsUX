/**
 * Example TypeScript implementation for parent blade integration
 * This shows how to properly integrate the A2A Chat iframe in an Azure Portal blade
 */

import type {
  ChatHistoryData,
  ChatHistoryMessage,
  ChatHistoryFrameBladeMessage,
} from '../lib/types/chat-history';

interface ChatIntegrationConfig {
  chatFrameUrl: string;
  agentCardUrl: string;
  contextId?: string;
  apiKey?: string;
  theme?: string;
}

export class A2AChatIntegration {
  private chatFrame: HTMLIFrameElement | null = null;
  private chatReady = false;
  private config: ChatIntegrationConfig;
  private contextId: string;

  constructor(config: ChatIntegrationConfig) {
    this.config = config;
    this.contextId = config.contextId || this.generateContextId();
  }

  /**
   * Initialize the chat integration
   * @param containerId - ID of the DOM element to insert the iframe
   */
  public initialize(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element with ID '${containerId}' not found`);
    }

    // Create iframe
    this.chatFrame = document.createElement('iframe');
    this.chatFrame.id = 'a2a-chat-frame';
    this.chatFrame.style.width = '100%';
    this.chatFrame.style.height = '100%';
    this.chatFrame.style.border = 'none';

    // Build URL with parameters
    const params = new URLSearchParams({
      agentCard: this.config.agentCardUrl,
      inPortal: 'true',
      trustedAuthority: window.location.origin,
      contextId: this.contextId,
      ...(this.config.apiKey && { apiKey: this.config.apiKey }),
      ...(this.config.theme && { theme: this.config.theme }),
    });

    this.chatFrame.src = `${this.config.chatFrameUrl}?${params.toString()}`;

    // Add message listener
    window.addEventListener('message', this.handleMessage.bind(this));

    // Add to DOM
    container.appendChild(this.chatFrame);
  }

  /**
   * Handle messages from the iframe
   */
  private handleMessage(event: MessageEvent): void {
    // Verify origin
    const expectedOrigin = new URL(this.config.chatFrameUrl).origin;
    if (event.origin !== expectedOrigin) {
      return;
    }

    const message = event.data;

    // Check for Frame Blade signature
    if (message.signature !== 'FxFrameBlade') {
      return;
    }

    switch (message.kind) {
      case 'ready':
        console.log('A2A Chat iframe is ready');
        this.chatReady = true;
        this.onChatReady();
        break;

      case 'initializationcomplete':
        console.log('A2A Chat initialization complete');
        this.onChatInitialized();
        break;

      case 'revealcontent':
        console.log('A2A Chat content revealed');
        break;

      default:
        console.log('Received message from A2A Chat:', message);
    }
  }

  /**
   * Called when chat iframe is ready
   * Override this method to perform actions when chat is ready
   */
  protected onChatReady(): void {
    // Send any initial data
    const chatHistory = this.loadChatHistory();
    if (chatHistory) {
      this.sendChatHistory(chatHistory);
    }
  }

  /**
   * Called when chat is fully initialized
   * Override this method to perform post-initialization actions
   */
  protected onChatInitialized(): void {
    // Override in subclass if needed
  }

  /**
   * Send chat history to the iframe
   */
  public sendChatHistory(history: ChatHistoryData): void {
    if (!this.chatReady || !this.chatFrame) {
      console.error('Chat frame not ready');
      return;
    }

    const message: ChatHistoryFrameBladeMessage = {
      signature: 'FxFrameBlade',
      kind: 'chatHistory',
      data: history,
    };

    const targetOrigin = new URL(this.config.chatFrameUrl).origin;
    this.chatFrame.contentWindow?.postMessage(message, targetOrigin);
  }

  /**
   * Load chat history from your backend or storage
   * Override this method to provide actual chat history
   */
  protected loadChatHistory(): ChatHistoryData | null {
    // Example implementation - replace with actual data loading
    return {
      contextId: this.contextId,
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello, I need help with my Azure subscription',
          timestamp: new Date('2024-01-15T10:30:00Z'),
          metadata: {},
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content:
            "I'd be happy to help you with your Azure subscription. What specific issue are you experiencing?",
          timestamp: new Date('2024-01-15T10:30:15Z'),
          metadata: {},
        },
      ],
      sessionMetadata: {
        startedAt: new Date('2024-01-15T10:30:00Z'),
        lastActivityAt: new Date('2024-01-15T10:31:00Z'),
      },
    };
  }

  /**
   * Generate a unique context ID
   */
  private generateContextId(): string {
    return `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send a theme change message to the iframe
   */
  public setTheme(theme: 'light' | 'dark'): void {
    if (!this.chatFrame) {
      console.error('Chat frame not initialized');
      return;
    }

    const message = {
      signature: 'FxFrameBlade',
      kind: 'themeChanged',
      data: theme,
    };

    const targetOrigin = new URL(this.config.chatFrameUrl).origin;
    this.chatFrame.contentWindow?.postMessage(message, targetOrigin);
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    window.removeEventListener('message', this.handleMessage.bind(this));
    if (this.chatFrame && this.chatFrame.parentNode) {
      this.chatFrame.parentNode.removeChild(this.chatFrame);
    }
    this.chatFrame = null;
    this.chatReady = false;
  }
}

// Example usage:
/*
const chatIntegration = new A2AChatIntegration({
  chatFrameUrl: 'https://your-chat-domain.com/iframe.html',
  agentCardUrl: 'https://api.example.com/agent-card.json',
  apiKey: 'your-api-key',
  theme: 'azure'
});

// Initialize in a container
chatIntegration.initialize('chat-container');

// Later, you can send additional history
chatIntegration.sendChatHistory({
  contextId: 'ctx-123',
  messages: [
    // ... your messages
  ]
});

// Change theme
chatIntegration.setTheme('dark');

// Clean up when done
chatIntegration.dispose();
*/
