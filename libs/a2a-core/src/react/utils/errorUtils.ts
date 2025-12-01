import { JsonRpcErrorResponse, extractErrorDetails } from '../../types/errors';

/**
 * Extract error information from various error types and format it for display
 */
export function formatErrorMessage(error: unknown): {
  message: string;
  code?: number | string;
  details?: any;
} {
  // Handle JsonRpcErrorResponse
  if (error instanceof JsonRpcErrorResponse) {
    const errorData = error.data as any;

    // If error.data has a nested message and code (like in content_filter errors), use those
    if (errorData && typeof errorData === 'object' && errorData.message) {
      return {
        message: errorData.message,
        code: errorData.code || error.code,
        details: error.data,
      };
    }

    // Otherwise use the main error message
    return {
      message: error.message.replace(/^JSON-RPC Error \(-?\d+\):\s*/, ''), // Remove "JSON-RPC Error (code): " prefix
      code: error.code,
      details: error.data,
    };
  }

  // Handle generic errors using extractErrorDetails
  const details = extractErrorDetails(error);

  return {
    message: details.message || 'Failed to send message',
    code: details.code,
    details: details.details,
  };
}

/**
 * Get a user-friendly error message for display
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  // If error is already our formatted error object, use it directly
  let formatted: { message: string; code?: number | string; details?: any };
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  ) {
    formatted = error as { message: string; code?: number | string; details?: any };
  } else {
    formatted = formatErrorMessage(error);
  }

  // Check if this is an HTTP error message and extract status code
  const httpErrorMatch = formatted.message.match(/HTTP error! status: (\d+)/);
  if (httpErrorMatch) {
    const statusCode = parseInt(httpErrorMatch[1], 10);
    switch (statusCode) {
      case 400:
        return 'Invalid request. Please check your message and try again.';
      case 401:
        return 'Authentication required. Please sign in again.';
      case 403:
        return 'Access denied. You may not have permission to perform this action.';
      case 404:
        return 'Service not found. Please check your connection.';
      case 408:
        return 'Request timeout. Please try again.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again in a moment.';
      case 502:
        return 'Service unavailable. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      case 504:
        return 'Gateway timeout. Please try again.';
      default:
        return `Service error (${statusCode}). Please try again.`;
    }
  }

  // Check for timeout errors
  if (formatted.message.toLowerCase().includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  // For specific error codes, provide more helpful messages
  if (typeof formatted.code === 'string') {
    switch (formatted.code) {
      case 'AgentLoopChatCompletionFailed':
        return 'Unable to complete the request. Please try again with different content.';
      default:
        // For other string error codes, return the message as-is
        return formatted.message;
    }
  }

  // For JSON-RPC error codes
  if (typeof formatted.code === 'number') {
    switch (formatted.code) {
      case -32700:
        return 'Invalid message format. Please try again.';
      case -32600:
        return 'Invalid request. Please try again.';
      case -32601:
        return 'Method not supported by the agent.';
      case -32602:
        return 'Invalid parameters. Please check your input.';
      case -32603:
        // For internal errors, check if it's a content filter error
        if (
          formatted.message.toLowerCase().includes('content_filter') ||
          formatted.message.toLowerCase().includes('content management')
        ) {
          return 'Your message was filtered by content policy. Please modify and try again.';
        }
        return formatted.message || 'The agent encountered an error. Please try again.';
      default:
        return formatted.message || 'Failed to send message. Please try again.';
    }
  }

  return formatted.message;
}
