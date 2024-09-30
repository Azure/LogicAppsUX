import { describe, it, expect, beforeEach } from 'vitest';
import { ApiConnectionOutputsBinder } from '../../outputs/index';
import sendEmail from '../../__mocks__/sendEmail';

describe('ApiConnectionOutputsBinder', () => {
  let binder: ApiConnectionOutputsBinder;
  const bindOutputs = {
    headers: {
      displayName: 'Headers',
      format: 'key-value-pairs',
      value: {
        'Cache-Control': 'no-store, no-cache',
        Date: 'Wed, 18 Sep 2024 20:20:03 GMT',
        Pragma: 'no-cache',
        'Set-Cookie': 'cookies',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Timing-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'x-ms-apihub-cached-response': 'false',
        'x-ms-apihub-obo': 'false',
        'x-ms-environment-id': '483a77f0be37e98e',
        'x-ms-request-id': 'd7108db1-47b8-bcce-8239-d67e8eaf3cad',
      },
    },
    statusCode: {
      displayName: 'Status Code',
      value: 200,
    },
  };

  const unhandledOutputs = {
    headers: {
      displayName: 'Headers',
      format: 'key-value-pairs',
      value: {
        'Cache-Control': 'no-store, no-cache',
        Date: 'Wed, 18 Sep 2024 20:20:03 GMT',
        Pragma: 'no-cache',
        'Set-Cookie': 'cookies',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Timing-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'x-ms-apihub-cached-response': 'false',
        'x-ms-apihub-obo': 'false',
        'x-ms-environment-id': '483a77f0be37e98e',
        'x-ms-request-id': 'd7108db1-47b8-bcce-8239-d67e8eaf3cad',
      },
    },
    statusCode: {
      displayName: 'Status Code',
      value: 200,
    },
  };

  beforeEach(() => {
    binder = new ApiConnectionOutputsBinder(undefined as any, undefined);
  });

  it('should bind outputs correctly', () => {
    const result = binder.bind(sendEmail.outputs, sendEmail.outputsParametersByName);
    expect(result).toStrictEqual(bindOutputs);
  });

  it('should handle untyped outputs correctly', () => {
    const result = binder.bind(sendEmail.outputs);
    expect(result).toStrictEqual(unhandledOutputs);
  });

  it('should handle empty outputs correctly', () => {
    const result = binder.bind({});
    expect(result).toEqual({});
  });

  it('should handle undefined parameters correctly', () => {
    const result = binder.bind(sendEmail.outputs, undefined);
    expect(result).toEqual(unhandledOutputs);
  });
});
