import type { JsonRpcError, JsonRpcErrorObject } from './schemas';

/**
 * Base error class for all A2A-related errors
 */
export class A2AError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'A2AError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when a JSON-RPC error response is received from the A2A API
 */
export class JsonRpcErrorResponse extends A2AError {
  public readonly code: number;
  public readonly data?: unknown;
  public readonly id: string | number | null;

  constructor(jsonRpcError: JsonRpcError) {
    const message = `JSON-RPC Error (${jsonRpcError.error.code}): ${jsonRpcError.error.message}`;
    super(message);
    this.name = 'JsonRpcErrorResponse';
    this.code = jsonRpcError.error.code;
    this.data = jsonRpcError.error.data;
    this.id = jsonRpcError.id;
  }

  /**
   * Get the full JSON-RPC error object
   */
  toJsonRpcError(): JsonRpcError {
    return {
      jsonrpc: '2.0',
      error: {
        code: this.code,
        message: this.message.replace(`JSON-RPC Error (${this.code}): `, ''),
        data: this.data,
      },
      id: this.id,
    };
  }

  /**
   * Check if this is a specific JSON-RPC error code
   */
  isErrorCode(code: number): boolean {
    return this.code === code;
  }

  /**
   * Check if this is a standard JSON-RPC error
   */
  isStandardError(): boolean {
    return this.code >= -32768 && this.code <= -32000;
  }
}

/**
 * Standard JSON-RPC 2.0 error codes
 */
export enum JsonRpcErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
}

/**
 * Error thrown when network communication fails
 */
export class NetworkError extends A2AError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    cause?: unknown
  ) {
    super(message, cause);
    this.name = 'NetworkError';
  }
}

/**
 * Error thrown when response validation fails
 */
export class ValidationError extends A2AError {
  constructor(
    message: string,
    public readonly validationErrors?: unknown,
    cause?: unknown
  ) {
    super(message, cause);
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when authentication fails or is required
 */
export class AuthenticationError extends A2AError {
  constructor(
    message: string,
    public readonly authUrl?: string,
    cause?: unknown
  ) {
    super(message, cause);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when a streaming connection fails
 */
export class StreamingError extends A2AError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'StreamingError';
  }
}

/**
 * Error thrown when a task operation fails
 */
export class TaskError extends A2AError {
  constructor(
    message: string,
    public readonly taskId?: string,
    public readonly errorCode?: string,
    cause?: unknown
  ) {
    super(message, cause);
    this.name = 'TaskError';
  }
}

/**
 * Helper function to create a JsonRpcErrorResponse from a JSON-RPC error object
 */
export function createJsonRpcError(
  errorObj: JsonRpcErrorObject,
  id: string | number | null = null
): JsonRpcErrorResponse {
  return new JsonRpcErrorResponse({
    jsonrpc: '2.0',
    error: errorObj,
    id,
  });
}

/**
 * Helper function to determine if an error is a JSON-RPC error
 */
export function isJsonRpcErrorResponse(error: unknown): error is JsonRpcErrorResponse {
  return error instanceof JsonRpcErrorResponse;
}

/**
 * Helper function to extract error details from various error types
 */
export function extractErrorDetails(error: unknown): {
  message: string;
  code?: number | string;
  details?: unknown;
} {
  if (isJsonRpcErrorResponse(error)) {
    return {
      message: error.message,
      code: error.code,
      details: error.data,
    };
  }

  if (error instanceof A2AError) {
    return {
      message: error.message,
      details: error.cause,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  return {
    message: String(error),
  };
}
