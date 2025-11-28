import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpClient } from './http-client';
import { JsonRpcErrorResponse, JsonRpcErrorCode } from '../types/errors';

// Mock fetch globally
global.fetch = vi.fn();

describe('HttpClient - JSON-RPC Error Handling', () => {
  let client: HttpClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new HttpClient('https://api.test.com');
  });

  describe('JSON-RPC Error Response Handling', () => {
    it('should throw JsonRpcErrorResponse for JSON-RPC error', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid Request',
          },
          id: 1,
        }),
      } as Response);

      await expect(client.request('/test', { method: 'POST' })).rejects.toThrow(
        JsonRpcErrorResponse
      );
    });

    it('should preserve error code in JsonRpcErrorResponse', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          error: {
            code: JsonRpcErrorCode.MethodNotFound,
            message: 'Method not found',
          },
          id: 1,
        }),
      } as Response);

      try {
        await client.request('/test', { method: 'POST' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(JsonRpcErrorResponse);
        const jsonRpcError = error as JsonRpcErrorResponse;
        expect(jsonRpcError.code).toBe(JsonRpcErrorCode.MethodNotFound);
        expect(jsonRpcError.message).toContain('Method not found');
      }
    });

    it('should preserve error data in JsonRpcErrorResponse', async () => {
      const mockFetch = vi.mocked(fetch);
      const errorData = {
        field: 'username',
        reason: 'required',
        additionalInfo: { minLength: 3 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          error: {
            code: -32602,
            message: 'Invalid params',
            data: errorData,
          },
          id: 1,
        }),
      } as Response);

      try {
        await client.request('/test', { method: 'POST' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(JsonRpcErrorResponse);
        const jsonRpcError = error as JsonRpcErrorResponse;
        expect(jsonRpcError.data).toEqual(errorData);
      }
    });

    it('should preserve request id in JsonRpcErrorResponse', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid Request',
          },
          id: 'request-123',
        }),
      } as Response);

      try {
        await client.request('/test', { method: 'POST' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(JsonRpcErrorResponse);
        const jsonRpcError = error as JsonRpcErrorResponse;
        expect(jsonRpcError.id).toBe('request-123');
      }
    });

    it('should handle JSON-RPC error with null id', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          error: {
            code: -32700,
            message: 'Parse error',
          },
          id: null,
        }),
      } as Response);

      try {
        await client.request('/test', { method: 'POST' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(JsonRpcErrorResponse);
        const jsonRpcError = error as JsonRpcErrorResponse;
        expect(jsonRpcError.id).toBe(null);
      }
    });
  });

  describe('JSON-RPC Success Response Handling', () => {
    it('should extract result from JSON-RPC success response', async () => {
      const expectedResult = {
        id: 'task-123',
        state: 'completed',
        data: { foo: 'bar' },
      };

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          result: expectedResult,
          id: 1,
        }),
      } as Response);

      const result = await client.request('/test', { method: 'POST' });

      expect(result).toEqual(expectedResult);
    });

    it('should handle JSON-RPC result with complex nested data', async () => {
      const expectedResult = {
        tasks: [
          { id: '1', status: 'completed' },
          { id: '2', status: 'pending' },
        ],
        metadata: {
          total: 2,
          page: 1,
        },
      };

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          result: expectedResult,
          id: 1,
        }),
      } as Response);

      const result = await client.request('/test', { method: 'POST' });

      expect(result).toEqual(expectedResult);
    });

    it('should handle JSON-RPC result with null value', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          result: null,
          id: 1,
        }),
      } as Response);

      const result = await client.request('/test', { method: 'POST' });

      expect(result).toBeNull();
    });

    it('should handle JSON-RPC result with array', async () => {
      const expectedResult = ['item1', 'item2', 'item3'];

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          result: expectedResult,
          id: 1,
        }),
      } as Response);

      const result = await client.request('/test', { method: 'POST' });

      expect(result).toEqual(expectedResult);
    });
  });

  describe('Non-JSON-RPC Response Handling', () => {
    it('should pass through non-JSON-RPC responses', async () => {
      const expectedResponse = {
        success: true,
        data: { foo: 'bar' },
      };

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => expectedResponse,
      } as Response);

      const result = await client.request('/test', { method: 'GET' });

      expect(result).toEqual(expectedResponse);
    });

    it('should not throw for responses without jsonrpc field', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: 'Some error',
          message: 'This is not a JSON-RPC error',
        }),
      } as Response);

      const result = await client.request('/test', { method: 'GET' });

      expect(result).toEqual({
        error: 'Some error',
        message: 'This is not a JSON-RPC error',
      });
    });
  });

  describe('POST method with JSON-RPC', () => {
    it('should handle JSON-RPC error in POST request', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid Request',
          },
          id: 1,
        }),
      } as Response);

      await expect(
        client.post('/', {
          jsonrpc: '2.0',
          method: 'message/send',
          params: {},
          id: 1,
        })
      ).rejects.toThrow(JsonRpcErrorResponse);
    });

    it('should extract result in POST request', async () => {
      const expectedTask = {
        id: 'task-456',
        state: 'running',
      };

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          result: expectedTask,
          id: 1,
        }),
      } as Response);

      const result = await client.post('/', {
        jsonrpc: '2.0',
        method: 'message/send',
        params: {},
        id: 1,
      });

      expect(result).toEqual(expectedTask);
    });
  });

  describe('Standard JSON-RPC Error Codes', () => {
    it('should handle Parse Error (-32700)', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          error: {
            code: JsonRpcErrorCode.ParseError,
            message: 'Parse error',
          },
          id: null,
        }),
      } as Response);

      try {
        await client.request('/test', { method: 'POST' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        const jsonRpcError = error as JsonRpcErrorResponse;
        expect(jsonRpcError.isErrorCode(JsonRpcErrorCode.ParseError)).toBe(true);
        expect(jsonRpcError.isStandardError()).toBe(true);
      }
    });

    it('should handle Invalid Request (-32600)', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          error: {
            code: JsonRpcErrorCode.InvalidRequest,
            message: 'Invalid Request',
          },
          id: 1,
        }),
      } as Response);

      try {
        await client.request('/test', { method: 'POST' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        const jsonRpcError = error as JsonRpcErrorResponse;
        expect(jsonRpcError.isErrorCode(JsonRpcErrorCode.InvalidRequest)).toBe(true);
      }
    });

    it('should handle Method Not Found (-32601)', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          error: {
            code: JsonRpcErrorCode.MethodNotFound,
            message: 'Method not found',
          },
          id: 1,
        }),
      } as Response);

      try {
        await client.request('/test', { method: 'POST' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        const jsonRpcError = error as JsonRpcErrorResponse;
        expect(jsonRpcError.isErrorCode(JsonRpcErrorCode.MethodNotFound)).toBe(true);
      }
    });

    it('should handle Invalid Params (-32602)', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          error: {
            code: JsonRpcErrorCode.InvalidParams,
            message: 'Invalid params',
          },
          id: 1,
        }),
      } as Response);

      try {
        await client.request('/test', { method: 'POST' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        const jsonRpcError = error as JsonRpcErrorResponse;
        expect(jsonRpcError.isErrorCode(JsonRpcErrorCode.InvalidParams)).toBe(true);
      }
    });

    it('should handle Internal Error (-32603)', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          error: {
            code: JsonRpcErrorCode.InternalError,
            message: 'Internal error',
          },
          id: 1,
        }),
      } as Response);

      try {
        await client.request('/test', { method: 'POST' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        const jsonRpcError = error as JsonRpcErrorResponse;
        expect(jsonRpcError.isErrorCode(JsonRpcErrorCode.InternalError)).toBe(true);
      }
    });

    it('should identify custom error codes as non-standard', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          error: {
            code: 1000,
            message: 'Custom application error',
          },
          id: 1,
        }),
      } as Response);

      try {
        await client.request('/test', { method: 'POST' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        const jsonRpcError = error as JsonRpcErrorResponse;
        expect(jsonRpcError.code).toBe(1000);
        expect(jsonRpcError.isStandardError()).toBe(false);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle JSON-RPC response with empty error message', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: '',
          },
          id: 1,
        }),
      } as Response);

      try {
        await client.request('/test', { method: 'POST' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(JsonRpcErrorResponse);
      }
    });

    it('should handle JSON-RPC response with numeric id', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          result: { data: 'test' },
          id: 12345,
        }),
      } as Response);

      const result = await client.request('/test', { method: 'POST' });

      expect(result).toEqual({ data: 'test' });
    });

    it('should handle JSON-RPC response with string id', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          result: { data: 'test' },
          id: 'string-id-abc',
        }),
      } as Response);

      const result = await client.request('/test', { method: 'POST' });

      expect(result).toEqual({ data: 'test' });
    });
  });
});
