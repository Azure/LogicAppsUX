/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  azuriteBinariesLocationSetting,
  azuriteExtensionPrefix,
  azuriteLocationSetting,
  defaultAzuritePathValue,
  extensionCommand,
  localEmulatorConnectionString,
  showAutoStartAzuriteWarning,
} from '../../../../constants';

// Distinct sentinels so the function's `result === DialogResponses.*` comparisons are meaningful.
// Declared via vi.hoisted so they are available inside the hoisted vi.mock factory below.
const { dialogNo, dialogDontWarnAgain } = vi.hoisted(() => ({
  dialogNo: { title: 'No' },
  dialogDontWarnAgain: { title: "Don't warn again" },
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  DialogResponses: { no: dialogNo, dontWarnAgain: dialogDontWarnAgain },
  // The product calls parseError() in the azurite.start failure path. This file-local factory
  // shadows the global one in test-setup.ts, so it must supply parseError too -- otherwise the
  // catch branch dies with "[vitest] No parseError export is defined on the mock" instead of
  // exercising the fallback. Real-ish implementation so azuriteStartError is actually meaningful.
  parseError: (error: unknown) => ({ message: error instanceof Error ? error.message : String(error) }),
}));

vi.mock('../../../../localize', () => ({
  localize: (_key: string, msg: string) => msg,
}));

vi.mock('../../vsCodeConfig/settings', () => ({
  getWorkspaceSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
  removeSharedSetting: vi.fn(),
}));

vi.mock('../../workspace', () => ({
  getWorkspaceFolder: vi.fn(),
}));

vi.mock('../../verifyIsProject', () => ({
  tryGetLogicAppProjectRoot: vi.fn(),
}));

vi.mock('../../../debug/validatePreDebug', () => ({
  validateEmulatorIsRunning: vi.fn(),
}));

vi.mock('../../appSettings/localSettings', () => ({
  getAzureWebJobsStorage: vi.fn(),
}));

vi.mock('../../../azuriteExtension/executeOnAzuriteExt', () => ({
  executeOnAzurite: vi.fn(),
}));

vi.mock('../../delay', () => ({
  delay: vi.fn(),
}));

import * as vscode from 'vscode';
import { activateAzurite, azuriteStartupRetryCount, azuriteStartupRetryDelayMs } from '../activateAzurite';
import { getWorkspaceSetting, updateGlobalSetting, removeSharedSetting } from '../../vsCodeConfig/settings';
import { getWorkspaceFolder } from '../../workspace';
import { tryGetLogicAppProjectRoot } from '../../verifyIsProject';
import { getAzureWebJobsStorage } from '../../appSettings/localSettings';
import { validateEmulatorIsRunning } from '../../../debug/validatePreDebug';
import { executeOnAzurite } from '../../../azuriteExtension/executeOnAzuriteExt';
import { delay } from '../../delay';

const PROJECT_PATH = '/workspace/logicapp';

/**
 * The product reports MEASURED elapsed seconds, and `delay` is mocked here, so the rendered number
 * is not stable (and the localize mock does not substitute `{0}` at all). Match the stable prefix
 * only -- asserting the full sentence would couple these tests to wording that is free to change.
 */
const AZURITE_TIMEOUT_MESSAGE = /Azurite did not become ready/;

/**
 * Realistic `azurite.start` rejection. The third-party Azurite extension rejects the command when
 * the port is already bound -- which is exactly what a second concurrent debug session sees while
 * a perfectly healthy Azurite is already serving the first one.
 */
const START_COMMAND_FAILURE = 'Command "azurite.start" failed: port 10000 is already in use';

/** Build the settings the function reads, keyed by the first arg to getWorkspaceSetting. */
function mockSettings(values: {
  globalAzuriteLocation?: string;
  binariesLocation?: string;
  showWarning?: boolean;
  autoStart?: boolean;
}) {
  (getWorkspaceSetting as any).mockImplementation((section: string) => {
    switch (section) {
      case azuriteLocationSetting:
        return values.globalAzuriteLocation;
      case azuriteBinariesLocationSetting:
        return values.binariesLocation;
      case showAutoStartAzuriteWarning:
        return values.showWarning;
      default:
        return values.autoStart;
    }
  });
}

