import type { CallbackInfo } from '../../models';
import { getCallbackUrl, getIsCallbackUrlSupported } from '../run';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('lib/utils/src/lib/helpers', () => {
  describe('getCallbackUrl', () => {
    it('should return undefined when passed nothing', () => {
      expect(getCallbackUrl(undefined)).toBeUndefined();
    });

    it('should return a callback URL when value is set', () => {
      const callbackInfo: CallbackInfo = {
        value: 'value',
      };
      expect(getCallbackUrl(callbackInfo)).toBe(callbackInfo.value);
    });

    it('should return a callback URL when relativePath is set', () => {
      const callbackInfo: CallbackInfo = {
        method: 'POST',
        relativePath: '/apis/list',
      };
      expect(getCallbackUrl(callbackInfo)).toBe('/apis/list');
    });

    it('should return a callback URL when relativePath is set without prepended /', () => {
      const callbackInfo: CallbackInfo = {
        method: 'POST',
        relativePath: 'apis/list',
      };
      expect(getCallbackUrl(callbackInfo)).toBe('/apis/list');
    });

    it('should return a callback URL when relativePath and basePath are set', () => {
      const callbackInfo: CallbackInfo = {
        basePath: '/root',
        method: 'POST',
        relativePath: '/apis/list',
      };
      expect(getCallbackUrl(callbackInfo)).toBe('/root/apis/list');
    });

    it('should return a callback URL when relativePath and queries are set', () => {
      const callbackInfo: CallbackInfo = {
        method: 'POST',
        queries: {
          'api-version': '2022-02-01',
        },
        relativePath: '/apis/list',
      };
      expect(getCallbackUrl(callbackInfo)).toBe('/apis/list?api-version=2022-02-01');
    });
  });
  describe('getIsCallbackUrlSupported', () => {
    it('should return undefined when passed nothing', () => {
      const requestDefinition = {
        $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
        actions: {},
        contentVersion: '1.0.0.0',
        outputs: {},
        triggers: {
          When_a_HTTP_request_is_received: {
            kind: 'Http',
            type: 'Request',
          },
        },
      };
      const isCallbackUrlSupported = getIsCallbackUrlSupported(requestDefinition);
      expect(isCallbackUrlSupported).toBeUndefined();
    });

    it('should return undefined when passed nothing', () => {
      const recurrenceDefinition = {
        $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
        actions: {},
        contentVersion: '1.0.0.0',
        outputs: {},
        triggers: {
          Recurrence: {
            recurrence: {
              frequency: 'Minute',
              interval: 10,
            },
            type: 'Recurrence',
          },
        },
      };
      const isCallbackUrlSupported = getIsCallbackUrlSupported(recurrenceDefinition);

      expect(isCallbackUrlSupported).toBeUndefined();
    });
  });
});
