import { describe, it, expect, beforeEach } from 'vitest';
import { ApiConnectionOutputsBinder } from '../../outputs/index';
import sendEmail from '../../__mocks__/sendEmail';
import createBlob from '../../__mocks__/createBlob';

describe('ApiConnectionOutputsBinder', () => {
  let binder: ApiConnectionOutputsBinder;

  describe('Send Email', () => {
    const bindOutputsSendEmail = {
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

    const unhandledOutputsSendEmail = {
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
      expect(result).toStrictEqual(bindOutputsSendEmail);
    });

    it('should handle untyped outputs correctly', () => {
      const result = binder.bind(sendEmail.outputs);
      expect(result).toStrictEqual(unhandledOutputsSendEmail);
    });

    it('should handle empty outputs correctly', () => {
      const result = binder.bind({});
      expect(result).toEqual({});
    });

    it('should handle undefined parameters correctly', () => {
      const result = binder.bind(sendEmail.outputs, undefined);
      expect(result).toEqual(unhandledOutputsSendEmail);
    });
  });

  describe('Create Blob', () => {
    const bindOutputsCreateBlob = {
      Id: {
        displayName: 'Id',
        value: 'idValues',
      },
      Name: {
        displayName: 'Name',
        value: 'test1',
      },
      DisplayName: {
        displayName: 'DisplayName',
        value: 'test1',
      },
      Path: {
        displayName: 'Path',
        value: '/test1/test1',
      },
      LastModified: {
        displayName: 'LastModified',
        value: '2024-09-18T20:20:04Z',
      },
      Size: {
        displayName: 'Size',
        value: 10,
      },
      MediaType: {
        displayName: 'MediaType',
        value: 'application/octet-stream',
      },
      IsFolder: {
        displayName: 'IsFolder',
        value: false,
      },
      ETag: {
        displayName: 'ETag',
        value: '"0x8DCD81F4823D141"',
      },
      FileLocator: {
        displayName: 'FileLocator',
        value: 'idValues',
      },
    };

    const unhandledOutputsCreateBlob = {
      body: {
        displayName: 'Body',
        value: {
          DisplayName: 'test1',
          ETag: '"0x8DCD81F4823D141"',
          FileLocator: 'idValues',
          Id: 'idValues',
          IsFolder: false,
          LastModified: '2024-09-18T20:20:04Z',
          LastModifiedBy: null,
          MediaType: 'application/octet-stream',
          Name: 'test1',
          Path: '/test1/test1',
          Size: 10,
        },
      },
      headers: {
        displayName: 'Headers',
        format: 'key-value-pairs',
        value: {
          'Cache-Control': 'no-store, no-cache',
          'Content-Length': '290',
          'Content-Type': 'application/json; charset=utf-8',
          Date: 'Wed, 18 Sep 2024 20:20:03 GMT',
          Expires: '-1',
          Pragma: 'no-cache',
          'Set-Cookie': 'cookies',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'Timing-Allow-Origin': '*',
          'Transfer-Encoding': 'chunked',
          Vary: 'Accept-Encoding',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'x-ms-apihub-cached-response': 'false',
          'x-ms-apihub-obo': 'false',
          'x-ms-connection-parameter-set-name': 'keyBasedAuth',
          'x-ms-request-id': '349a8740-3cca-41c4-9533-0cfacc4df7c4',
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
      const result = binder.bind(createBlob.outputs, createBlob.outputsParametersByName);
      expect(result).toStrictEqual(bindOutputsCreateBlob);
    });

    it('should handle untyped outputs correctly', () => {
      const result = binder.bind(createBlob.outputs);
      expect(result).toStrictEqual(unhandledOutputsCreateBlob);
    });

    it('should handle empty outputs correctly', () => {
      const result = binder.bind({});
      expect(result).toEqual({});
    });

    it('should handle undefined parameters correctly', () => {
      const result = binder.bind(createBlob.outputs, undefined);
      expect(result).toEqual(unhandledOutputsCreateBlob);
    });
  });
});
