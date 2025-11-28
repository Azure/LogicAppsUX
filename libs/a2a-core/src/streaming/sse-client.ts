import type { SSEMessage, SSEClientOptions, MessageHandler, ErrorHandler } from './types';

export class SSEClient {
  private eventSource: EventSource | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private url: string;
  private options: SSEClientOptions;
  private messageHandlers: MessageHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private messageQueue: SSEMessage[] = [];
  private closed = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectDelay: number;

  constructor(url: string, options: SSEClientOptions = {}) {
    this.url = url;
    this.options = {
      headers: {},
      withCredentials: false,
      reconnect: true,
      reconnectDelay: 1000,
      onOpen: () => {},
      onClose: () => {},
      method: 'GET',
      body: '',
      ...options,
    };
    this.reconnectDelay = this.options.reconnectDelay || 1000;

    this.connect();
  }

  private async connect(isRetry = false): Promise<void> {
    if (this.closed) return;

    try {
      // Use fetch for SSE when we need to send POST with body
      if (this.options.method === 'POST' || this.options.body) {
        const response = await fetch(this.url, {
          method: this.options.method || 'POST',
          headers: {
            ...this.options.headers,
            Accept: 'text/event-stream',
          },
          body: this.options.body,
          credentials: this.options.withCredentials ? 'include' : 'same-origin',
          redirect: 'manual', // Prevent automatic redirect following
        });

        // Handle manual redirect responses
        if (
          response.type === 'opaqueredirect' ||
          response.status === 302 ||
          response.status === 301
        ) {
          if (this.options.onUnauthorized && !isRetry) {
            await Promise.resolve(
              this.options.onUnauthorized({
                url: this.url,
                method: this.options.method || 'POST',
                statusText: 'Redirect',
              })
            );

            // After onUnauthorized completes, retry the connection once
            console.log('Retrying SSE connection after authentication refresh...');
            return this.connect(true);
          }
          throw new Error('HTTP redirect detected - session may have expired');
        }

        if (!response.ok) {
          // Handle 401 Unauthorized specially
          if (response.status === 401) {
            if (new URL(this.url).hostname.endsWith('.logic.azure.com')) {
              // Check for token refresh header
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
                return;
              }
            } else if (this.options.onUnauthorized && !isRetry) {
              await Promise.resolve(
                this.options.onUnauthorized({
                  url: this.url,
                  method: this.options.method || 'POST',
                  statusText: response.statusText,
                })
              );

              // After onUnauthorized completes, retry the connection once
              console.log('Retrying SSE connection after authentication refresh...');
              return this.connect(true);
            }
          }
          // Throw error for all non-OK responses (401, 500, 503, etc.)
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        this.options.onOpen?.();
        this.reconnectDelay = this.options.reconnectDelay || 1000;

        // Process the stream
        this.reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (this.reader && !this.closed) {
          try {
            const { done, value } = await this.reader.read();

            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE messages
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            let currentMessage: Partial<SSEMessage> = {};

            for (const line of lines) {
              if (line.trim() === '') {
                // Empty line indicates end of message
                if (Object.keys(currentMessage).length > 0) {
                  // Default to 'message' event if no event specified
                  if (!currentMessage.event) {
                    currentMessage.event = 'message';
                  }
                  this.handleSSEMessage(currentMessage as SSEMessage);
                  currentMessage = {};
                }
              } else if (line.startsWith('event:')) {
                currentMessage.event = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                const data = line.slice(5).trim();
                try {
                  currentMessage.data = JSON.parse(data);
                } catch {
                  currentMessage.data = data;
                }
              } else if (line.startsWith('id:')) {
                currentMessage.id = line.slice(3).trim();
              }
            }
          } catch (error) {
            if (!this.closed) {
              console.error('Error reading stream:', error);
              this.handleError(error as Error);
            }
            break;
          }
        }
      } else {
        // Use EventSource for GET requests
        const eventSourceInit: EventSourceInit = {
          withCredentials: this.options.withCredentials,
        };

        this.eventSource = new EventSource(this.url, eventSourceInit);

        this.eventSource.onopen = () => {
          this.options.onOpen?.();
          this.reconnectDelay = this.options.reconnectDelay || 1000;
        };

        this.eventSource.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.eventSource.onerror = () => {
          this.handleError(new Error('SSE connection error'));

          if (this.options.reconnect && !this.closed) {
            this.scheduleReconnect();
          }
        };

        const knownEvents = ['task.update', 'message', 'error'];
        for (const eventType of knownEvents) {
          this.eventSource.addEventListener(eventType, (event) => {
            this.handleMessage(event as MessageEvent);
          });
        }
      }
    } catch (error) {
      this.handleError(error as Error);
      if (this.options.reconnect && !this.closed) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.eventSource?.close();
    this.eventSource = null;

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  private handleSSEMessage(message: SSEMessage): void {
    this.messageQueue.push(message);
    this.notifyHandlers(message);
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = this.parseMessage(event);

      // Handle event ID if needed in the future
      // Currently not tracking lastEventId

      // Handle retry directive
      if (message.event === 'retry' && typeof message.data === 'number') {
        this.reconnectDelay = message.data;
        return;
      }

      this.messageQueue.push(message);
      this.notifyHandlers(message);
    } catch (error) {
      this.handleError(new Error(`Failed to parse SSE message: ${error}`));
    }
  }

  private parseMessage(event: MessageEvent): SSEMessage {
    const eventType = event.type || 'message';
    let data: unknown;

    try {
      // Parse the raw SSE format
      const rawData = event.data;

      if (typeof rawData === 'string') {
        // Handle SSE format with event type and data
        const lines = rawData.split('\n');
        let eventName = eventType;
        let dataLines: string[] = [];
        let id: string | undefined;

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim());
          } else if (line.startsWith('id:')) {
            id = line.slice(3).trim();
          } else if (line.startsWith('retry:')) {
            // Return special retry message
            return {
              event: 'retry',
              data: parseInt(line.slice(6).trim(), 10),
            };
          }
          // Ignore comment lines starting with ':'
        }

        // Join multiline data
        const dataString = dataLines.join('');

        // Try to parse as JSON, fallback to string
        try {
          data = JSON.parse(dataString);
        } catch {
          data = dataString;
        }

        return { event: eventName, data, ...(id && { id }) };
      } else {
        // Already parsed data
        data = rawData;
      }
    } catch {
      // Fallback to raw data
      data = event.data;
    }

    return { event: eventType, data };
  }

  private handleError(error: Error): void {
    for (const handler of this.errorHandlers) {
      handler(error);
    }
  }

  private notifyHandlers(message: SSEMessage): void {
    for (const handler of this.messageHandlers) {
      handler(message);
    }
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  close(): void {
    this.closed = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.reader) {
      this.reader.cancel();
      this.reader = null;
    }

    this.options.onClose?.();
  }

  // Async iterator interface
  async *[Symbol.asyncIterator](): AsyncIterator<SSEMessage> {
    let currentIndex = 0;

    while (!this.closed) {
      // Yield any messages in the queue
      while (currentIndex < this.messageQueue.length) {
        const message = this.messageQueue[currentIndex++];
        if (message) {
          yield message;
        }
      }

      // Wait for new messages
      await new Promise<void>((resolve) => {
        const checkForMessages = () => {
          if (currentIndex < this.messageQueue.length || this.closed) {
            resolve();
          } else {
            setTimeout(checkForMessages, 10);
          }
        };
        checkForMessages();
      });
    }
  }
}
