export type AuthConfig =
  | { type: 'bearer'; token: string }
  | { type: 'oauth2'; accessToken: string; tokenType?: string }
  | { type: 'api-key'; key: string; header: string }
  | { type: 'cookie' }
  | { type: 'custom'; handler: (request: Request) => Promise<Request> | Request }
  | { type: 'none' };

export interface RequestConfig {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
}

export interface RequestInterceptor {
  (
    config: RequestConfig & { url: string }
  ): (RequestConfig & { url: string }) | Promise<RequestConfig & { url: string }>;
}

export interface ResponseInterceptor {
  (response: unknown): unknown | Promise<unknown>;
}

export interface HttpClientOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  onTokenRefreshRequired?: () => void | Promise<void>;
}

// Authentication Required Event
export interface AuthRequiredPart {
  consentLink: string;
  status: string;
  serviceName?: string;
  serviceIcon?: string;
  description?: string;
}

export interface AuthRequiredEvent {
  taskId: string;
  contextId: string;
  authParts: AuthRequiredPart[];
  messageType: string;
}

// Authentication Handler
export type AuthRequiredHandler = (event: AuthRequiredEvent) => Promise<void> | void;

// Unauthorized Handler - called when receiving 401 HTTP status
export interface UnauthorizedEvent {
  url: string;
  method: string;
  statusText?: string;
}

export type UnauthorizedHandler = (event: UnauthorizedEvent) => Promise<void> | void;
