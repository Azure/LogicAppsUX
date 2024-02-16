import type { Callbacks } from '../../models';
import { getCallbackUrl } from '../run';

describe('lib/utils/src/lib/helpers', () => {
  describe('getCallbackUrl', () => {
    it('should return undefined when passed nothing', () => {
      expect(getCallbackUrl(undefined)).toBeUndefined();
    });

    it('should return a callback URL when value is set', () => {
      const callbackInfo: Callbacks = {
        value: 'value',
      };
      expect(getCallbackUrl(callbackInfo)).toBe(callbackInfo.value);
    });

    it('should return a callback URL when relativePath is set', () => {
      const callbackInfo: Callbacks = {
        method: 'POST',
        relativePath: '/apis/list',
      };
      expect(getCallbackUrl(callbackInfo)).toBe('/apis/list');
    });

    it('should return a callback URL when relativePath is set without prepended /', () => {
      const callbackInfo: Callbacks = {
        method: 'POST',
        relativePath: 'apis/list',
      };
      expect(getCallbackUrl(callbackInfo)).toBe('/apis/list');
    });

    it('should return a callback URL when relativePath and basePath are set', () => {
      const callbackInfo: Callbacks = {
        basePath: '/root',
        method: 'POST',
        relativePath: '/apis/list',
      };
      expect(getCallbackUrl(callbackInfo)).toBe('/root/apis/list');
    });

    it('should return a callback URL when relativePath and queries are set', () => {
      const callbackInfo: Callbacks = {
        method: 'POST',
        queries: {
          'api-version': '2022-02-01',
        },
        relativePath: '/apis/list',
      };
      expect(getCallbackUrl(callbackInfo)).toBe('/apis/list?api-version=2022-02-01');
    });
  });
});
