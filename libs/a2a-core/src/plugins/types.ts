import type { A2AClient } from '../client/a2a-client';
import type { SessionManager } from '../session/session-manager';
import type { Message } from '../types';

export type PluginContext = {
  client: A2AClient;
  session?: SessionManager;
  config: Record<string, unknown>;
};

export type PluginHooks = {
  // HTTP hooks
  beforeRequest?: (request: any) => any | Promise<any>;
  afterResponse?: (response: any) => any | Promise<any>;

  // Message hooks
  beforeMessageSend?: (message: Message) => Message | Promise<Message>;
  afterMessageReceive?: (message: Message) => Message | Promise<Message>;

  // Task hooks
  onTaskCreated?: (task: any) => void | Promise<void>;
  onTaskCompleted?: (task: any) => void | Promise<void>;
  onTaskFailed?: (task: any) => void | Promise<void>;

  // Error handling
  onError?: (error: Error) => void | Promise<void>;

  // Lifecycle hooks
  onStart?: () => void | Promise<void>;
  onStop?: () => void | Promise<void>;
};

export type Plugin = {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  install: (context: PluginContext) => void;
  uninstall?: () => void;
  hooks?: PluginHooks;
};

export type PluginInfo = {
  name: string;
  version: string;
  enabled?: boolean;
};

export type PluginRegistrationOptions = {
  skipDependencyCheck?: boolean;
};
