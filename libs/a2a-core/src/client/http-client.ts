import pRetry from 'p-retry';
import type {
  AuthConfig,
  RequestConfig,
  RequestInterceptor,
  ResponseInterceptor,
  HttpClientOptions,
  UnauthorizedHandler,
} from './types';
import { isJsonRpcError, isJsonRpcResult } from '../types/schemas';
import { JsonRpcErrorResponse } from '../types/errors';

export class HttpClient {
  private readonly baseUrl: string;
  private readonly auth: AuthConfig | undefined;
  private readonly options: Required<Omit<HttpClientOptions, 'onTokenRefreshRequired'>> &
    Pick<HttpClientOptions, 'onTokenRefreshRequired'>;
  private readonly apiKey?: string;
  private readonly oboUserToken?: string;
  private readonly onUnauthorized?: UnauthorizedHandler;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor(
    baseUrl: string,
    auth?: AuthConfig,
    options: HttpClientOptions = {},
    apiKey?: string,
    onUnauthorized?: UnauthorizedHandler,
    oboUserToken?: string
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.auth = auth;
    this.apiKey = apiKey;
    this.oboUserToken = oboUserToken;
    this.onUnauthorized = onUnauthorized;
    this.options = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...options,
    };
  }

  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  async request<T = unknown>(path: string, config: RequestConfig = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    // Default headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...config.headers,
    });

    // Add API key header if provided
    if (this.apiKey) {
      headers.set('X-API-Key', this.apiKey);
    }

    // Add OBO user token header if provided
    if (this.oboUserToken) {
      headers.set('x-ms-obo-userToken', `Key ${this.oboUserToken}`);
    }

    // Create request config
    let requestConfig: RequestConfig & { url: string } = {
      ...config,
      url,
      headers: Object.fromEntries(headers.entries()),
    };

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      requestConfig = await interceptor(requestConfig);
    }

    // Create request options
    const requestOptions: RequestInit = {
      method: requestConfig.method || 'GET',
      headers: new Headers(requestConfig.headers),
    };

    // Only add optional properties if defined
    if (requestConfig.signal !== undefined) {
      requestOptions.signal = requestConfig.signal;
    }
    if (requestConfig.credentials !== undefined) {
      requestOptions.credentials = requestConfig.credentials;
    }
    if (requestConfig.body) {
      requestOptions.body = JSON.stringify(requestConfig.body);
    }

    // Create request with auth
    const request = new Request(requestConfig.url, requestOptions);

    // Apply authentication
    await this.applyAuth(request);

    // Execute request with retry
    const response = await pRetry(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

        try {
          const options: RequestInit = {
            method: request.method,
            headers: request.headers,
            signal: controller.signal,
            redirect: 'manual', // Prevent automatic redirect following
          };

          // Add optional properties if defined
          if (request.credentials !== undefined) {
            options.credentials = request.credentials;
          }

          // Add body and duplex option if needed
          if (request.body) {
            options.body = request.body;
            // Required for streaming bodies in some environments
            (options as any).duplex = 'half';
          }

          const fetchRequest = new Request(request.url, options);

          const res = await fetch(fetchRequest);
          clearTimeout(timeoutId);

          // Handle manual redirect responses
          if (res.type === 'opaqueredirect' || res.status === 302 || res.status === 301) {
            if (this.onUnauthorized) {
              const unauthorizedEvent = {
                url: request.url,
                method: request.method,
                statusText: 'Redirect',
              };
              await Promise.resolve(this.onUnauthorized(unauthorizedEvent));
            }
            throw new Error('HTTP redirect detected - session may have expired');
          }

          if (!res.ok) {
            // Handle 401 Unauthorized specially
            if (res.status === 401 && this.onUnauthorized) {
              const unauthorizedEvent = {
                url: request.url,
                method: request.method,
                statusText: res.statusText,
              };
              await Promise.resolve(this.onUnauthorized(unauthorizedEvent));
            }

            const errorBody = await this.parseErrorResponse(res);
            throw new Error(errorBody || `HTTP error! status: ${res.status} ${res.statusText}`);
          }

          return res;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      },
      {
        retries: this.options.retries,
        minTimeout: this.options.retryDelay,
        onFailedAttempt: (error) => {
          console.warn(`Request failed, attempt ${error.attemptNumber}: ${error.message}`);
        },
      }
    );

    // Check for token refresh header only for consumption agents
    if (new URL(requestConfig.url).hostname.endsWith('.logic.azure.com')) {
      const tokenRefreshHeader = response.headers?.get('x-ms-aad-token-refresh-option');
      if (tokenRefreshHeader === 'refresh') {
        if (this.options.onTokenRefreshRequired) {
          await Promise.resolve(this.options.onTokenRefreshRequired());
        } else {
          // Default behavior: reload the page
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }
        // Return early to prevent further processing
        throw new Error(
          `Token refresh initiated - request cannot be completed. URL: ${requestConfig.url}, Method: ${requestConfig.method}`
        );
      }
    }

    // Parse response
    let data = await response.json();

    // Validate JSON-RPC response if it looks like one
    if (this.isJsonRpcResponse(data)) {
      data = this.validateJsonRpcResponse(data);
    }

    // Apply response interceptors
    for (const interceptor of this.responseInterceptors) {
      data = await interceptor(data);
    }

    return data as T;
  }

  async get<T = unknown>(
    path: string,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(path, { ...config, method: 'GET' });
  }

  async post<T = unknown>(
    path: string,
    body?: unknown,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(path, { ...config, method: 'POST', body });
  }

  async put<T = unknown>(
    path: string,
    body?: unknown,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(path, { ...config, method: 'PUT', body });
  }

  async delete<T = unknown>(
    path: string,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(path, { ...config, method: 'DELETE' });
  }

  private async applyAuth(request: Request): Promise<void> {
    if (!this.auth || this.auth.type === 'none') {
      return;
    }

    switch (this.auth.type) {
      case 'bearer':
        request.headers.set('Authorization', `Bearer ${this.auth.token}`);
        break;

      case 'oauth2':
        const tokenType = this.auth.tokenType || 'Bearer';
        request.headers.set('Authorization', `${tokenType} ${this.auth.accessToken}`);
        break;

      case 'api-key':
        request.headers.set(this.auth.header, this.auth.key);
        break;

      case 'custom':
        await this.auth.handler(request);
        break;
    }
  }

  private async parseErrorResponse(response: Response): Promise<string | null> {
    try {
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        const errorData = await response.json();

        // Try common error message patterns
        if (errorData.error?.message) return errorData.error.message;
        if (errorData.message) return errorData.message;
        if (errorData.error) return errorData.error;

        return JSON.stringify(errorData);
      } else {
        return await response.text();
      }
    } catch {
      return null;
    }
  }

  /**
   * Check if the response looks like a JSON-RPC response
   */
  private isJsonRpcResponse(data: unknown): boolean {
    return (
      typeof data === 'object' &&
      data !== null &&
      'jsonrpc' in data &&
      (data as any).jsonrpc === '2.0'
    );
  }

  /**
   * Validate and handle JSON-RPC response (success or error)
   * Throws JsonRpcErrorResponse if the response is a JSON-RPC error
   * Returns the result if it's a success response
   */
  private validateJsonRpcResponse<T>(data: unknown): T {
    // Check if it's a JSON-RPC error
    if (isJsonRpcError(data)) {
      throw new JsonRpcErrorResponse(data);
    }

    // Check if it's a JSON-RPC result
    if (isJsonRpcResult(data)) {
      return data.result as T;
    }

    // If it has jsonrpc: "2.0" but doesn't match error or result format,
    // return as-is (might be a notification or other format)
    return data as T;
  }
}
