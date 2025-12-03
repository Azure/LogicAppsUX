import { describe, it, expect } from 'vitest';
import {
  JsonRpcErrorSchema,
  JsonRpcErrorObjectSchema,
  createJsonRpcResultSchema,
  createJsonRpcResponseSchema,
  isJsonRpcError,
  isJsonRpcResult,
} from './schemas';
import {
  JsonRpcErrorResponse,
  JsonRpcErrorCode,
  A2AError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  StreamingError,
  TaskError,
  createJsonRpcError,
  isJsonRpcErrorResponse,
  extractErrorDetails,
} from './errors';
import { z } from 'zod';

describe('JSON-RPC Schema Validation', () => {
  describe('JsonRpcErrorObjectSchema', () => {
    it('should validate valid error object', () => {
      const validError = {
        code: -32600,
        message: 'Invalid Request',
      };

      const result = JsonRpcErrorObjectSchema.safeParse(validError);
      expect(result.success).toBe(true);
    });

    it('should validate error object with data', () => {
      const validError = {
        code: -32602,
        message: 'Invalid params',
        data: { field: 'username', reason: 'required' },
      };

      const result = JsonRpcErrorObjectSchema.safeParse(validError);
      expect(result.success).toBe(true);
    });

    it('should reject error object with missing code', () => {
      const invalidError = {
        message: 'Invalid Request',
      };

      const result = JsonRpcErrorObjectSchema.safeParse(invalidError);
      expect(result.success).toBe(false);
    });

    it('should reject error object with wrong code type', () => {
      const invalidError = {
        code: 'not-a-number',
        message: 'Invalid Request',
      };

      const result = JsonRpcErrorObjectSchema.safeParse(invalidError);
      expect(result.success).toBe(false);
    });
  });

  describe('JsonRpcErrorSchema', () => {
    it('should validate valid JSON-RPC error response', () => {
      const validError = {
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
        id: 1,
      };

      const result = JsonRpcErrorSchema.safeParse(validError);
      expect(result.success).toBe(true);
    });

    it('should validate error with null id', () => {
      const validError = {
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error',
        },
        id: null,
      };

      const result = JsonRpcErrorSchema.safeParse(validError);
      expect(result.success).toBe(true);
    });

    it('should reject error with wrong jsonrpc version', () => {
      const invalidError = {
        jsonrpc: '1.0',
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
        id: 1,
      };

      const result = JsonRpcErrorSchema.safeParse(invalidError);
      expect(result.success).toBe(false);
    });
  });

  describe('createJsonRpcResultSchema', () => {
    it('should validate valid JSON-RPC result response', () => {
      const TaskSchema = z.object({
        id: z.string(),
        state: z.string(),
      });

      const ResultSchema = createJsonRpcResultSchema(TaskSchema);

      const validResult = {
        jsonrpc: '2.0',
        result: {
          id: 'task-123',
          state: 'completed',
        },
        id: 1,
      };

      const parseResult = ResultSchema.safeParse(validResult);
      expect(parseResult.success).toBe(true);
    });

    it('should reject result with wrong structure', () => {
      const TaskSchema = z.object({
        id: z.string(),
        state: z.string(),
      });

      const ResultSchema = createJsonRpcResultSchema(TaskSchema);

      const invalidResult = {
        jsonrpc: '2.0',
        result: {
          id: 123, // Should be string
          state: 'completed',
        },
        id: 1,
      };

      const parseResult = ResultSchema.safeParse(invalidResult);
      expect(parseResult.success).toBe(false);
    });
  });

  describe('createJsonRpcResponseSchema', () => {
    it('should validate both success and error responses', () => {
      const TaskSchema = z.object({
        id: z.string(),
        state: z.string(),
      });

      const ResponseSchema = createJsonRpcResponseSchema(TaskSchema);

      const successResponse = {
        jsonrpc: '2.0',
        result: {
          id: 'task-123',
          state: 'completed',
        },
        id: 1,
      };

      const errorResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
        id: 1,
      };

      expect(ResponseSchema.safeParse(successResponse).success).toBe(true);
      expect(ResponseSchema.safeParse(errorResponse).success).toBe(true);
    });
  });

  describe('isJsonRpcError', () => {
    it('should return true for valid JSON-RPC error', () => {
      const error = {
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
        id: 1,
      };

      expect(isJsonRpcError(error)).toBe(true);
    });

    it('should return false for JSON-RPC result', () => {
      const result = {
        jsonrpc: '2.0',
        result: { data: 'test' },
        id: 1,
      };

      expect(isJsonRpcError(result)).toBe(false);
    });

    it('should return false for invalid structure', () => {
      const invalid = {
        error: 'Something went wrong',
      };

      expect(isJsonRpcError(invalid)).toBe(false);
    });
  });

  describe('isJsonRpcResult', () => {
    it('should return true for valid JSON-RPC result', () => {
      const result = {
        jsonrpc: '2.0',
        result: { data: 'test' },
        id: 1,
      };

      expect(isJsonRpcResult(result)).toBe(true);
    });

    it('should return false for JSON-RPC error', () => {
      const error = {
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
        id: 1,
      };

      expect(isJsonRpcResult(error)).toBe(false);
    });

    it('should return false for invalid structure', () => {
      const invalid = {
        data: 'test',
      };

      expect(isJsonRpcResult(invalid)).toBe(false);
    });
  });
});

