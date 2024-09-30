import { describe, it, expect } from 'vitest';
import { parseOutputs, parseInputs } from '../index';

describe('parseOutputs', () => {
  it('should return an empty object when outputs is null or undefined', () => {
    expect(parseOutputs(null)).toEqual({});
    expect(parseOutputs(undefined)).toEqual({});
  });

  it('should parse string outputs correctly', () => {
    const result = parseOutputs('test');
    expect(result).toHaveProperty('Outputs');
    expect(result.Outputs.displayName).toBe('Outputs');
    expect(result.Outputs.value).toBe('test');
  });

  it('should parse number outputs correctly', () => {
    const result = parseOutputs(123);
    expect(result).toHaveProperty('Outputs');
    expect(result.Outputs.displayName).toBe('Outputs');
    expect(result.Outputs.value).toBe(123);
  });

  it('should parse boolean outputs correctly', () => {
    const result = parseOutputs(true);
    expect(result).toHaveProperty('Outputs');
    expect(result.Outputs.displayName).toBe('Outputs');
    expect(result.Outputs.value).toBe(true);
  });

  it('should parse array outputs correctly', () => {
    const result = parseOutputs([1, 2, 3]);
    expect(result).toHaveProperty('Outputs');
    expect(result.Outputs.displayName).toBe('Outputs');
    expect(result.Outputs.value).toEqual([1, 2, 3]);
  });

  it('should parse object outputs correctly', () => {
    const result = parseOutputs({ key: 'value' });
    expect(result).toHaveProperty('key');
    expect(result.key.displayName).toBe('key');
    expect(result.key.value).toBe('value');
  });

  it('should parse object outputs correctly', () => {
    const outputs = {
      statusCode: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache',
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': '290',
      },
    };
    const result = parseInputs(outputs);
    expect(result).toHaveProperty('statusCode');
    expect(result).toHaveProperty('headers');
  });
});

describe('parseInputs', () => {
  it('should return an empty object when inputs is null or undefined', () => {
    expect(parseInputs(null)).toEqual({});
    expect(parseInputs(undefined)).toEqual({});
  });

  it('should parse string inputs correctly', () => {
    const result = parseInputs('test');
    expect(result).toHaveProperty('Inputs');
    expect(result.Inputs.displayName).toBe('Inputs');
    expect(result.Inputs.value).toBe('test');
  });

  it('should parse number inputs correctly', () => {
    const result = parseInputs(123);
    expect(result).toHaveProperty('Inputs');
    expect(result.Inputs.displayName).toBe('Inputs');
    expect(result.Inputs.value).toBe(123);
  });

  it('should parse boolean inputs correctly', () => {
    const result = parseInputs(true);
    expect(result).toHaveProperty('Inputs');
    expect(result.Inputs.displayName).toBe('Inputs');
    expect(result.Inputs.value).toBe(true);
  });

  it('should parse array inputs correctly', () => {
    const result = parseInputs([1, 2, 3]);
    expect(result).toHaveProperty('Inputs');
    expect(result.Inputs.displayName).toBe('Inputs');
    expect(result.Inputs.value).toEqual([1, 2, 3]);
  });

  it('should parse object inputs correctly', () => {
    const result = parseInputs({ key: 'value' });
    expect(result).toHaveProperty('key');
    expect(result.key.displayName).toBe('key');
    expect(result.key.value).toBe('value');
  });

  it('should parse object inputs correctly', () => {
    const inputs = {
      method: 'post',
      queries: {
        folderPath: '/test1',
        name: 'test1',
        queryParametersSingleEncoded: 'True',
      },
      headers: {
        ReadFileMetadataFromServer: 'True',
      },
      path: '/v2/datasets/AccountNameFromSettings/files',
      host: {
        connection: {
          referenceName: 'azureblob-1',
        },
      },
      body: '{"TEST":1}',
    };
    const result = parseInputs(inputs);
    expect(result).toHaveProperty('method');
    expect(result).toHaveProperty('queries');
    expect(result).toHaveProperty('headers');
    expect(result).toHaveProperty('path');
    expect(result).toHaveProperty('host');
    expect(result).toHaveProperty('body');
  });
});
