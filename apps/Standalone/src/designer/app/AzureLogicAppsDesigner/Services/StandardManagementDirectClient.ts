import type { HttpRequestOptions, IHttpClient } from '@microsoft/logic-apps-shared';

class StandardManagementDirectError extends Error {
  readonly error: unknown;

  constructor(
    readonly status: number,
    readonly data: unknown,
    readonly retryAfter: string | undefined,
    unreadableErrorBody = false
  ) {
    const error = typeof data === 'object' && data !== null && 'error' in data ? data.error : undefined;
    const message = typeof error === 'object' && error !== null && 'message' in error ? error.message : undefined;
    super(
      typeof message === 'string'
        ? message
        : `The direct management request failed (HTTP ${status}).${unreadableErrorBody ? ' The error response body could not be read.' : ''}`
    );
    this.name = 'StandardManagementDirectError';
    this.error = error;
  }
}

/** Sends only caller-supplied credentials; never follows redirects or replays a request. */
export class StandardManagementDirectClient implements IHttpClient {
  get<ReturnType>(options: HttpRequestOptions<unknown>): Promise<ReturnType> {
    return this.request('GET', options);
  }

  post<ReturnType, BodyType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType> {
    return this.request('POST', options);
  }

  patch<ReturnType, BodyType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType> {
    return this.request('PATCH', options);
  }

  put<ReturnType, BodyType>(options: HttpRequestOptions<BodyType>): Promise<ReturnType> {
    return this.request('PUT', options);
  }

  delete<ReturnType>(options: HttpRequestOptions<unknown>): Promise<ReturnType> {
    return this.request('DELETE', options);
  }

  dispose(): void {
    // This transport owns no credentials, subscriptions, or persistent resources.
  }

  private async request<ReturnType>(method: string, options: HttpRequestOptions<unknown>): Promise<ReturnType> {
    const url = new URL(options.uri);
    for (const [name, value] of Object.entries(options.queryParameters ?? {})) {
      url.searchParams.set(name, String(value));
    }

    const headers = new Headers();
    for (const [name, value] of Object.entries(options.headers ?? {})) {
      headers.set(name, Array.isArray(value) ? value.join(', ') : value);
    }

    let body: BodyInit | undefined;
    if (method !== 'GET' && options.content !== undefined) {
      const content = options.content;
      if (
        content instanceof Blob ||
        content instanceof FormData ||
        content instanceof URLSearchParams ||
        content instanceof ArrayBuffer ||
        ArrayBuffer.isView(content)
      ) {
        body = content;
      } else {
        body = typeof content === 'string' ? content : JSON.stringify(content);
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }
      }
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body,
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
    });
    const retryAfter = response.headers.get('Retry-After') ?? undefined;
    let data: unknown;
    try {
      const text = await response.text();
      data = text === '' ? undefined : text;
      if (text !== '') {
        try {
          data = JSON.parse(text);
        } catch (error) {
          if (response.ok) {
            throw error;
          }
        }
      }
    } catch (error) {
      if (response.ok) {
        throw error;
      }
      throw new StandardManagementDirectError(response.status, undefined, retryAfter, true);
    }
    if (!response.ok) {
      throw new StandardManagementDirectError(response.status, data, retryAfter);
    }
    if (options.returnHeaders) {
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, name) => {
        responseHeaders[name] = value;
      });
      return { ...Object(data), responseHeaders } as ReturnType;
    }
    return data as ReturnType;
  }
}