describe('JsonRpcErrorResponse Class', () => {
  it('should create error from JSON-RPC error object', () => {
    const jsonRpcError = {
      jsonrpc: '2.0' as const,
      error: {
        code: -32600,
        message: 'Invalid Request',
      },
      id: 1,
    };

    const error = new JsonRpcErrorResponse(jsonRpcError);

    expect(error.name).toBe('JsonRpcErrorResponse');
    expect(error.code).toBe(-32600);
    expect(error.message).toContain('Invalid Request');
    expect(error.id).toBe(1);
  });

  it('should preserve error data', () => {
    const jsonRpcError = {
      jsonrpc: '2.0' as const,
      error: {
        code: -32602,
        message: 'Invalid params',
        data: { field: 'username', reason: 'required' },
      },
      id: 1,
    };

    const error = new JsonRpcErrorResponse(jsonRpcError);

    expect(error.data).toEqual({ field: 'username', reason: 'required' });
  });

  it('should convert back to JSON-RPC error format', () => {
    const jsonRpcError = {
      jsonrpc: '2.0' as const,
      error: {
        code: -32600,
        message: 'Invalid Request',
        data: { details: 'test' },
      },
      id: 1,
    };

    const error = new JsonRpcErrorResponse(jsonRpcError);
    const converted = error.toJsonRpcError();

    expect(converted).toEqual(jsonRpcError);
  });

  it('should check error code', () => {
    const jsonRpcError = {
      jsonrpc: '2.0' as const,
      error: {
        code: JsonRpcErrorCode.InvalidRequest,
        message: 'Invalid Request',
      },
      id: 1,
    };

    const error = new JsonRpcErrorResponse(jsonRpcError);

    expect(error.isErrorCode(JsonRpcErrorCode.InvalidRequest)).toBe(true);
    expect(error.isErrorCode(JsonRpcErrorCode.MethodNotFound)).toBe(false);
  });

  it('should identify standard JSON-RPC errors', () => {
    const standardError = new JsonRpcErrorResponse({
      jsonrpc: '2.0',
      error: {
        code: JsonRpcErrorCode.InvalidRequest,
        message: 'Invalid Request',
      },
      id: 1,
    });

    const customError = new JsonRpcErrorResponse({
      jsonrpc: '2.0',
      error: {
        code: 1000,
        message: 'Custom error',
      },
      id: 1,
    });

    expect(standardError.isStandardError()).toBe(true);
    expect(customError.isStandardError()).toBe(false);
  });
});

