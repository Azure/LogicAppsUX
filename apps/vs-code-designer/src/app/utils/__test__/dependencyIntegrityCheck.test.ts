/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ext } from '../../../extensionVariables';
import { dependencyIntegrityCheckIntervalMs, lastDependencyIntegrityCheckKeyPrefix } from '../../../constants';
import { recordDependencyIntegrityCheck, shouldRunDeepDependencyIntegrityCheck } from '../dependencyIntegrityCheck';

describe('dependencyIntegrityCheck', () => {
  const dependencyName = 'FuncCoreTools';
  const key = `${lastDependencyIntegrityCheckKeyPrefix}.${dependencyName}`;
  let globalStateGet: Mock;
  let globalStateUpdate: Mock;

  beforeEach(() => {
    globalStateGet = vi.fn();
    globalStateUpdate = vi.fn().mockResolvedValue(undefined);
    (ext as any).context = {
      globalState: {
        get: globalStateGet,
        update: globalStateUpdate,
      },
    };
  });

  describe('shouldRunDeepDependencyIntegrityCheck', () => {
    it('returns true when no timestamp has been recorded', () => {
      globalStateGet.mockReturnValue(undefined);
      expect(shouldRunDeepDependencyIntegrityCheck(dependencyName)).toBe(true);
      expect(globalStateGet).toHaveBeenCalledWith(key);
    });

    it('returns true when the stored value is not a number', () => {
      globalStateGet.mockReturnValue('not-a-number');
      expect(shouldRunDeepDependencyIntegrityCheck(dependencyName)).toBe(true);
    });

    it('returns true when the stored value is NaN', () => {
      globalStateGet.mockReturnValue(Number.NaN);
      expect(shouldRunDeepDependencyIntegrityCheck(dependencyName)).toBe(true);
    });

    it('returns true when more than the interval has elapsed', () => {
      const now = 1_000_000_000_000;
      globalStateGet.mockReturnValue(now - dependencyIntegrityCheckIntervalMs - 1);
      expect(shouldRunDeepDependencyIntegrityCheck(dependencyName, now)).toBe(true);
    });

    it('returns true when exactly the interval has elapsed', () => {
      const now = 1_000_000_000_000;
      globalStateGet.mockReturnValue(now - dependencyIntegrityCheckIntervalMs);
      expect(shouldRunDeepDependencyIntegrityCheck(dependencyName, now)).toBe(true);
    });

    it('returns false when less than the interval has elapsed', () => {
      const now = 1_000_000_000_000;
      globalStateGet.mockReturnValue(now - 1000);
      expect(shouldRunDeepDependencyIntegrityCheck(dependencyName, now)).toBe(false);
    });

    it('keys the throttle per dependency', () => {
      globalStateGet.mockReturnValue(undefined);
      shouldRunDeepDependencyIntegrityCheck('NodeJs');
      expect(globalStateGet).toHaveBeenCalledWith(`${lastDependencyIntegrityCheckKeyPrefix}.NodeJs`);
    });

    it('returns true when ext.context is undefined', () => {
      (ext as any).context = undefined;
      expect(shouldRunDeepDependencyIntegrityCheck(dependencyName)).toBe(true);
    });
  });

  describe('recordDependencyIntegrityCheck', () => {
    it('persists the provided timestamp under the per-dependency key', async () => {
      const now = 1_234_567_890;
      await recordDependencyIntegrityCheck(dependencyName, now);
      expect(globalStateUpdate).toHaveBeenCalledWith(key, now);
    });

    it('does not throw when ext.context is undefined', async () => {
      (ext as any).context = undefined;
      await expect(recordDependencyIntegrityCheck(dependencyName, 123)).resolves.toBeUndefined();
    });
  });
});
