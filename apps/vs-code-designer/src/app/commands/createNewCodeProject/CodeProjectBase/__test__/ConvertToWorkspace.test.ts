import { describe, it, expect, vi, beforeEach, test, afterEach } from 'vitest';
import { convertToWorkspace } from '../ConvertToWorkspace';
import * as vscode from 'vscode';
import * as workspaceUtils from '../../../../utils/workspace';
import * as verifyProject from '../../../../utils/verifyIsProject';
import * as funcCoreTools from '../../../../utils/funcCoreTools/funcVersion';
import * as settingsUtils from '../../../../utils/vsCodeConfig/settings';
import * as path from 'path';
import * as fse from 'fs-extra';
import * as azextUtils from '@microsoft/vscode-azext-utils';
import { FuncVersion } from '@microsoft/vscode-extension-logic-apps';
import { DialogResponses } from '@microsoft/vscode-azext-utils';
import { localize } from '../../../../../localize';
import { extensionCommand } from '../../../../../constants';

class MockDirent {
  constructor(
    public name: string,
    private _isDirectory: boolean
  ) {}
  isDirectory(): boolean {
    return this._isDirectory;
  }
}

vi.mock('../../../../utils/verifyIsProject', () => ({
  isLogicAppProject: vi.fn(),
  isLogicAppProjectInRoot: vi.fn(),
  tryGetLogicAppProjectRoot: vi.fn(),
}));

