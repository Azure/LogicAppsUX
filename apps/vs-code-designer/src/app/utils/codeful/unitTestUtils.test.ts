import { describe, it, expect, vi } from 'vitest';
import { extractAndValidateRunId, removeInvalidCharacters, validateRunId } from '../unitTests';
import { toPascalCase } from '@microsoft/logic-apps-shared';

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

describe('toPascalCase', () => {
  it('should convert a valid snake_case string to PascalCase', () => {
    const input = 'example_string';
    const result = toPascalCase(input);
    expect(result).toBe('ExampleString');
  });

  it('should capitalize the first letter of a single word', () => {
    const input = 'example';
    const result = toPascalCase(input);
    expect(result).toBe('Example');
  });

  it('should handle strings with multiple underscores', () => {
    const input = 'example__string__test';
    const result = toPascalCase(input);
    expect(result).toBe('ExampleStringTest');
  });

  it('should handle an empty string gracefully', () => {
    const input = '';
    const result = toPascalCase(input);
    expect(result).toBe('');
  });

  it('should handle strings with leading underscores', () => {
    const input = '_example_string';
    const result = toPascalCase(input);
    expect(result).toBe('ExampleString');
  });
});

describe('combined usage of removeInvalidCharacters and toPascalCase', () => {
  it('should clean and convert a string to PascalCase', () => {
    const input = 'example-string(123)';
    const cleaned = removeInvalidCharacters(input);
    const pascalCase = toPascalCase(cleaned);
    expect(pascalCase).toBe('ExampleString123');
  });

  it('should handle strings with only invalid characters', () => {
    const input = '!@#$%^&*()';
    const cleaned = removeInvalidCharacters(input);
    const pascalCase = toPascalCase(cleaned);
    expect(pascalCase).toBe('');
  });

  it('should handle already clean PascalCase strings', () => {
    const input = 'ExampleString';
    const cleaned = removeInvalidCharacters(input);
    const pascalCase = toPascalCase(cleaned);
    expect(pascalCase).toBe('ExampleString');
  });
});
