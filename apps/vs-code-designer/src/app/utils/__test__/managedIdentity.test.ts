/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ext } from '../../../extensionVariables';
import { suppressManagedIdentityAuthNotification } from '../../../constants';

vi.mock('vscode', () => ({
  window: {
    showInformationMessage: vi.fn(),
  },
  workspace: {
    workspaceFolders: undefined,
    getConfiguration: vi.fn(() => ({
      inspect: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    })),
  },
  ConfigurationTarget: { Global: 1 },
  Uri: { file: (p: string) => ({ fsPath: p }) },
}));

vi.mock('../vsCodeConfig/settings', () => ({
  isManagedIdentityAuthEnabled: vi.fn(),
  updateGlobalSetting: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../verifyIsProject', () => ({
  tryGetLogicAppProjectRoot: vi.fn(),
}));

vi.mock('../appSettings/localSettings', () => ({
  addOrUpdateLocalAppSettings: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../localize', () => ({
  localize: (_key: string, defaultValue: string) => defaultValue,
}));

import * as vscode from 'vscode';
import { isManagedIdentityAuthEnabled, updateGlobalSetting } from '../vsCodeConfig/settings';
import { tryGetLogicAppProjectRoot } from '../verifyIsProject';
import { addOrUpdateLocalAppSettings } from '../appSettings/localSettings';
import { promptManagedIdentityAuth } from '../managedIdentity';

