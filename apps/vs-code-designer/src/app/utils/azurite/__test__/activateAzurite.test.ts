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

vi.mock('../../../azuriteExtension/executeOnAzuriteExt', () => ({
  executeOnAzurite: vi.fn(),
}));

import * as vscode from 'vscode';
import { activateAzurite } from '../activateAzurite';
import { getWorkspaceSetting, updateGlobalSetting, removeSharedSetting } from '../../vsCodeConfig/settings';
import { getWorkspaceFolder } from '../../workspace';
import { tryGetLogicAppProjectRoot } from '../../verifyIsProject';
import { validateEmulatorIsRunning } from '../../../debug/validatePreDebug';
import { executeOnAzurite } from '../../../azuriteExtension/executeOnAzuriteExt';

const PROJECT_PATH = '/workspace/logicapp';

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
    (validateEmulatorIsRunning as any).mockResolvedValue(false);
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
    (validateEmulatorIsRunning as any).mockResolvedValue(false);
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
    (validateEmulatorIsRunning as any).mockResolvedValue(false);

    await activateAzurite(createContext(), PROJECT_PATH);

    expect(updateGlobalSetting).toHaveBeenCalledWith(azuriteLocationSetting, defaultAzuritePathValue, azuriteExtensionPrefix);
    expect(removeSharedSetting).toHaveBeenCalledWith(azuriteLocationSetting, azuriteExtensionPrefix);
    expect(executeOnAzurite).toHaveBeenCalled();
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