describe('convertToWorkspace', () => {
  const testWorkspaceName = 'TestWorkspace';
  const testWorkspaceFolder: vscode.WorkspaceFolder = {
    name: testWorkspaceName,
    uri: { fsPath: path.join('path', 'to', 'TestWorkspace') } as vscode.Uri,
    index: 0,
  };
  const testLogicAppName = 'LogicApp';
  const testWorkspaceFile = path.join(testWorkspaceFolder.uri.fsPath, `${testWorkspaceName}.code-workspace`);
  const mockAzureWizard = {
    prompt: vi.fn(),
    execute: vi.fn(),
  };
  let context: any;

  beforeEach(() => {
    context = {
      telemetry: { properties: {} },
    };
    vi.spyOn(funcCoreTools, 'addLocalFuncTelemetry').mockImplementation(() => {});
    vi.spyOn(settingsUtils, 'getGlobalSetting').mockReturnValue('4.0.5907');
    vi.spyOn(settingsUtils, 'getWorkspaceSetting').mockReturnValue(undefined);
    vi.spyOn(funcCoreTools, 'tryParseFuncVersion').mockReturnValue(FuncVersion.v4);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return undefined when workspace folder is not found', async () => {
    vi.spyOn(workspaceUtils, 'getWorkspaceFolder').mockResolvedValue(undefined);

    const result = await convertToWorkspace(context);
    expect(result).toBeUndefined();
  });

  it('should return undefined when project is not in root', async () => {
    vi.spyOn(workspaceUtils, 'getWorkspaceFolder').mockResolvedValue(testWorkspaceFolder);
    vi.spyOn(verifyProject, 'isLogicAppProjectInRoot').mockResolvedValue(false);

    const result = await convertToWorkspace(context);
    expect(result).toBeUndefined();
  });

  it('should return true when a valid workspace is already opened', async () => {
    vi.spyOn(workspaceUtils, 'getWorkspaceFolder').mockResolvedValue(testWorkspaceFolder);
    vi.spyOn(verifyProject, 'isLogicAppProjectInRoot').mockResolvedValue(true);
    vi.spyOn(workspaceUtils, 'getWorkspaceRoot').mockResolvedValue(path.dirname(testWorkspaceFile));

    const showInfoSpy = vi.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(DialogResponses.yes);
    const executeCommandSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);

    const result = await convertToWorkspace(context);

    expect(showInfoSpy).not.toHaveBeenCalled();
    expect(executeCommandSpy).not.toHaveBeenCalled();
    expect(context.telemetry.properties.isWorkspace).toBe('true');
    expect(result).toBe(true);
  });

  it('should prompt to create a workspace when no workspace is opened', async () => {
    vi.spyOn(workspaceUtils, 'getWorkspaceFolder').mockResolvedValue(testWorkspaceFolder);
    vi.spyOn(verifyProject, 'isLogicAppProjectInRoot').mockResolvedValue(true);
    vi.spyOn(workspaceUtils, 'getWorkspaceFile').mockResolvedValue(undefined);
    vi.spyOn(workspaceUtils, 'getWorkspaceRoot').mockResolvedValue(undefined);

    const showInfoSpy = vi.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(DialogResponses.yes);
    vi.spyOn(azextUtils, 'AzureWizard').mockImplementation(() => mockAzureWizard);

    const result = await convertToWorkspace(context);

    expect(showInfoSpy).toHaveBeenCalledWith(
      localize(
        'createContainingWorkspace',
        'Your logic app projects must exist inside a workspace to use the full functionality in the Azure Logic Apps (Standard) extension. Visual Studio Code will copy your projects to a new workspace. Do you want to create the workspace now?'
      ),
      { modal: true },
      DialogResponses.yes,
      DialogResponses.no
    );
    expect(mockAzureWizard.prompt).toHaveBeenCalledOnce();
    expect(mockAzureWizard.execute).toHaveBeenCalledOnce();
    expect(showInfoSpy).toHaveBeenCalledWith(localize('finishedConvertingWorkspace', 'Finished converting to workspace.'));
    expect(result).toBe(true);
  });

  it('should prompt to open existing workspace when a workspace file is found but not opened (from workspace root)', async () => {
    (vscode.workspace as any).workspaceFolders = [testWorkspaceFolder];
    (vscode.workspace as any).workspaceFile = undefined;
    const testLogicAppChildFolder = path.join(testWorkspaceFolder.uri.fsPath, testLogicAppName);

    vi.spyOn(verifyProject, 'isLogicAppProject').mockImplementation(async (p: string) => {
      return p === testLogicAppChildFolder;
    });
    vi.spyOn(verifyProject, 'tryGetLogicAppProjectRoot').mockImplementation(
      async (context: azextUtils.IActionContext, f: vscode.WorkspaceFolder | string | undefined, suppressPrompt: boolean | undefined) => {
        return f === testLogicAppChildFolder ? testLogicAppChildFolder : undefined;
      }
    );
    vi.spyOn(fse, 'readdir').mockImplementation(async (p: fse.PathLike) => {
      if (p === testWorkspaceFolder.uri.fsPath) {
        return [new MockDirent(testLogicAppName, true)];
      }
      return [];
    });
    vi.spyOn(fse, 'pathExists').mockImplementation(async (p: fse.PathLike) => {
      return p === testWorkspaceFolder.uri.fsPath || p === testLogicAppChildFolder;
    });
    const isLogicAppProjectInRootSpy = vi
      .spyOn(verifyProject, 'isLogicAppProjectInRoot')
      .mockImplementation(async (f: vscode.WorkspaceFolder | string | undefined) => {
        return f === testWorkspaceFolder || f === testLogicAppChildFolder;
      });
    // TODO - ideally we don't want to mock getWorkspaceFile/getWorkspaceRoot here
    vi.spyOn(workspaceUtils, 'getWorkspaceFile').mockResolvedValue(testWorkspaceFile);
    vi.spyOn(workspaceUtils, 'getWorkspaceRoot').mockResolvedValue(undefined);

    const showInfoSpy = vi.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(DialogResponses.yes);
    const executeCommandSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);

    const result = await convertToWorkspace(context);

    expect(isLogicAppProjectInRootSpy).toHaveBeenCalledWith(testLogicAppChildFolder);
    expect(showInfoSpy).toHaveBeenCalledWith(
      localize(
        'openContainingWorkspace',
        `You must open your workspace to use the full functionality in the Azure Logic Apps (Standard) extension. You can find the workspace with your logic app project at the following location: ${testWorkspaceFile}. Do you want to open this workspace now?`
      ),
      { modal: true },
      DialogResponses.yes,
      DialogResponses.no
    );
    expect(executeCommandSpy).toHaveBeenCalledWith(
      extensionCommand.vscodeOpenFolder,
      expect.objectContaining({ fsPath: testWorkspaceFile })
    );
    expect(result).toBe(true);
  });

  it('should prompt to open existing workspace when a workspace file is found but not opened (from logic app project root)', async () => {
    const testLogicAppWorkspaceFolder: vscode.WorkspaceFolder = {
      name: testLogicAppName,
      uri: { fsPath: path.join(testWorkspaceFolder.uri.fsPath, testLogicAppName) } as vscode.Uri,
      index: 0,
    } as vscode.WorkspaceFolder;
    (vscode.workspace as any).workspaceFolders = [testLogicAppWorkspaceFolder];
    (vscode.workspace as any).workspaceFile = undefined;

    vi.spyOn(verifyProject, 'isLogicAppProject').mockImplementation(async (p: string) => {
      return p === testLogicAppWorkspaceFolder.uri.fsPath;
    });
    const isLogicAppProjectInRootSpy = vi
      .spyOn(verifyProject, 'isLogicAppProjectInRoot')
      .mockImplementation(async (f: vscode.WorkspaceFolder | string | undefined) => {
        return f === testWorkspaceFolder || f === testLogicAppWorkspaceFolder;
      });
    vi.spyOn(workspaceUtils, 'getWorkspaceFile').mockResolvedValue(testWorkspaceFile);
    vi.spyOn(workspaceUtils, 'getWorkspaceRoot').mockResolvedValue(undefined);

    const showInfoSpy = vi.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(DialogResponses.yes);
    const executeCommandSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);

    const result = await convertToWorkspace(context);

    expect(isLogicAppProjectInRootSpy).toHaveBeenCalledWith(testLogicAppWorkspaceFolder);
    expect(showInfoSpy).toHaveBeenCalledWith(
      localize(
        'openContainingWorkspace',
        `You must open your workspace to use the full functionality in the Azure Logic Apps (Standard) extension. You can find the workspace with your logic app project at the following location: ${testWorkspaceFile}. Do you want to open this workspace now?`
      ),
      { modal: true },
      DialogResponses.yes,
      DialogResponses.no
    );
    expect(executeCommandSpy).toHaveBeenCalledWith(
      extensionCommand.vscodeOpenFolder,
      expect.objectContaining({ fsPath: testWorkspaceFile })
    );
    expect(result).toBe(true);
  });
});