function createContext(overrides?: { showWarningMessage?: any; showInputBox?: any }) {
  return {
    telemetry: { properties: {}, measurements: {} },
    ui: {
      showWarningMessage: overrides?.showWarningMessage ?? vi.fn(),
      showInputBox: overrides?.showInputBox ?? vi.fn(),
    },
  } as any;
}

describe('activateAzurite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: PROJECT_PATH } }];
    (getAzureWebJobsStorage as any).mockResolvedValue(localEmulatorConnectionString);
    (validateEmulatorIsRunning as any).mockResolvedValue(false);
    // Default: the start command succeeds. Set explicitly so a rejected implementation from one
    // test cannot leak into the next (clearAllMocks resets calls, not implementations).
    (executeOnAzurite as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    (vscode.workspace as any).workspaceFolders = [];
  });

  it('returns early and touches no settings when there are no workspace folders', async () => {
    (vscode.workspace as any).workspaceFolders = [];
    await activateAzurite(createContext(), PROJECT_PATH);
    expect(getWorkspaceSetting).not.toHaveBeenCalled();
    expect(updateGlobalSetting).not.toHaveBeenCalled();
    expect(executeOnAzurite).not.toHaveBeenCalled();
  });

  it('resolves the project root when no projectPath is provided and returns early when none is found', async () => {
    (getWorkspaceFolder as any).mockResolvedValue({ uri: { fsPath: PROJECT_PATH } });
    (tryGetLogicAppProjectRoot as any).mockResolvedValue(undefined);
    const ctx = createContext();

    await activateAzurite(ctx);

    // With no resolvable project root the function returns before reading/writing any settings.
    expect(tryGetLogicAppProjectRoot).toHaveBeenCalled();
    expect(getWorkspaceSetting).not.toHaveBeenCalled();
    expect(updateGlobalSetting).not.toHaveBeenCalled();
    expect(executeOnAzurite).not.toHaveBeenCalled();
  });

  it('only disables the warning when the user selects "Don\'t warn again"', async () => {
    mockSettings({ showWarning: true, autoStart: false });
    const showWarningMessage = vi.fn().mockResolvedValue(dialogDontWarnAgain);
    (validateEmulatorIsRunning as any).mockResolvedValue(false);

    await activateAzurite(createContext({ showWarningMessage }), PROJECT_PATH);

    expect(updateGlobalSetting).toHaveBeenCalledWith(showAutoStartAzuriteWarning, false);
    expect(executeOnAzurite).not.toHaveBeenCalled();
  });

  it('enables autostart and stores the user-provided azurite directory', async () => {
    mockSettings({ showWarning: true, autoStart: false, binariesLocation: undefined });
    // showWarningMessage returns the first passed item (enableMessage) so result === enableMessage.
    const showWarningMessage = vi.fn().mockImplementation((_title, enableMessage) => Promise.resolve(enableMessage));
    const showInputBox = vi.fn().mockResolvedValue('/custom/azurite/dir');
    (validateEmulatorIsRunning as any).mockResolvedValue(true);

    await activateAzurite(createContext({ showWarningMessage, showInputBox }), PROJECT_PATH);

    expect(updateGlobalSetting).toHaveBeenCalledWith(azuriteBinariesLocationSetting, '/custom/azurite/dir');
  });

  it('enables autostart and falls back to the default path when input is cancelled', async () => {
    mockSettings({ showWarning: true, autoStart: false, binariesLocation: undefined });
    const showWarningMessage = vi.fn().mockImplementation((_title, enableMessage) => Promise.resolve(enableMessage));
    const showInputBox = vi.fn().mockResolvedValue(undefined);
    (validateEmulatorIsRunning as any).mockResolvedValue(true);

    await activateAzurite(createContext({ showWarningMessage, showInputBox }), PROJECT_PATH);

    expect(updateGlobalSetting).toHaveBeenCalledWith(azuriteBinariesLocationSetting, defaultAzuritePathValue);
  });

  it('sets the default binaries location when the warning is off and autostart is on', async () => {
    mockSettings({ showWarning: false, autoStart: true, binariesLocation: undefined });
    (validateEmulatorIsRunning as any).mockResolvedValue(true);

    await activateAzurite(createContext(), PROJECT_PATH);

    expect(updateGlobalSetting).toHaveBeenCalledWith(azuriteBinariesLocationSetting, defaultAzuritePathValue);
    expect(executeOnAzurite).not.toHaveBeenCalled();
  });

  it('writes azurite.location to global settings, strips shared copies, and starts azurite (key path)', async () => {
    mockSettings({ showWarning: false, autoStart: true, binariesLocation: '/ext/azurite/loc' });
    // Not running initially (triggers start), then ready on the readiness poll so waitForAzuriteReady resolves.
    (validateEmulatorIsRunning as any).mockResolvedValueOnce(false).mockResolvedValue(true);
    const context = createContext();

    await activateAzurite(context, PROJECT_PATH);

    expect(updateGlobalSetting).toHaveBeenCalledWith(azuriteLocationSetting, '/ext/azurite/loc', azuriteExtensionPrefix);
    expect(removeSharedSetting).toHaveBeenCalledWith(azuriteLocationSetting, azuriteExtensionPrefix);
    expect(executeOnAzurite).toHaveBeenCalledWith(context, extensionCommand.azureAzuriteStart);
    expect(context.telemetry.properties.azuriteStart).toBe('true');
    expect(context.telemetry.properties.azuriteLocation).toBe('/ext/azurite/loc');
  });

  it('defaults the started azurite location when no ext location is configured', async () => {
    mockSettings({ showWarning: false, autoStart: true, binariesLocation: undefined });
    // Not running initially (triggers start), then ready on the readiness poll so waitForAzuriteReady resolves.
    (validateEmulatorIsRunning as any).mockResolvedValueOnce(false).mockResolvedValue(true);

    await activateAzurite(createContext(), PROJECT_PATH);

    expect(updateGlobalSetting).toHaveBeenCalledWith(azuriteLocationSetting, defaultAzuritePathValue, azuriteExtensionPrefix);
    expect(removeSharedSetting).toHaveBeenCalledWith(azuriteLocationSetting, azuriteExtensionPrefix);
    expect(executeOnAzurite).toHaveBeenCalled();
  });

  it('throws when azurite never becomes ready after being started (race-condition guard)', async () => {
    mockSettings({ showWarning: false, autoStart: true, binariesLocation: '/ext/azurite/loc' });
    // Never ready: first check triggers start, every readiness poll stays false -> waitForAzuriteReady rejects.
    (validateEmulatorIsRunning as any).mockResolvedValue(false);
    const context = createContext();

    await expect(activateAzurite(context, PROJECT_PATH)).rejects.toThrow(AZURITE_TIMEOUT_MESSAGE);
    expect(executeOnAzurite).toHaveBeenCalled();

    // Pin the shipped bounded-retry budget. Asserting the exported constants directly is what makes
    // the behavioural assertions below meaningful: without this, a mutation such as 10 -> 5 or
    // 500ms -> 0 (a busy-spin) would move the product and the expectations together and stay green.
    // If the budget is raised deliberately, update these two lines on purpose.
    expect(azuriteStartupRetryCount).toBe(10);
    expect(azuriteStartupRetryDelayMs).toBe(500);

    // 1 pre-start liveness check in activateAzurite + azuriteStartupRetryCount readiness polls.
    expect(validateEmulatorIsRunning).toHaveBeenCalledTimes(1 + azuriteStartupRetryCount);
    // Backoff sits *between* polls, so there is one fewer sleep than polls. Equality on mock.calls
    // pins both the count and the argument, so dropping the backoff (busy-spin) or varying it fails.
    expect(delay).toHaveBeenCalledTimes(azuriteStartupRetryCount - 1);
    expect(vi.mocked(delay).mock.calls).toEqual(Array.from({ length: azuriteStartupRetryCount - 1 }, () => [azuriteStartupRetryDelayMs]));
    expect(context.telemetry.properties.azuriteStartupAttempt).toBe(azuriteStartupRetryCount.toString());
    expect(context.telemetry.properties.azuriteReady).toBe('false');
  });

  it('resolves when azurite becomes ready on the final allowed attempt (off-by-one guard)', async () => {
    mockSettings({ showWarning: false, autoStart: true, binariesLocation: '/ext/azurite/loc' });
    // 1 pre-start check + (azuriteStartupRetryCount - 1) failing polls, then ready on the last
    // allowed poll. A slip from `attempt <= count` to `attempt < count` would never run that poll
    // and would reject instead.
    const readiness = validateEmulatorIsRunning as any;
    readiness.mockReset();
    for (let i = 0; i < azuriteStartupRetryCount; i++) {
      readiness.mockResolvedValueOnce(false);
    }
    readiness.mockResolvedValueOnce(true);
    readiness.mockResolvedValue(false);
    const context = createContext();

    await expect(activateAzurite(context, PROJECT_PATH)).resolves.toBeUndefined();

    expect(executeOnAzurite).toHaveBeenCalled();
    expect(validateEmulatorIsRunning).toHaveBeenCalledTimes(1 + azuriteStartupRetryCount);
    expect(delay).toHaveBeenCalledTimes(azuriteStartupRetryCount - 1);
    expect(context.telemetry.properties.azuriteStartupAttempt).toBe(azuriteStartupRetryCount.toString());
    expect(context.telemetry.properties.azuriteReady).toBe('true');
  });

  it('resolves when azurite.start rejects but the emulator is actually reachable (concurrent debug session)', async () => {
    mockSettings({ showWarning: false, autoStart: true, binariesLocation: '/ext/azurite/loc' });
    // The realistic concurrent-session shape: a healthy Azurite is already serving another project,
    // so the port is bound and the third-party extension rejects azurite.start. The start command is
    // NOT authoritative -- the readiness probe is. Failing the debug here would be the regression.
    (executeOnAzurite as any).mockRejectedValue(new Error(START_COMMAND_FAILURE));
    // Call 1 is the pre-start liveness check and must be false, otherwise we never attempt a start
    // and this path is not exercised at all. Call 2 is the readiness poll, which finds it serving.
    (validateEmulatorIsRunning as any).mockResolvedValueOnce(false).mockResolvedValue(true);
    const context = createContext();

    await expect(activateAzurite(context, PROJECT_PATH)).resolves.toBeUndefined();

    expect(executeOnAzurite).toHaveBeenCalledWith(context, extensionCommand.azureAzuriteStart);
    // The probe still ran after the start command blew up: 1 pre-start check + 1 readiness poll.
    expect(validateEmulatorIsRunning).toHaveBeenCalledTimes(2);
    expect(validateEmulatorIsRunning).toHaveBeenNthCalledWith(2, expect.anything(), PROJECT_PATH, {
      promptWarningMessage: false,
      azureWebJobsStorage: localEmulatorConnectionString,
    });
    expect(context.telemetry.properties.azuriteStart).toBe('false');
    expect(context.telemetry.properties.azuriteReady).toBe('true');
    // The failure is recorded rather than silently swallowed, so this stays diagnosable in telemetry.
    expect(context.telemetry.properties.azuriteStartError).toBe(START_COMMAND_FAILURE);
    // Ready on the first poll, so no backoff was needed.
    expect(delay).not.toHaveBeenCalled();
  });

  it('still reports the bounded readiness error, not the raw start error, when azurite.start rejects and the emulator never comes up', async () => {
    mockSettings({ showWarning: false, autoStart: true, binariesLocation: '/ext/azurite/loc' });
    (executeOnAzurite as any).mockRejectedValue(new Error(START_COMMAND_FAILURE));
    (validateEmulatorIsRunning as any).mockResolvedValue(false);
    const context = createContext();

    const error = await activateAzurite(context, PROJECT_PATH).catch((thrown) => thrown);

    // Phase 4.13B in CI asserts on the bounded readiness message. If the raw azurite.start rejection
    // escaped instead, that E2E assertion would break and the user would see a confusing
    // third-party error rather than the actionable one.
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatch(AZURITE_TIMEOUT_MESSAGE);
    expect(error.message).not.toContain(START_COMMAND_FAILURE);
    // Swallowing the start error must not short-circuit the retry budget either.
    expect(validateEmulatorIsRunning).toHaveBeenCalledTimes(1 + azuriteStartupRetryCount);
    expect(delay).toHaveBeenCalledTimes(azuriteStartupRetryCount - 1);
    expect(context.telemetry.properties.azuriteStart).toBe('false');
    expect(context.telemetry.properties.azuriteStartError).toBe(START_COMMAND_FAILURE);
    expect(context.telemetry.properties.azuriteReady).toBe('false');
  });

  it('reads AzureWebJobsStorage once while rechecking emulator readiness on each poll', async () => {
    mockSettings({ showWarning: false, autoStart: true, binariesLocation: '/ext/azurite/loc' });
    (validateEmulatorIsRunning as any)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await activateAzurite(createContext(), PROJECT_PATH);

    expect(getAzureWebJobsStorage).toHaveBeenCalledTimes(1);
    expect(validateEmulatorIsRunning).toHaveBeenCalledTimes(4);
    expect(validateEmulatorIsRunning).toHaveBeenNthCalledWith(1, expect.anything(), PROJECT_PATH, {
      promptWarningMessage: false,
      azureWebJobsStorage: localEmulatorConnectionString,
    });
    expect(validateEmulatorIsRunning).toHaveBeenNthCalledWith(2, expect.anything(), PROJECT_PATH, {
      promptWarningMessage: false,
      azureWebJobsStorage: localEmulatorConnectionString,
    });
    expect(validateEmulatorIsRunning).toHaveBeenNthCalledWith(3, expect.anything(), PROJECT_PATH, {
      promptWarningMessage: false,
      azureWebJobsStorage: localEmulatorConnectionString,
    });
    expect(validateEmulatorIsRunning).toHaveBeenNthCalledWith(4, expect.anything(), PROJECT_PATH, {
      promptWarningMessage: false,
      azureWebJobsStorage: localEmulatorConnectionString,
    });
  });

  it('enables autostart without prompting for a directory when an ext location already exists', async () => {
    mockSettings({ showWarning: true, autoStart: false, binariesLocation: '/ext/azurite/loc' });
    const showWarningMessage = vi.fn().mockImplementation((_title, enableMessage) => Promise.resolve(enableMessage));
    const showInputBox = vi.fn();
    (validateEmulatorIsRunning as any).mockResolvedValue(true);

    await activateAzurite(createContext({ showWarningMessage, showInputBox }), PROJECT_PATH);

    // The input box is skipped because a binaries location is already configured.
    expect(showInputBox).not.toHaveBeenCalled();
    expect(updateGlobalSetting).toHaveBeenCalledWith(showAutoStartAzuriteWarning, false);
  });

  it('does nothing to warning/autostart settings when the user dismisses the prompt', async () => {
    mockSettings({ showWarning: true, autoStart: false });
    const showWarningMessage = vi.fn().mockResolvedValue(dialogNo);
    (validateEmulatorIsRunning as any).mockResolvedValue(true);

    await activateAzurite(createContext({ showWarningMessage }), PROJECT_PATH);

    expect(updateGlobalSetting).not.toHaveBeenCalled();
    expect(executeOnAzurite).not.toHaveBeenCalled();
  });

  it('does not start azurite when it is already running', async () => {
    mockSettings({ showWarning: false, autoStart: true, binariesLocation: '/ext/azurite/loc' });
    (validateEmulatorIsRunning as any).mockResolvedValue(true);

    await activateAzurite(createContext(), PROJECT_PATH);

    expect(removeSharedSetting).not.toHaveBeenCalled();
    expect(executeOnAzurite).not.toHaveBeenCalled();
  });
});
