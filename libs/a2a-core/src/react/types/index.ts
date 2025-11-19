import type { AgentCard } from '../../types';
import type { AuthConfig, AuthRequiredPart } from '../../client/types';
import type { StorageConfig } from '../../storage/history-storage';

// Re-export types from main module
export type { AgentCard, AuthConfig, AuthRequiredPart, StorageConfig };

// Define and export message roles and statuses
export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'error';
export type AttachmentStatus = 'uploading' | 'uploaded' | 'error';
export type AuthenticationStatus = 'pending' | 'completed' | 'failed' | 'canceled';

export interface FileAttachment {
  name: string;
  mimeType: string;
  data: string; // base64 encoded
}

export interface Message {
  id: string;
  content: string;
  sender: MessageRole;
  timestamp: Date;
  status?: MessageStatus;
  metadata?: Record<string, any>;
  attachments?: Attachment[];
  files?: FileAttachment[]; // For files sent by the backend (images, etc.)
  authEvent?: {
    authParts: AuthRequiredPart[];
    status: AuthenticationStatus;
  };
  error?: {
    message: string;
    code?: number | string;
    details?: any;
  };
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  status: AttachmentStatus;
}

export interface ChatTheme {
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
    // Dark mode specific colors
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
  branding?: Branding;
}

export interface Branding {
  logoUrl?: string;
  logoSize?: 'small' | 'medium' | 'large';
  logoPosition?: 'header' | 'footer';
  name?: string;
}

/**
 * Configuration for connecting to an agent
 */
export interface AgentConfig {
  /** Agent URL or agent card URL */
  url: string;
  /** Agent display name (optional, will be fetched from agent card if not provided) */
  name?: string;
  /** Authentication configuration */
  auth?: AuthConfig;
}

/**
 * Main configuration for the chat interface
 */
export interface ChatConfig {
  /** Agent configuration */
  agent: AgentConfig;
  /** Custom theme */
  theme?: Partial<ChatTheme>;
  /** User ID for tracking */
  userId?: string;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
  /** Placeholder text for message input */
  placeholder?: string;
  /** Welcome message to show on first load */
  welcomeMessage?: string;
  /** Enable file uploads */
  allowFileUpload?: boolean;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Allowed file types */
  allowedFileTypes?: string[];
  /** Custom display name for the user */
  userName?: string;
  /** Server-side storage configuration */
  storageConfig?: StorageConfig;
}

export interface ChatWidgetProps {
  agentCard: string | AgentCard;
  auth?: AuthConfig;
  theme?: Partial<ChatTheme>;
  onMessage?: (message: Message) => void;
  onConnectionChange?: (connected: boolean) => void;
  userId?: string;
  metadata?: Record<string, any>;
  placeholder?: string;
  welcomeMessage?: string;
  allowFileUpload?: boolean;
  maxFileSize?: number; // in bytes
  allowedFileTypes?: string[];
  userName?: string; // Custom display name for the user, defaults to "You"
  sessionKey?: string; // Optional session key for multi-session support
  agentUrl?: string; // Optional agent URL for proper session isolation
  onToggleSidebar?: () => void; // Callback for toggling sidebar
  isSidebarCollapsed?: boolean; // Current sidebar state
  apiKey?: string; // Optional API key for authentication
  oboUserToken?: string; // Optional OBO user token for authentication
  onUnauthorized?: (event: {
    url: string;
    method: string;
    statusText?: string;
  }) => Promise<void> | void; // Called on 401 errors
  onContextIdChange?: (contextId: string) => void; // Callback when context ID changes
  sessionName?: string; // Optional session/chat name for display in header
  onRenameSession?: (newName: string) => void | Promise<void>; // Callback for renaming the session
  storageConfig?: StorageConfig; // Optional storage configuration for server-side chat history
  initialContextId?: string; // Initial context ID for resuming existing server-side conversations
  sessionId?: string; // For multi-session mode - enables session-specific message isolation
}
