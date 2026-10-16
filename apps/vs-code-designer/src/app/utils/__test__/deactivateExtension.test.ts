/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ext } from '../../../extensionVariables';

const { stopAllDesignTimeApisMock, stopAllFuncTasksMock } = vi.hoisted(() => ({
  stopAllDesignTimeApisMock: vi.fn(),
  stopAllFuncTasksMock: vi.fn(),
}));

vi.mock('../codeless/startDesignTimeApi', () => ({
  stopAllDesignTimeApis: stopAllDesignTimeApisMock,
}));

vi.mock('../funcCoreTools/funcHostTask', () => ({
  stopAllFuncTasks: stopAllFuncTasksMock,
}));

import { deactivateExtension } from '../deactivateExtension';

describe('deactivateExtension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ext.languageClient = { stop: vi.fn().mockResolvedValue(undefined) } as any;
    ext.telemetryReporter = { dispose: vi.fn() } as any;
  });

  it('waits for design-time and runtime Functions hosts to stop before completing shutdown', async () => {
    let resolveDesignTimeCleanup: (() => void) | undefined;
    let resolveRuntimeCleanup: (() => void) | undefined;
    stopAllDesignTimeApisMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDesignTimeCleanup = resolve;
      })
    );
    stopAllFuncTasksMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRuntimeCleanup = resolve;
      })
    );

    let resolved = false;
    const deactivatePromise = deactivateExtension().then(() => {
      resolved = true;
    });
    await Promise.resolve();

    expect(stopAllDesignTimeApisMock).toHaveBeenCalledOnce();
    expect(stopAllFuncTasksMock).toHaveBeenCalledOnce();
    expect(ext.languageClient?.stop).not.toHaveBeenCalled();
    expect(resolved).toBe(false);

    resolveDesignTimeCleanup?.();
    await Promise.resolve();
    expect(resolved).toBe(false);

    resolveRuntimeCleanup?.();
    await deactivatePromise;

    expect(resolved).toBe(true);
    expect(ext.telemetryReporter.dispose).toHaveBeenCalledOnce();
  });
});