describe('Error Classes', () => {
  describe('A2AError', () => {
    it('should create base error with message', () => {
      const error = new A2AError('Test error');

      expect(error.name).toBe('A2AError');
      expect(error.message).toBe('Test error');
    });

    it('should preserve error cause', () => {
      const cause = new Error('Original error');
      const error = new A2AError('Wrapped error', cause);

      expect(error.cause).toBe(cause);
    });
  });

  describe('NetworkError', () => {
    it('should create network error with status code', () => {
      const error = new NetworkError('Connection failed', 503);

      expect(error.name).toBe('NetworkError');
      expect(error.statusCode).toBe(503);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with validation errors', () => {
      const validationErrors = { field: 'username', message: 'required' };
      const error = new ValidationError('Validation failed', validationErrors);

      expect(error.name).toBe('ValidationError');
      expect(error.validationErrors).toEqual(validationErrors);
    });
  });

  describe('AuthenticationError', () => {
    it('should create auth error with auth URL', () => {
      const error = new AuthenticationError('Auth required', 'https://auth.example.com');

      expect(error.name).toBe('AuthenticationError');
      expect(error.authUrl).toBe('https://auth.example.com');
    });
  });

  describe('StreamingError', () => {
    it('should create streaming error', () => {
      const error = new StreamingError('Stream disconnected');

      expect(error.name).toBe('StreamingError');
      expect(error.message).toBe('Stream disconnected');
    });
  });

  describe('TaskError', () => {
    it('should create task error with task details', () => {
      const error = new TaskError('Task failed', 'task-123', 'TIMEOUT');

      expect(error.name).toBe('TaskError');
      expect(error.taskId).toBe('task-123');
      expect(error.errorCode).toBe('TIMEOUT');
    });
  });
});

describe('Helper Functions', () => {
  describe('createJsonRpcError', () => {
    it('should create JsonRpcErrorResponse from error object', () => {
      const errorObj = {
        code: -32600,
        message: 'Invalid Request',
      };

      const error = createJsonRpcError(errorObj, 1);

      expect(error).toBeInstanceOf(JsonRpcErrorResponse);
      expect(error.code).toBe(-32600);
      expect(error.id).toBe(1);
    });

    it('should use null id by default', () => {
      const errorObj = {
        code: -32700,
        message: 'Parse error',
      };

      const error = createJsonRpcError(errorObj);

      expect(error.id).toBe(null);
    });
  });

  describe('isJsonRpcErrorResponse', () => {
    it('should return true for JsonRpcErrorResponse instance', () => {
      const error = createJsonRpcError({
        code: -32600,
        message: 'Invalid Request',
      });

      expect(isJsonRpcErrorResponse(error)).toBe(true);
    });

    it('should return false for other error types', () => {
      const error = new Error('Regular error');

      expect(isJsonRpcErrorResponse(error)).toBe(false);
    });
  });

  describe('extractErrorDetails', () => {
    it('should extract details from JsonRpcErrorResponse', () => {
      const error = createJsonRpcError({
        code: -32600,
        message: 'Invalid Request',
        data: { field: 'test' },
      });

      const details = extractErrorDetails(error);

      expect(details.message).toContain('Invalid Request');
      expect(details.code).toBe(-32600);
      expect(details.details).toEqual({ field: 'test' });
    });

    it('should extract details from A2AError', () => {
      const cause = new Error('Original');
      const error = new NetworkError('Network failed', 503, cause);

      const details = extractErrorDetails(error);

      expect(details.message).toBe('Network failed');
      expect(details.details).toBe(cause);
    });

    it('should extract details from generic Error', () => {
      const error = new Error('Generic error');

      const details = extractErrorDetails(error);

      expect(details.message).toBe('Generic error');
      expect(details.code).toBeUndefined();
      expect(details.details).toBeUndefined();
    });

    it('should handle non-error values', () => {
      const details = extractErrorDetails('String error');

      expect(details.message).toBe('String error');
    });
  });
});

describe('JsonRpcErrorCode enum', () => {
  it('should have standard error codes', () => {
    expect(JsonRpcErrorCode.ParseError).toBe(-32700);
    expect(JsonRpcErrorCode.InvalidRequest).toBe(-32600);
    expect(JsonRpcErrorCode.MethodNotFound).toBe(-32601);
    expect(JsonRpcErrorCode.InvalidParams).toBe(-32602);
    expect(JsonRpcErrorCode.InternalError).toBe(-32603);
  });
});