describe('managedIdentity', () => {
  let globalStateGet: Mock;
  let globalStateUpdate: Mock;
  let appendLog: Mock;
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();

    globalStateGet = vi.fn();
    globalStateUpdate = vi.fn().mockResolvedValue(undefined);
    appendLog = vi.fn();

    (ext as any).context = {
      globalState: {
        get: globalStateGet,
        update: globalStateUpdate,
      },
    };
    (ext as any).outputChannel = { appendLog };
    (ext as any).prefix = 'azureLogicAppsStandard';

    mockContext = { telemetry: { properties: {} }, errorHandling: {} } as any;

    (vscode.workspace as any).workspaceFolders = undefined;
  });

  describe('promptManagedIdentityAuth', () => {
    it('returns early when notification is suppressed via globalState', async () => {
      globalStateGet.mockReturnValue(true);
      (isManagedIdentityAuthEnabled as Mock).mockReturnValue(false);

      await promptManagedIdentityAuth(mockContext);

      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('returns early when managed identity auth is already enabled', async () => {
      globalStateGet.mockReturnValue(false);
      (isManagedIdentityAuthEnabled as Mock).mockReturnValue(true);

      await promptManagedIdentityAuth(mockContext);

      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('shows information message when not suppressed and not enabled', async () => {
      globalStateGet.mockReturnValue(false);
      (isManagedIdentityAuthEnabled as Mock).mockReturnValue(false);
      (vscode.window.showInformationMessage as Mock).mockResolvedValue(undefined);

      await promptManagedIdentityAuth(mockContext);

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Managed identity authentication for local workflows is now supported.',
        'Enable',
        'Close',
        "Don't show again"
      );
    });

    it('enables setting and updates local settings when user clicks Enable', async () => {
      globalStateGet.mockReturnValue(false);
      (isManagedIdentityAuthEnabled as Mock).mockReturnValue(false);
      (vscode.window.showInformationMessage as Mock).mockResolvedValue('Enable');
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project1' } }];
      (tryGetLogicAppProjectRoot as Mock).mockResolvedValue('/project1');

      await promptManagedIdentityAuth(mockContext);

      expect(updateGlobalSetting).toHaveBeenCalledWith('enableManagedIdentityAuth', true);
      expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(mockContext, '/project1', {
        WORKFLOWS_AUTHENTICATION_METHOD: 'managedServiceIdentity',
      });
      expect(appendLog).toHaveBeenCalledWith('Managed identity authentication has been enabled for local workflows.');
    });

    it("suppresses notification when user clicks Don't show again", async () => {
      globalStateGet.mockReturnValue(false);
      (isManagedIdentityAuthEnabled as Mock).mockReturnValue(false);
      (vscode.window.showInformationMessage as Mock).mockResolvedValue("Don't show again");

      await promptManagedIdentityAuth(mockContext);

      expect(globalStateUpdate).toHaveBeenCalledWith(suppressManagedIdentityAuthNotification, true);
    });

    it('does nothing when user clicks Close', async () => {
      globalStateGet.mockReturnValue(false);
      (isManagedIdentityAuthEnabled as Mock).mockReturnValue(false);
      (vscode.window.showInformationMessage as Mock).mockResolvedValue('Close');

      await promptManagedIdentityAuth(mockContext);

      expect(updateGlobalSetting).not.toHaveBeenCalled();
      expect(globalStateUpdate).not.toHaveBeenCalled();
    });

    it('does nothing when user dismisses the notification', async () => {
      globalStateGet.mockReturnValue(false);
      (isManagedIdentityAuthEnabled as Mock).mockReturnValue(false);
      (vscode.window.showInformationMessage as Mock).mockResolvedValue(undefined);

      await promptManagedIdentityAuth(mockContext);

      expect(updateGlobalSetting).not.toHaveBeenCalled();
      expect(globalStateUpdate).not.toHaveBeenCalled();
    });

    it('updates local settings for multiple workspace folders', async () => {
      globalStateGet.mockReturnValue(false);
      (isManagedIdentityAuthEnabled as Mock).mockReturnValue(false);
      (vscode.window.showInformationMessage as Mock).mockResolvedValue('Enable');
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project1' } }, { uri: { fsPath: '/project2' } }];
      (tryGetLogicAppProjectRoot as Mock).mockResolvedValueOnce('/project1').mockResolvedValueOnce('/project2');

      await promptManagedIdentityAuth(mockContext);

      expect(addOrUpdateLocalAppSettings).toHaveBeenCalledTimes(2);
      expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(mockContext, '/project1', {
        WORKFLOWS_AUTHENTICATION_METHOD: 'managedServiceIdentity',
      });
      expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(mockContext, '/project2', {
        WORKFLOWS_AUTHENTICATION_METHOD: 'managedServiceIdentity',
      });
    });

    it('skips folders that are not Logic App projects', async () => {
      globalStateGet.mockReturnValue(false);
      (isManagedIdentityAuthEnabled as Mock).mockReturnValue(false);
      (vscode.window.showInformationMessage as Mock).mockResolvedValue('Enable');
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project1' } }, { uri: { fsPath: '/not-logic-app' } }];
      (tryGetLogicAppProjectRoot as Mock).mockResolvedValueOnce('/project1').mockResolvedValueOnce(undefined);

      await promptManagedIdentityAuth(mockContext);

      expect(addOrUpdateLocalAppSettings).toHaveBeenCalledTimes(1);
      expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(mockContext, '/project1', {
        WORKFLOWS_AUTHENTICATION_METHOD: 'managedServiceIdentity',
      });
    });

    it('does not throw when no workspace folders exist', async () => {
      globalStateGet.mockReturnValue(false);
      (isManagedIdentityAuthEnabled as Mock).mockReturnValue(false);
      (vscode.window.showInformationMessage as Mock).mockResolvedValue('Enable');
      (vscode.workspace as any).workspaceFolders = undefined;

      await expect(promptManagedIdentityAuth(mockContext)).resolves.toBeUndefined();
    });

    it('logs error and continues when updating a project fails', async () => {
      globalStateGet.mockReturnValue(false);
      (isManagedIdentityAuthEnabled as Mock).mockReturnValue(false);
      (vscode.window.showInformationMessage as Mock).mockResolvedValue('Enable');
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project1' } }, { uri: { fsPath: '/project2' } }];
      (tryGetLogicAppProjectRoot as Mock).mockRejectedValueOnce(new Error('Permission denied')).mockResolvedValueOnce('/project2');

      await promptManagedIdentityAuth(mockContext);

      expect(appendLog).toHaveBeenCalledWith(expect.stringContaining('Failed to update local.settings.json in /project1'));
      expect(appendLog).toHaveBeenCalledWith(expect.stringContaining('Permission denied'));
      expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(mockContext, '/project2', {
        WORKFLOWS_AUTHENTICATION_METHOD: 'managedServiceIdentity',
      });
    });
  });
});
