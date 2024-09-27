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
        Pragma: 'no-cache',
        'Transfer-Encoding': 'chunked',
        Vary: 'Accept-Encoding',
        'Set-Cookie':
          'ARRAffinity=9a6f156b4f1c7e60286e4506de82d3f03dfb44924275c5a68e69a492197f767e;Path=/;HttpOnly;Secure;Domain=azureblob-wus.azconn-wus-001.p.azurewebsites.net,ARRAffinitySameSite=9a6f156b4f1c7e60286e4506de82d3f03dfb44924275c5a68e69a492197f767e;Path=/;HttpOnly;SameSite=None;Secure;Domain=azureblob-wus.azconn-wus-001.p.azurewebsites.net',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'x-ms-request-id': '349a8740-3cca-41c4-9533-0cfacc4df7c4',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'x-ms-connection-parameter-set-name': 'keyBasedAuth',
        'Timing-Allow-Origin': '*',
        'x-ms-apihub-cached-response': 'false',
        'x-ms-apihub-obo': 'false',
        Date: 'Wed, 18 Sep 2024 20:20:03 GMT',
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': '290',
        Expires: '-1',
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
