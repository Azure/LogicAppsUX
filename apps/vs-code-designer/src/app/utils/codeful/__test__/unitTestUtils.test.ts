import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractAndValidateRunId, parseErrorBeforeTelemetry, removeInvalidCharacters, validateRunId } from '../../unitTests';
import axios from 'axios';

// Mock the vscode-nls module
vi.mock('vscode-nls', () => ({
  loadMessageBundle: vi.fn(() => (key: string, message: string) => message),
}));

describe('extractAndValidateRunId', () => {
  it('should throw an error if runId is undefined', async () => {
    await expect(extractAndValidateRunId(undefined)).rejects.toThrowError('Run ID is required to generate a codeful unit test.');
  });

  it('should extract and validate a valid runId from a path', async () => {
    const runId = '/workflows/testWorkflow/runs/ABC123';
    const result = await extractAndValidateRunId(runId);
    expect(result).toBe('ABC123');
  });

  it('should validate a direct valid runId', async () => {
    const runId = 'ABC123';
    const result = await extractAndValidateRunId(runId);
    expect(result).toBe('ABC123');
  });

  it('should throw an error for an invalid runId format', async () => {
    const runId = '/workflows/testWorkflow/runs/invalid-run-id';
    await expect(extractAndValidateRunId(runId)).rejects.toThrowError('Invalid runId format.');
  });

  it('should trim whitespace around the runId', async () => {
    const runId = '   ABC123   ';
    const result = await extractAndValidateRunId(runId);
    expect(result).toBe('ABC123');
  });
});

describe('validateRunId', () => {
  it('should resolve for a valid runId', async () => {
    const runId = 'ABC123';
    await expect(validateRunId(runId)).resolves.not.toThrow();
  });

  it('should throw an error for an invalid runId', async () => {
    const runId = 'abc123';
    await expect(validateRunId(runId)).rejects.toThrowError('Invalid runId format.');
  });

  it('should throw an error for an empty runId', async () => {
    const runId = '';
    await expect(validateRunId(runId)).rejects.toThrowError('Invalid runId format.');
  });
});

describe('removeInvalidCharacters', () => {
  it('should remove invalid characters from a string', () => {
    const input = 'example-string(123)';
    const result = removeInvalidCharacters(input);
    expect(result).toBe('examplestring123');
  });

  it('should handle strings with only valid characters', () => {
    const input = 'ValidString123';
    const result = removeInvalidCharacters(input);
    expect(result).toBe('ValidString123');
  });

  it('should return an empty string if input contains only invalid characters', () => {
    const input = '!@#$%^&*()';
    const result = removeInvalidCharacters(input);
    expect(result).toBe('');
  });

  it('should handle empty input strings', () => {
    const input = '';
    const result = removeInvalidCharacters(input);
    expect(result).toBe('');
  });
});

/**
 * @description Unit tests for the parseErrorBeforeTelemetry function using Vitest.
 */
// Use TextEncoder/TextDecoder to encode/decode data as needed.
const encoder = new TextEncoder();

/**
 * =============================================================================
 * Module Mocks
 * =============================================================================
 */

// Mock the localize module so that our localized messages are predictable.
// The mock implementation simply returns the formatted message.
import * as localizeModule from '../../../../localize';
vi.mock('../../../../localize', () => ({
  localize: vi.fn((key: string, message: string) => message),
}));

// Mock the ext module (extensionVariables) to spy on logging behavior.
import { ext } from '../../../../extensionVariables';
vi.mock('../../../../extensionVariables', () => ({
  ext: {
    outputChannel: {
      appendLog: vi.fn(),
    },
  },
}));

/**
 * =============================================================================
 * Test Suite for parseErrorBeforeTelemetry
 * =============================================================================
 */
describe('parseErrorBeforeTelemetry', () => {
  let axiosIsAxiosErrorSpy: ReturnType<typeof vi.spyOn>;
  let appendLogSpy: ReturnType<typeof vi.spyOn>;
  let localizeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on axios.isAxiosError to control its return value during tests.
    axiosIsAxiosErrorSpy = vi.spyOn(axios, 'isAxiosError');
    // Spy on ext.outputChannel.appendLog to verify log calls.
    appendLogSpy = vi.spyOn(ext.outputChannel, 'appendLog');
    // Access the mocked localize function.
    localizeSpy = localizeModule.localize as unknown as ReturnType<typeof vi.spyOn>;
  });

  afterEach(() => {
    // Restore all mocks after each test to prevent cross-test interference.
    vi.restoreAllMocks();
  });

  /**
   * Test case: Axios error with valid JSON response data.
   *
   * It should parse the JSON from error.response.data, create a formatted error
   * message using the localize function, log it, and then return it.
   */
  it('should return formatted API error message for Axios error with valid JSON response data', () => {
    // Arrange: Create dummy response data with an error code and message.
    const responseData = {
      error: {
        message: 'Not Found',
        code: '404',
      },
    };
    // Encode the JSON string into a Uint8Array (as expected by TextDecoder).
    const encodedData = encoder.encode(JSON.stringify(responseData));
    // Create a dummy Axios error object.
    const error: any = {
      message: 'Original error message',
      response: {
        data: encodedData,
      },
    };
    // Force axios.isAxiosError to return true.
    axiosIsAxiosErrorSpy.mockReturnValue(true);

    // Act: Call the function under test.
    const result = parseErrorBeforeTelemetry(error);

    // Assert: Verify the formatted message is returned and logged.
    const expectedMessage = 'API Error: 404 - Not Found';
    expect(result).toBe(expectedMessage);
    expect(localizeSpy).toHaveBeenCalledWith('apiError', expectedMessage);
    expect(appendLogSpy).toHaveBeenCalledWith(expectedMessage);
  });

  /**
   * Test case: Axios error with invalid JSON response data.
   *
   * If JSON parsing fails, the function should fall back to returning the original
   * error message and not call localize or log the formatted message.
   */
  it('should return fallback error message when JSON parsing fails in Axios error', () => {
    // Arrange: Create invalid JSON data.
    const invalidData = encoder.encode('invalid json');
    const error: any = {
      message: 'Parsing failed',
      response: {
        data: invalidData,
      },
    };
    axiosIsAxiosErrorSpy.mockReturnValue(true);

    // Act: Call the function.
    const result = parseErrorBeforeTelemetry(error);

    // Assert: Expect the fallback (original error message) to be returned.
    expect(result).toBe('Parsing failed');
    // Ensure that neither localize nor appendLog were called.
    expect(localizeSpy).not.toHaveBeenCalled();
    expect(appendLogSpy).not.toHaveBeenCalled();
  });

  /**
   * Test case: Non-Axios error instance.
   *
   * When the error is a standard JavaScript Error (and not recognized as an Axios
   * error), the function should simply return the error's message.
   */
  it('should return error message for non-Axios Error instance', () => {
    // Arrange: Create a regular Error.
    const error = new Error('Regular error');
    // Ensure axios.isAxiosError returns false.
    axiosIsAxiosErrorSpy.mockReturnValue(false);

    // Act: Call the function.
    const result = parseErrorBeforeTelemetry(error);

    // Assert: The error message should be returned.
    expect(result).toBe('Regular error');
  });

  /**
   * Test case: Non-error type.
   *
   * If a non-error (e.g., a number) is passed to the function, it should return
   * the string representation of that value.
   */
  it('should return string conversion for non-error types', () => {
    // Arrange: Use a non-error type (number).
    const error = 42;

    // Act: Call the function.
    const result = parseErrorBeforeTelemetry(error);

    // Assert: Expect the string "42" to be returned.
    expect(result).toBe('42');
  });
});
