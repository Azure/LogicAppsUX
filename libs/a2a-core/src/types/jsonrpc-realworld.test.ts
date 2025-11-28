import { describe, it, expect } from 'vitest';
import {
  JsonRpcErrorSchema,
  isJsonRpcError,
  isJsonRpcResult,
  createJsonRpcResultSchema,
} from './schemas';
import { JsonRpcErrorResponse } from './errors';
import { z } from 'zod';

describe('JSON-RPC Real-World Examples', () => {
  describe('Production JsonRpcResult - Status Update', () => {
    it('should handle status-update result with taskId and contextId', () => {
      const realWorldResult = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          taskId: '08584398997403011416617093712_08584398997401729245939347293CU00',
          contextId: '08584398997401729245939347293CU00',
          status: {
            state: 'submitted',
            timestamp: '10/29/2025 3:05:45 AM',
          },
          kind: 'status-update',
          final: false,
        },
      };

      // Verify it's recognized as a JSON-RPC result
      expect(isJsonRpcResult(realWorldResult)).toBe(true);
      expect(isJsonRpcError(realWorldResult)).toBe(false);

      // Verify schema validation
      const StatusUpdateSchema = z.object({
        taskId: z.string(),
        contextId: z.string(),
        status: z.object({
          state: z.string(),
          timestamp: z.string(),
        }),
        kind: z.string(),
        final: z.boolean(),
      });

      const ResultSchema = createJsonRpcResultSchema(StatusUpdateSchema);
      const parseResult = ResultSchema.safeParse(realWorldResult);

      expect(parseResult.success).toBe(true);
      if (parseResult.success) {
        expect(parseResult.data.result.taskId).toBe(
          '08584398997403011416617093712_08584398997401729245939347293CU00'
        );
        expect(parseResult.data.result.kind).toBe('status-update');
        expect(parseResult.data.result.status.state).toBe('submitted');
      }
    });

    it('should extract result from status-update response', () => {
      const realWorldResult = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          taskId: '08584398997403011416617093712_08584398997401729245939347293CU00',
          contextId: '08584398997401729245939347293CU00',
          status: {
            state: 'submitted',
            timestamp: '10/29/2025 3:05:45 AM',
          },
          kind: 'status-update',
          final: false,
        },
      };

      // When HTTP client processes this, it should extract just the result
      expect(isJsonRpcResult(realWorldResult)).toBe(true);

      // The result should be extractable
      const extractedResult = (realWorldResult as any).result;
      expect(extractedResult.taskId).toBe(
        '08584398997403011416617093712_08584398997401729245939347293CU00'
      );
      expect(extractedResult.kind).toBe('status-update');
    });
  });

  describe('Production JsonRpcError - Content Filter', () => {
    it('should handle error with structured data containing code and message', () => {
      const realWorldError = {
        jsonrpc: '2.0',
        id: null,
        error: {
          data: {
            code: 'AgentLoopChatCompletionFailed',
            message:
              "HTTP 400 (: content_filter)\r\nParameter: prompt\r\n\r\nThe response was filtered due to the prompt triggering Azure OpenAI's content management policy. Please modify your prompt and retry. To learn more about our content filtering policies please read our documentation: https://go.microsoft.com/fwlink/?linkid=2198766",
          },
          code: -32603,
          message:
            "HTTP 400 (: content_filter)\r\nParameter: prompt\r\n\r\nThe response was filtered due to the prompt triggering Azure OpenAI's content management policy. Please modify your prompt and retry. To learn more about our content filtering policies please read our documentation: https://go.microsoft.com/fwlink/?linkid=2198766 This chat session is closed, please open a new chat session.",
        },
      };

      // Verify it's recognized as a JSON-RPC error
      expect(isJsonRpcError(realWorldError)).toBe(true);
      expect(isJsonRpcResult(realWorldError)).toBe(false);

      // Verify schema validation
      const parseResult = JsonRpcErrorSchema.safeParse(realWorldError);
      expect(parseResult.success).toBe(true);

      if (parseResult.success) {
        expect(parseResult.data.error.code).toBe(-32603);
        expect(parseResult.data.error.message).toContain('content_filter');
        expect(parseResult.data.error.data).toEqual({
          code: 'AgentLoopChatCompletionFailed',
          message: expect.stringContaining('content_filter'),
        });
      }
    });

    it('should create JsonRpcErrorResponse from content filter error', () => {
      const realWorldError = {
        jsonrpc: '2.0' as const,
        id: null,
        error: {
          data: {
            code: 'AgentLoopChatCompletionFailed',
            message:
              "HTTP 400 (: content_filter)\r\nParameter: prompt\r\n\r\nThe response was filtered due to the prompt triggering Azure OpenAI's content management policy. Please modify your prompt and retry. To learn more about our content filtering policies please read our documentation: https://go.microsoft.com/fwlink/?linkid=2198766",
          },
          code: -32603,
          message:
            "HTTP 400 (: content_filter)\r\nParameter: prompt\r\n\r\nThe response was filtered due to the prompt triggering Azure OpenAI's content management policy. Please modify your prompt and retry. To learn more about our content filtering policies please read our documentation: https://go.microsoft.com/fwlink/?linkid=2198766 This chat session is closed, please open a new chat session.",
        },
      };

      const error = new JsonRpcErrorResponse(realWorldError);

      expect(error.name).toBe('JsonRpcErrorResponse');
      expect(error.code).toBe(-32603);
      expect(error.message).toContain('content_filter');
      expect(error.id).toBe(null);

      // Verify structured data is preserved
      expect(error.data).toEqual({
        code: 'AgentLoopChatCompletionFailed',
        message: expect.stringContaining('content_filter'),
      });

      // Verify we can access nested error details
      const errorData = error.data as any;
      expect(errorData.code).toBe('AgentLoopChatCompletionFailed');
      expect(errorData.message).toContain('Azure OpenAI');
    });

    it('should preserve all error information when converting back to JSON-RPC', () => {
      const realWorldError = {
        jsonrpc: '2.0' as const,
        id: null,
        error: {
          data: {
            code: 'AgentLoopChatCompletionFailed',
            message:
              "HTTP 400 (: content_filter)\r\nParameter: prompt\r\n\r\nThe response was filtered due to the prompt triggering Azure OpenAI's content management policy. Please modify your prompt and retry. To learn more about our content filtering policies please read our documentation: https://go.microsoft.com/fwlink/?linkid=2198766",
          },
          code: -32603,
          message:
            "HTTP 400 (: content_filter)\r\nParameter: prompt\r\n\r\nThe response was filtered due to the prompt triggering Azure OpenAI's content management policy. Please modify your prompt and retry. To learn more about our content filtering policies please read our documentation: https://go.microsoft.com/fwlink/?linkid=2198766 This chat session is closed, please open a new chat session.",
        },
      };

      const error = new JsonRpcErrorResponse(realWorldError);
      const converted = error.toJsonRpcError();

      expect(converted.jsonrpc).toBe('2.0');
      expect(converted.id).toBe(null);
      expect(converted.error.code).toBe(-32603);
      expect(converted.error.message).toContain('content_filter');
      expect(converted.error.data).toEqual({
        code: 'AgentLoopChatCompletionFailed',
        message: expect.stringContaining('content_filter'),
      });
    });

    it('should identify as Internal Error (-32603)', () => {
      const realWorldError = {
        jsonrpc: '2.0' as const,
        id: null,
        error: {
          data: {
            code: 'AgentLoopChatCompletionFailed',
            message: 'HTTP 400 (: content_filter)',
          },
          code: -32603,
          message: 'HTTP 400 (: content_filter) This chat session is closed',
        },
      };

      const error = new JsonRpcErrorResponse(realWorldError);

      expect(error.isErrorCode(-32603)).toBe(true);
      expect(error.isStandardError()).toBe(true);
    });
  });

  describe('HTTP Client Integration with Real-World Examples', () => {
    it('should simulate how HTTP client would handle status-update result', () => {
      const response = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          taskId: '08584398997403011416617093712_08584398997401729245939347293CU00',
          contextId: '08584398997401729245939347293CU00',
          status: {
            state: 'submitted',
            timestamp: '10/29/2025 3:05:45 AM',
          },
          kind: 'status-update',
          final: false,
        },
      };

      // HTTP client would check if it's JSON-RPC
      expect(isJsonRpcResult(response)).toBe(true);

      // HTTP client would extract the result
      const extracted = response.result;

      expect(extracted.taskId).toBe(
        '08584398997403011416617093712_08584398997401729245939347293CU00'
      );
      expect(extracted.kind).toBe('status-update');
      expect(extracted.final).toBe(false);
    });

    it('should simulate how HTTP client would handle content filter error', () => {
      const response = {
        jsonrpc: '2.0',
        id: null,
        error: {
          data: {
            code: 'AgentLoopChatCompletionFailed',
            message: 'HTTP 400 (: content_filter)',
          },
          code: -32603,
          message: 'HTTP 400 (: content_filter) This chat session is closed',
        },
      };

      // HTTP client would check if it's JSON-RPC error
      expect(isJsonRpcError(response)).toBe(true);

      // HTTP client would throw JsonRpcErrorResponse
      expect(() => {
        if (isJsonRpcError(response)) {
          throw new JsonRpcErrorResponse(response);
        }
      }).toThrow(JsonRpcErrorResponse);

      // Verify the error can be caught and inspected
      try {
        if (isJsonRpcError(response)) {
          throw new JsonRpcErrorResponse(response);
        }
      } catch (error) {
        expect(error).toBeInstanceOf(JsonRpcErrorResponse);
        const jsonRpcError = error as JsonRpcErrorResponse;

        expect(jsonRpcError.code).toBe(-32603);
        expect(jsonRpcError.message).toContain('content_filter');

        // Access nested error data
        const errorData = jsonRpcError.data as any;
        expect(errorData.code).toBe('AgentLoopChatCompletionFailed');
      }
    });
  });

  describe('Edge Cases from Real-World Usage', () => {
    it('should handle error with null id', () => {
      const errorWithNullId = {
        jsonrpc: '2.0',
        id: null,
        error: {
          data: { code: 'SomeError', message: 'Error details' },
          code: -32603,
          message: 'Internal error',
        },
      };

      expect(isJsonRpcError(errorWithNullId)).toBe(true);

      const error = new JsonRpcErrorResponse(errorWithNullId as any);
      expect(error.id).toBe(null);
    });

    it('should handle result with numeric id', () => {
      const resultWithNumericId = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          taskId: 'test-task',
          kind: 'status-update',
        },
      };

      expect(isJsonRpcResult(resultWithNumericId)).toBe(true);
    });

    it('should handle complex nested data structures', () => {
      const complexError = {
        jsonrpc: '2.0' as const,
        id: null,
        error: {
          data: {
            code: 'ComplexError',
            message: 'Error message',
            details: {
              nested: {
                deeply: {
                  value: 123,
                },
              },
              array: [1, 2, 3],
            },
          },
          code: -32603,
          message: 'Complex error occurred',
        },
      };

      const error = new JsonRpcErrorResponse(complexError);

      expect(error.data).toBeDefined();
      const data = error.data as any;
      expect(data.code).toBe('ComplexError');
      expect(data.details.nested.deeply.value).toBe(123);
      expect(data.details.array).toEqual([1, 2, 3]);
    });
  });
});
