import { describe, it, expect, beforeEach } from 'vitest';
import { ApiConnectionOutputsBinder } from '../../outputs/index';
import sendEmail from '../../__mocks__/sendEmail';

describe('ApiConnectionOutputsBinder', () => {
  let binder: ApiConnectionOutputsBinder;
  const bindOutputs = {
    statusCode: {
      displayName: 'Status Code',
      value: 200,
    },
    headers: {
      displayName: 'Headers',
      value: {
        'Cache-Control': 'no-store, no-cache',
        Pragma: 'no-cache',
        'Set-Cookie':
          'ARRAffinity=3918252a89b1afdb8c3dc464535f8a9dbabe6782d2c64ae7d28576826f1f4c2f;Path=/;HttpOnly;Secure;Domain=office365-wus.azconn-wus-001.p.azurewebsites.net,ARRAffinitySameSite=3918252a89b1afdb8c3dc464535f8a9dbabe6782d2c64ae7d28576826f1f4c2f;Path=/;HttpOnly;SameSite=None;Secure;Domain=office365-wus.azconn-wus-001.p.azurewebsites.net',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'x-ms-request-id': 'd7108db1-47b8-bcce-8239-d67e8eaf3cad',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'x-ms-environment-id': '483a77f0be37e98e',
        'Timing-Allow-Origin': '*',
        'x-ms-apihub-cached-response': 'false',
        'x-ms-apihub-obo': 'false',
        Date: 'Wed, 18 Sep 2024 20:20:03 GMT',
        'Content-Length': '0',
        Expires: '-1',
      },
      format: 'key-value-pairs',
    },
  };
  const unhandledOutputs = {
    headers: {
      displayName: 'Headers',
      format: 'key-value-pairs',
      value: {
        'Cache-Control': 'no-store, no-cache',
        'Content-Length': '0',
        Date: 'Wed, 18 Sep 2024 20:20:03 GMT',
        Expires: '-1',
        Pragma: 'no-cache',
        'Set-Cookie':
          'ARRAffinity=3918252a89b1afdb8c3dc464535f8a9dbabe6782d2c64ae7d28576826f1f4c2f;Path=/;HttpOnly;Secure;Domain=office365-wus.azconn-wus-001.p.azurewebsites.net,ARRAffinitySameSite=3918252a89b1afdb8c3dc464535f8a9dbabe6782d2c64ae7d28576826f1f4c2f;Path=/;HttpOnly;SameSite=None;Secure;Domain=office365-wus.azconn-wus-001.p.azurewebsites.net',
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
