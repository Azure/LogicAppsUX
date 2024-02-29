import { isRunError, mapToRunItem } from '../utils';
import type { Run, RunError } from '@microsoft/logic-apps-shared';

describe('lib/overview/utils', () => {
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
