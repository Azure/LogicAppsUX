import type { CallbackInfo, Run, RunError } from '../types';
import { getCallbackUrl, isRunError, mapToRunItem } from '../utils';

describe('lib/overview/utils', () => {
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

  describe('isRunError', () => {
    it('should return true when passed a run error object', () => {
      const runError: RunError = {
        error: {
          code: 'code',
          message: 'message',
        },
      };
      expect(isRunError(runError)).toBeTruthy();
    });
  });

  describe('mapToRunItem', () => {
    it('should map to a run display item', () => {
      const run: Run = {
        id: 'id',
        name: 'name',
        properties: {
          outputs: {},
          startTime: '2022-02-14T22:56:00Z',
          status: 'Succeeded',
          trigger: {},
          workflow: {},
        },
        type: 'Microsoft.Logic/workflows/runs',
      };
      expect(mapToRunItem(run)).toEqual({
        duration: '--',
        id: run.id,
        identifier: run.name,
        startTime: run.properties.startTime,
        status: run.properties.status,
      });
    });

    it('should map to a run display item with duration', () => {
      const run: Run = {
        id: 'id',
        name: 'name',
        properties: {
          outputs: {},
          endTime: '2022-02-14T22:57:00Z',
          startTime: '2022-02-14T22:56:00Z',
          status: 'Succeeded',
          trigger: {},
          workflow: {},
        },
        type: 'Microsoft.Logic/workflows/runs',
      };
      expect(mapToRunItem(run)).toEqual(
        expect.objectContaining({
          duration: '1 minute',
        })
      );
    });
  });
});
