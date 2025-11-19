/**
 * @a2achat/react - React SDK for building chat interfaces
 *
 * This library provides React components and hooks for building chat interfaces
 * that connect to A2A (Agent-to-Agent) protocol agents. The A2A protocol is an
 * implementation detail - you work with React components and hooks.
 *
 * ## Quick Start
 *
 * ```tsx
 * import { ChatWidget } from '@a2achat/react';
 *
 * function App() {
 *   return (
 *     <ChatWidget
 *       agentCard="https://your-agent.com/agent-card"
 *       welcomeMessage="Hello! How can I help you today?"
 *     />
 *   );
 * }
 * ```
 *
 * For more control, use the hooks:
 *
 * ```tsx
 * import { useChat, ChatWindow } from '@a2achat/react';
 *
 * function CustomChat() {
 *   const chat = useChat({ agentUrl: 'https://your-agent.com' });
 *
 *   return (
 *     <ChatWindow
 *       messages={chat.messages}
 *       onSendMessage={chat.sendMessage}
 *       isLoading={chat.isLoading}
 *     />
 *   );
 * }
 * ```
 */

// Primary exports - React components and hooks
export * from './react';

// Export commonly needed types for configuration
export type { ChatConfig, AgentConfig, ChatTheme, Branding } from './react/types';

// Note: Advanced A2A protocol types are available in the React module but
// are considered implementation details. Use the React-friendly types above.
