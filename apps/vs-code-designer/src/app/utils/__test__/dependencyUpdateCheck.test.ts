/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ext } from '../../../extensionVariables';
import { dependencyUpdateCheckIntervalMs, recordDependencyUpdateCheck, shouldCheckForDependencyUpdates } from '../dependencyUpdateCheck';

const lastDependencyUpdateCheckKey = 'azureLogicAppsStandard.lastDependencyUpdateCheck';

describe('dependencyUpdateCheck', () => {
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

  describe('shouldCheckForDependencyUpdates', () => {
    it('returns true when no timestamp has been recorded', () => {
      globalStateGet.mockReturnValue(undefined);
      expect(shouldCheckForDependencyUpdates()).toBe(true);
    });

    it('returns true when the stored value is not a number', () => {
      globalStateGet.mockReturnValue('not-a-number');
      expect(shouldCheckForDependencyUpdates()).toBe(true);
    });

    it('returns true when the stored value is NaN', () => {
      globalStateGet.mockReturnValue(Number.NaN);
      expect(shouldCheckForDependencyUpdates()).toBe(true);
    });

    it('returns true when more than the interval has elapsed', () => {
      const now = 1_000_000_000_000;
      globalStateGet.mockReturnValue(now - dependencyUpdateCheckIntervalMs - 1);
      expect(shouldCheckForDependencyUpdates(now)).toBe(true);
    });

    it('returns true when exactly the interval has elapsed', () => {
      const now = 1_000_000_000_000;
      globalStateGet.mockReturnValue(now - dependencyUpdateCheckIntervalMs);
      expect(shouldCheckForDependencyUpdates(now)).toBe(true);
    });

    it('returns false when less than the interval has elapsed', () => {
      const now = 1_000_000_000_000;
      globalStateGet.mockReturnValue(now - 1000);
      expect(shouldCheckForDependencyUpdates(now)).toBe(false);
    });

    it('returns true when ext.context is undefined', () => {
      (ext as any).context = undefined;
      expect(shouldCheckForDependencyUpdates()).toBe(true);
    });
  });

  describe('recordDependencyUpdateCheck', () => {
    it('persists the provided timestamp to global state', async () => {
      const now = 1_234_567_890;
      await recordDependencyUpdateCheck(now);
      expect(globalStateUpdate).toHaveBeenCalledWith(lastDependencyUpdateCheckKey, now);
    });

    it('does not throw when ext.context is undefined', async () => {
      (ext as any).context = undefined;
      await expect(recordDependencyUpdateCheck(123)).resolves.toBeUndefined();
    });
  });
});
