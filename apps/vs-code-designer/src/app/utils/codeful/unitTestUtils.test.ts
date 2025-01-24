import { describe, it, expect, vi } from 'vitest';
import { extractAndValidateRunId, validateRunId } from '../unitTests';

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
