import { describe, it, expect } from 'vitest';
import { formatErrorMessage, getUserFriendlyErrorMessage } from './errorUtils';
import { JsonRpcErrorResponse } from '../../types/errors';

describe('errorUtils', () => {
  describe('formatErrorMessage', () => {
    it('should format JsonRpcErrorResponse with simple structure', () => {
      const error = new JsonRpcErrorResponse({
        jsonrpc: '2.0',
        error: {
          code: -32602,
          message: 'Invalid params',
        },
        id: 1,
      });

      const result = formatErrorMessage(error);

      expect(result).toEqual({
        message: 'Invalid params',
        code: -32602,
        details: undefined,
      });
    });

    it('should format JsonRpcErrorResponse with nested error data', () => {
      const error = new JsonRpcErrorResponse({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'HTTP 400 (: content_filter)',
          data: {
            code: 'AgentLoopChatCompletionFailed',
            message:
              "The response was filtered due to the prompt triggering Azure OpenAI's content management policy.",
          },
        },
        id: null,
      });

      const result = formatErrorMessage(error);

      expect(result.message).toBe(
        "The response was filtered due to the prompt triggering Azure OpenAI's content management policy."
      );
      expect(result.code).toBe('AgentLoopChatCompletionFailed');
      expect(result.details).toBeDefined();
    });

    it('should format generic Error', () => {
      const error = new Error('Something went wrong');

      const result = formatErrorMessage(error);

      expect(result.message).toBe('Something went wrong');
      expect(result.code).toBeUndefined();
    });

    it('should format string error', () => {
      const result = formatErrorMessage('String error message');

      expect(result.message).toBe('String error message');
    });

    it('should format unknown error', () => {
      const result = formatErrorMessage({ foo: 'bar' });

      // Unknown objects are converted to string, which results in "[object Object]"
      // The formatErrorMessage function returns the fallback message when the extracted message is empty
      expect(result.message).toBe('[object Object]');
    });
  });

  describe('getUserFriendlyErrorMessage', () => {
    it('should return user-friendly message for invalid params error', () => {
      const error = {
        message: 'Invalid parameters provided',
        code: -32602,
      };

      const result = getUserFriendlyErrorMessage(error);

      expect(result).toBe('Invalid parameters. Please check your input.');
    });

    it('should return user-friendly message for content filter error', () => {
      const error = {
        message:
          "HTTP 400 (: content_filter) - The response was filtered due to the prompt triggering Azure OpenAI's content management policy.",
        code: -32603,
      };

      const result = getUserFriendlyErrorMessage(error);

      expect(result).toBe(
        'Your message was filtered by content policy. Please modify and try again.'
      );
    });

    it('should return user-friendly message for AgentLoopChatCompletionFailed', () => {
      const error = {
        message: 'Agent loop chat completion failed',
        code: 'AgentLoopChatCompletionFailed',
      };

      const result = getUserFriendlyErrorMessage(error);

      expect(result).toBe(
        'Unable to complete the request. Please try again with different content.'
      );
    });

    it('should return message as-is for internal errors without content_filter', () => {
      const error = {
        message: 'Database connection failed',
        code: -32603,
      };

      const result = getUserFriendlyErrorMessage(error);

      expect(result).toBe('Database connection failed');
    });

    it('should handle JsonRpcErrorResponse directly', () => {
      const error = new JsonRpcErrorResponse({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
        id: 1,
      });

      const result = getUserFriendlyErrorMessage(error);

      expect(result).toBe('Invalid request. Please try again.');
    });

    it('should handle parse error', () => {
      const error = {
        message: 'Parse error',
        code: -32700,
      };

      const result = getUserFriendlyErrorMessage(error);

      expect(result).toBe('Invalid message format. Please try again.');
    });

    it('should handle method not found error', () => {
      const error = {
        message: 'Method not found',
        code: -32601,
      };

      const result = getUserFriendlyErrorMessage(error);

      expect(result).toBe('Method not supported by the agent.');
    });

    it('should handle unknown error codes gracefully', () => {
      const error = {
        message: 'Unknown error occurred',
        code: 9999,
      };

      const result = getUserFriendlyErrorMessage(error);

      expect(result).toBe('Unknown error occurred');
    });

    it('should handle errors without code', () => {
      const error = {
        message: 'Generic error message',
      };

      const result = getUserFriendlyErrorMessage(error);

      expect(result).toBe('Generic error message');
    });

    it('should handle content_filter with case insensitivity', () => {
      const error = {
        message: 'Error: CONTENT_FILTER triggered',
        code: -32603,
      };

      const result = getUserFriendlyErrorMessage(error);

      expect(result).toBe(
        'Your message was filtered by content policy. Please modify and try again.'
      );
    });
  });
});
