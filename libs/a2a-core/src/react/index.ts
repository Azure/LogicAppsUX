// Import styles - this ensures they're included in the bundle
import './styles/index.css';

// Main exports for React integration
export { ChatWidget } from './components/ChatWidget';
export { ChatWindow } from './components/ChatWindow';
export { ChatThemeProvider } from './components/ThemeProvider/ThemeProvider';
export type { ChatThemeProviderProps } from './components/ThemeProvider/ThemeProvider';

// Hooks
export { useA2A } from './use-a2a';
export type { UseA2AOptions, UseA2AReturn, ChatMessage } from './use-a2a';
export { useChatWidget } from './hooks/useChatWidget';
export { useTheme } from './hooks/useTheme';

// Store
export { useChatStore } from './store/chatStore';

// Types
export type {
  Message,
  Attachment,
  ChatTheme,
  ChatWidgetProps,
  MessageRole,
  MessageStatus,
  AttachmentStatus,
  Branding,
  AgentCard,
  AuthConfig,
} from './types';

export type {
  AuthRequiredEvent,
  AuthRequiredPart,
  AuthRequiredHandler,
  UnauthorizedEvent,
  UnauthorizedHandler,
} from '../client/types';

// Individual components (for advanced usage)
export { MessageList } from './components/MessageList';
export { MessageInput } from './components/MessageInput';
export { Message as MessageComponent } from './components/Message';
export { TypingIndicator } from './components/TypingIndicator';
export { CompanyLogo } from './components/CompanyLogo';
export { FileUpload } from './components/FileUpload';
// Session management component
export { SessionList } from './components/SessionList';
export type { SessionListProps } from './components/SessionList';
// Authentication component
export { AuthenticationMessage } from './components/Message/AuthenticationMessage';
export type { AuthenticationMessageProps } from './components/Message/AuthenticationMessage';

// Utilities (for advanced usage)
export { generateMessageId, createMessage, formatCodeContent } from './utils/messageUtils';
export { downloadFile, getMimeType } from './utils/downloadUtils';
export { openPopupWindow } from '../utils/popup-window';
export type { PopupWindowOptions, PopupWindowResult } from '../utils/popup-window';
export { isDirectAgentCardUrl } from '../utils/agentUrlUtils';

// Fluent UI Theme exports
export { createCustomTheme, defaultLightTheme, defaultDarkTheme } from './theme/fluentTheme';
export type { ThemeConfig } from './theme/fluentTheme';

// Storage exports
export { createHistoryStorage } from '../storage';
export type {
  ChatHistoryStorage,
  StorageConfig,
  ListSessionsOptions,
} from '../storage/history-storage';
export { ServerHistoryStorage } from '../storage/server-history-storage';
export type { ServerHistoryStorageConfig } from '../storage/server-history-storage';
export type { ChatSession, Message as StorageMessage, MessageContent } from '../api/history-types';
