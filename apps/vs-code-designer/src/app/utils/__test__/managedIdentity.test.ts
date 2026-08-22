/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ext } from '../../../extensionVariables';

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: undefined,
  },
  Uri: { file: (p: string) => ({ fsPath: p }) },
}));

vi.mock('../vsCodeConfig/settings', () => ({
  updateGlobalSetting: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../workspace', () => ({
  getWorkspaceLogicAppRoots: vi.fn(),
}));

vi.mock('../appSettings/localSettings', () => ({
  addOrUpdateLocalAppSettings: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('fs-extra', () => ({
  pathExists: vi.fn(),
}));

vi.mock('../../../localize', () => ({
  localize: (_key: string, defaultValue: string, ...args: string[]) =>
    defaultValue.replace(/\{(\d+)\}/g, (_match, index) => args[Number(index)] ?? ''),
}));

import * as fse from 'fs-extra';
import * as vscode from 'vscode';
import { updateGlobalSetting } from '../vsCodeConfig/settings';
import { getWorkspaceLogicAppRoots } from '../workspace';
import { addOrUpdateLocalAppSettings } from '../appSettings/localSettings';
import { enableLocalManagedIdentityAuth } from '../managedIdentity';

describe('managedIdentity', () => {
  let appendLog: Mock;
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    appendLog = vi.fn();
    (ext as any).outputChannel = { appendLog };
    mockContext = { telemetry: { properties: {} }, errorHandling: {} } as any;
    (vscode.workspace as any).workspaceFolders = undefined;
    vi.mocked(getWorkspaceLogicAppRoots).mockResolvedValue([]);
    (fse.pathExists as Mock).mockResolvedValue(false);
  });

  describe('enableLocalManagedIdentityAuth', () => {
    it('enables the global setting and logs success', async () => {
      (vscode.workspace as any).workspaceFolders = undefined;

      await enableLocalManagedIdentityAuth(mockContext);

      expect(updateGlobalSetting).toHaveBeenCalledWith('enableManagedIdentityAuth', true);
      expect(appendLog).toHaveBeenCalledWith('Managed identity authentication has been enabled for local workflows.');
    });

    it('updates local settings for multiple workspace folders', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project1' } }, { uri: { fsPath: '/project2' } }];
      vi.mocked(getWorkspaceLogicAppRoots).mockResolvedValue(['/project1', '/project2']);

      await enableLocalManagedIdentityAuth(mockContext);

      expect(addOrUpdateLocalAppSettings).toHaveBeenCalledTimes(2);
      expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(mockContext, '/project1', {
        WORKFLOWS_AUTHENTICATION_METHOD: 'managedServiceIdentity',
      });
      expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(mockContext, '/project2', {
        WORKFLOWS_AUTHENTICATION_METHOD: 'managedServiceIdentity',
      });
    });

    it('skips folders that are not Logic App projects', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project1' } }, { uri: { fsPath: '/not-logic-app' } }];
      vi.mocked(getWorkspaceLogicAppRoots).mockResolvedValue(['/project1']);

      await enableLocalManagedIdentityAuth(mockContext);

      expect(addOrUpdateLocalAppSettings).toHaveBeenCalledTimes(1);
      expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(mockContext, '/project1', {
        WORKFLOWS_AUTHENTICATION_METHOD: 'managedServiceIdentity',
      });
    });

    it('does not throw when no workspace folders exist', async () => {
      (vscode.workspace as any).workspaceFolders = undefined;

      await expect(enableLocalManagedIdentityAuth(mockContext)).resolves.toBeUndefined();
    });

    it('logs error and continues when updating a project fails', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project1' } }, { uri: { fsPath: '/project2' } }];
      vi.mocked(getWorkspaceLogicAppRoots).mockResolvedValue(['/project1', '/project2']);
      (addOrUpdateLocalAppSettings as Mock).mockImplementation((_: unknown, projectPath: string) => {
        if (projectPath === '/project1') {
          return Promise.reject(new Error('Permission denied'));
        }
        return Promise.resolve(undefined);
      });

      await enableLocalManagedIdentityAuth(mockContext);

      expect(appendLog).toHaveBeenCalledWith(expect.stringContaining('Failed to update local.settings.json in /project1'));
      expect(appendLog).toHaveBeenCalledWith(expect.stringContaining('Permission denied'));
      expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(mockContext, '/project2', {
        WORKFLOWS_AUTHENTICATION_METHOD: 'managedServiceIdentity',
      });
    });

    it('also updates the design-time directory when it exists', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project1' } }];
      vi.mocked(getWorkspaceLogicAppRoots).mockResolvedValue(['/project1']);
      (fse.pathExists as Mock).mockResolvedValue(true);

      await enableLocalManagedIdentityAuth(mockContext);

      expect(addOrUpdateLocalAppSettings).toHaveBeenCalledTimes(2);
      expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(mockContext, '/project1', {
        WORKFLOWS_AUTHENTICATION_METHOD: 'managedServiceIdentity',
      });
      expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(
        mockContext,
        expect.stringContaining('workflow-designtime'),
        { WORKFLOWS_AUTHENTICATION_METHOD: 'managedServiceIdentity' },
        true
      );
    });

    it('skips design-time directory update when it does not exist', async () => {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/project1' } }];
      vi.mocked(getWorkspaceLogicAppRoots).mockResolvedValue(['/project1']);
      (fse.pathExists as Mock).mockResolvedValue(false);

      await enableLocalManagedIdentityAuth(mockContext);

      expect(addOrUpdateLocalAppSettings).toHaveBeenCalledTimes(1);
      expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(mockContext, '/project1', {
        WORKFLOWS_AUTHENTICATION_METHOD: 'managedServiceIdentity',
      });
    });
  });
});
