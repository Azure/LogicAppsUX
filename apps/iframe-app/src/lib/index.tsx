import { createRoot } from 'react-dom/client';
import {
  ChatWidget,
  type ChatWidgetProps,
  type ChatTheme,
  type Message,
  type Attachment,
  type AuthConfig,
  type AgentCard,
} from '@microsoft/logicAppsChat';
import '@microsoft/logicAppsChat/styles.css';
import '../styles/base.css';

// Re-export everything from the core library
export { ChatWidget };
export type { ChatWidgetProps, ChatTheme, Message, Attachment, AuthConfig, AgentCard };

// For convenience, export a function to mount the widget
export function mountChatWidget(
  container: HTMLElement | string,
  props: ChatWidgetProps
): () => void {
  const element = typeof container === 'string' ? document.querySelector(container) : container;

  if (!element) {
    throw new Error('Chat widget container not found');
  }

  const root = createRoot(element);
  root.render(<ChatWidget {...props} />);

  // Return unmount function
  return () => {
    root.unmount();
  };
}
