/**
 * A2A Chat History API Client
 *
 * Provides functions to interact with server-side chat history APIs.
 * All methods use JSON-RPC 2.0 protocol over HTTP POST.
 *
 * IMPORTANT API Corrections from live testing:
 * - Method name is "context/update" (singular), NOT "contexts/update"
 * - All enum values are lowercase: "user", "agent", "text", etc.
 * - Name field is optional in contexts
 *
 * See: docs/api-testing-findings.md for detailed API behavior
 */

import {
  ServerContext,
  ServerTask,
  ListContextsParams,
  ListTasksParams,
  UpdateContextParams,
  ListContextsResponseSchema,
  ListTasksResponseSchema,
  UpdateContextResponseSchema,
} from './history-types';

/**
 * Configuration for history API calls
 */
export type HistoryApiConfig = {
  agentUrl: string; // Full agent URL (e.g., https://example.com/api/agents/AgentName)
  apiKey?: string; // API key for authentication (passed as X-API-Key header)
  oboUserToken?: string; // OBO user token for authentication (passed as x-ms-obo-userToken header)
  timeout?: number; // Request timeout in ms (default: 30000)
};

/**
 * JSON-RPC 2.0 request structure
 */
type JsonRpcRequest = {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params?: Record<string, unknown>;
};

/**
 * Base API client for making JSON-RPC calls
 */
class HistoryApiClient {
  private config: HistoryApiConfig;
  private requestIdCounter = 0;

  constructor(config: HistoryApiConfig) {
    this.config = config;
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `history-${Date.now()}-${++this.requestIdCounter}`;
  }

  /**
   * Make a JSON-RPC call to the agent
   */
  private async makeRequest<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: this.generateRequestId(),
      method,
      params,
    };

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add API key header if provided
    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    // Add OBO user token header if provided
    if (this.config.oboUserToken) {
      headers['x-ms-obo-userToken'] = `Key ${this.config.oboUserToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.timeout ?? 30000);

    try {
      const response = await fetch(this.config.agentUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
        credentials: 'include', // Include cookies for cookie-based authentication
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Check for JSON-RPC error
      if (data.error) {
        throw new Error(`JSON-RPC error ${data.error.code}: ${data.error.message}`);
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.config.timeout ?? 30000}ms`);
        }
        throw error;
      }

      throw new Error('Unknown error occurred during API request');
    }
  }

  /**
   * List all contexts (chat sessions) for the authenticated user
   *
   * @param params - Optional filter and pagination parameters
   * @returns Array of contexts
   */
  async listContexts(params?: ListContextsParams): Promise<ServerContext[]> {
    const response = await this.makeRequest('contexts/list', params);
    const validated = ListContextsResponseSchema.parse(response);
    return validated.result;
  }

  /**
   * List all tasks (message exchanges) within a context
   *
   * @param contextId - The context ID to fetch tasks for
   * @returns Array of tasks with full message history
   */
  async listTasks(contextId: string): Promise<ServerTask[]> {
    const params: ListTasksParams = {
      Id: contextId, // Note: capital 'I' as per API spec
    };

    const response = await this.makeRequest('tasks/list', params);
    const validated = ListTasksResponseSchema.parse(response);
    return validated.result;
  }

  /**
   * Update context metadata (name, archive status, etc.)
   *
   * IMPORTANT: The method name is "context/update" (singular), not "contexts/update"
   *
   * @param params - Update parameters (id, name, isArchived)
   * @returns Updated context
   */
  async updateContext(params: UpdateContextParams): Promise<ServerContext> {
    // CRITICAL: Method name is singular "context/update", not "contexts/update"
    const response = await this.makeRequest('context/update', params);
    const validated = UpdateContextResponseSchema.parse(response);
    return validated.result;
  }
}

// ============================================================================
// Exported Factory Function
// ============================================================================

/**
 * Create a history API client instance
 *
 * @param config - API configuration
 * @returns History API client instance
 *
 * @example
 * ```typescript
 * const historyApi = createHistoryApi({
 *   agentUrl: 'https://example.com/api/agents/MyAgent',
 *   apiKey: 'your-api-key-here',
 *   oboUserToken: 'optional-obo-token',
 * });
 *
 * const contexts = await historyApi.listContexts({
 *   includeLastTask: true,
 *   includeArchived: false,
 * });
 * ```
 */
export const createHistoryApi = (config: HistoryApiConfig): HistoryApiClient => {
  return new HistoryApiClient(config);
};

/**
 * Type export for the API client
 */
export type HistoryApi = HistoryApiClient;
