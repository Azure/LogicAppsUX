import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ensureWorkspace, createWorkspaceFile } from '../ensureWorkspace';
import * as vscode from 'vscode';
import * as workspaceUtils from '../../utils/workspace';
import * as verifyProject from '../../utils/verifyIsProject';
import * as funcCoreTools from '../../utils/funcCoreTools/funcVersion';
import * as settingsUtils from '../../utils/vsCodeConfig/settings';
import * as path from 'path';
import * as fse from 'fs-extra';
import * as workspaceWebviewCommandHandler from '../shared/workspaceWebviewCommandHandler';
import { FuncVersion } from '@microsoft/vscode-extension-logic-apps';
import { DialogResponses } from '@microsoft/vscode-azext-utils';
import { localize } from '../../../localize';
import { vscodeCommand } from '../../../constants';
import { WorkspaceWebviewCommandConfig } from '../shared/workspaceWebviewCommandHandler';

class MockDirent {
  constructor(
    public name: string,
    private _isDirectory: boolean
  ) {}
  isDirectory(): boolean {
    return this._isDirectory;
  }
}

vi.mock('../../utils/verifyIsProject', () => ({
  isLogicAppProject: vi.fn(),
  tryGetLogicAppProjectRoot: vi.fn(),
}));

vi.mock('../shared/workspaceWebviewCommandHandler', () => ({
  createWorkspaceWebviewCommandHandler: vi.fn(),
}));

vi.mock('fs-extra', async (importOriginal) => {
  const original = await importOriginal<typeof fse>();
  return {
    ...original,
    writeJson: vi.fn(),
    copy: vi.fn(),
    ensureDir: vi.fn(),
    readdir: vi.fn(),
    pathExists: vi.fn(),
  };
});

describe('ensureWorkspace', () => {
  const testWorkspaceName = 'TestWorkspace';
  const testWorkspaceFolder: vscode.WorkspaceFolder = {
    name: testWorkspaceName,
    uri: { fsPath: path.join('path', 'to', 'TestWorkspace') } as vscode.Uri,
    index: 0,
  };
  const testLogicAppName = 'LogicApp';
  const testWorkspaceFile = path.join(testWorkspaceFolder.uri.fsPath, `${testWorkspaceName}.code-workspace`);
  let context: any;

  beforeEach(() => {
    context = {
      telemetry: {
        properties: {},
        measurements: {},
      },
    };
    vi.spyOn(funcCoreTools, 'addLocalFuncTelemetry').mockImplementation(() => {});
    vi.spyOn(settingsUtils, 'getGlobalSetting').mockReturnValue('4.0.5907');
    vi.spyOn(settingsUtils, 'getWorkspaceSetting').mockReturnValue(undefined);
    vi.spyOn(funcCoreTools, 'tryParseFuncVersion').mockReturnValue(FuncVersion.v4);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return undefined when project is not in root', async () => {
    vi.spyOn(workspaceUtils, 'hasLogicAppInWorkspace').mockResolvedValue(false);

    const result = await ensureWorkspace(context);
    expect(result).toBe(false);
  });

  it('should return true when a valid workspace is already opened', async () => {
    vi.spyOn(workspaceUtils, 'hasLogicAppInWorkspace').mockResolvedValue(true);
    vi.spyOn(workspaceUtils, 'getWorkspaceFilePath').mockResolvedValue(testWorkspaceFile);
    const showInfoSpy = vi.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(DialogResponses.yes);
    const executeCommandSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);

    const result = await ensureWorkspace(context);

    expect(showInfoSpy).not.toHaveBeenCalled();
    expect(executeCommandSpy).not.toHaveBeenCalled();
    expect(context.telemetry.properties.isWorkspace).toBe('true');
    expect(result).toBe(true);
  });

  it('should prompt to create a workspace when no workspace is opened', async () => {
    vi.spyOn(workspaceUtils, 'hasLogicAppInWorkspace').mockResolvedValue(true);
    vi.spyOn(workspaceUtils, 'getWorkspaceFilePath').mockResolvedValue(undefined);
    vi.spyOn(workspaceUtils, 'getWorkspaceFilePathInParent').mockResolvedValue(undefined);
    const workspaceWebviewCommandHandlerSpy = vi
      .spyOn(workspaceWebviewCommandHandler, 'createWorkspaceWebviewCommandHandler')
      .mockImplementation(async (config: WorkspaceWebviewCommandConfig) => {
        config.onResolve?.(true);
      });

    const showInfoSpy = vi.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(DialogResponses.yes);

    const result = await ensureWorkspace(context);

    expect(showInfoSpy).toHaveBeenCalledWith(
      localize(
        'createContainingWorkspace',
        'Your logic app projects must exist inside a workspace to use the full functionality in the Azure Logic Apps (Standard) extension. Visual Studio Code will copy your projects to a new workspace. Do you want to create the workspace now?'
      ),
      { modal: true },
      DialogResponses.yes,
      DialogResponses.no
    );
    expect(workspaceWebviewCommandHandlerSpy).toHaveBeenCalledOnce();
    expect(result).toBe(true);
  });

  it('should prompt to open existing workspace when a workspace file is found but not opened (from workspace root)', async () => {
    (vscode.workspace as any).workspaceFolders = [testWorkspaceFolder];
    (vscode.workspace as any).workspaceFile = undefined;

    vi.spyOn(workspaceUtils, 'hasLogicAppInWorkspace').mockResolvedValue(true);
    // TODO - ideally we don't want to mock getWorkspaceFilePathInParent here
    vi.spyOn(workspaceUtils, 'getWorkspaceFilePath').mockResolvedValue(undefined);
    vi.spyOn(workspaceUtils, 'getWorkspaceFilePathInParent').mockResolvedValue(testWorkspaceFile);

    const showInfoSpy = vi.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(DialogResponses.yes);
    const executeCommandSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);

    const result = await ensureWorkspace(context);

    expect(showInfoSpy).toHaveBeenCalledWith(
      localize(
        'openContainingWorkspace',
        `You must open your workspace to use the full functionality in the Azure Logic Apps (Standard) extension. You can find the workspace with your logic app project at the following location: ${testWorkspaceFile}. Do you want to open this workspace now?`
      ),
      { modal: true },
      DialogResponses.yes,
      DialogResponses.no
    );
    expect(executeCommandSpy).toHaveBeenCalledWith(vscodeCommand.openFolder, expect.objectContaining({ fsPath: testWorkspaceFile }));
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
    vi.spyOn(workspaceUtils, 'hasLogicAppInWorkspace').mockResolvedValue(true);
    vi.spyOn(workspaceUtils, 'getWorkspaceFilePath').mockResolvedValue(undefined);
    vi.spyOn(workspaceUtils, 'getWorkspaceFilePathInParent').mockResolvedValue(testWorkspaceFile);

    const showInfoSpy = vi.spyOn(vscode.window, 'showInformationMessage').mockResolvedValue(DialogResponses.yes);
    const executeCommandSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);

    const result = await ensureWorkspace(context);

    expect(showInfoSpy).toHaveBeenCalledWith(
      localize(
        'openContainingWorkspace',
        `You must open your workspace to use the full functionality in the Azure Logic Apps (Standard) extension. You can find the workspace with your logic app project at the following location: ${testWorkspaceFile}. Do you want to open this workspace now?`
      ),
      { modal: true },
      DialogResponses.yes,
      DialogResponses.no
    );
    expect(executeCommandSpy).toHaveBeenCalledWith(vscodeCommand.openFolder, expect.objectContaining({ fsPath: testWorkspaceFile }));
    expect(result).toBe(true);
  });
});

describe('createWorkspaceFile', () => {
  let context: any;

  beforeEach(() => {
    context = {
      telemetry: {
        properties: {},
        measurements: {},
      },
    };
    vi.spyOn(funcCoreTools, 'addLocalFuncTelemetry').mockImplementation(() => {});
    vi.mocked(fse.writeJson).mockResolvedValue(undefined);
    vi.mocked(fse.copy).mockResolvedValue(undefined);
    vi.mocked(fse.ensureDir).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('in-place Logic App root: writes .code-workspace without copying', async () => {
    const projectPath = path.resolve('/users/dev/MyLogicApp');
    (vscode.workspace as any).workspaceFolders = [{ name: 'MyLogicApp', uri: { fsPath: projectPath } as vscode.Uri, index: 0 }];
    vi.spyOn(verifyProject, 'isLogicAppProject').mockResolvedValue(true);
    const executeCommandSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);

    await createWorkspaceFile(context, {
      workspaceProjectPath: { fsPath: path.dirname(projectPath), path: path.dirname(projectPath) },
      workspaceName: 'MyLogicApp',
    });

    expect(fse.copy).not.toHaveBeenCalled();
    expect(fse.writeJson).toHaveBeenCalledWith(
      path.join(projectPath, 'MyLogicApp.code-workspace'),
      { folders: [{ name: 'MyLogicApp', path: '.' }] },
      { spaces: 2 }
    );
    expect(executeCommandSpy).toHaveBeenCalledWith(
      vscodeCommand.openFolder,
      expect.objectContaining({ fsPath: path.join(projectPath, 'MyLogicApp.code-workspace') }),
      true
    );
  });

  it('in-place container with child directories: lists children without copying', async () => {
    const containerPath = path.resolve('/users/dev/workspace-root');
    (vscode.workspace as any).workspaceFolders = [{ name: 'workspace-root', uri: { fsPath: containerPath } as vscode.Uri, index: 0 }];
    vi.spyOn(verifyProject, 'isLogicAppProject').mockResolvedValue(false);
    vi.mocked(fse.readdir).mockResolvedValue([
      new MockDirent('app1', true),
      new MockDirent('app2', true),
      new MockDirent('readme.md', false),
    ] as any);
    const executeCommandSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);

    await createWorkspaceFile(context, {
      workspaceProjectPath: { fsPath: path.dirname(containerPath), path: path.dirname(containerPath) },
      workspaceName: 'workspace-root',
    });

    expect(fse.copy).not.toHaveBeenCalled();
    expect(fse.writeJson).toHaveBeenCalledWith(
      path.join(containerPath, 'workspace-root.code-workspace'),
      {
        folders: [
          { name: 'app1', path: './app1' },
          { name: 'app2', path: './app2' },
        ],
      },
      { spaces: 2 }
    );
    expect(executeCommandSpy).toHaveBeenCalled();
  });

  it('external copy: copies project to new location', async () => {
    const currentPath = path.resolve('/users/dev/MyLogicApp');
    const externalParent = path.resolve('/users/workspaces');
    const externalDest = path.join(externalParent, 'NewWorkspace');

    (vscode.workspace as any).workspaceFolders = [{ name: 'MyLogicApp', uri: { fsPath: currentPath } as vscode.Uri, index: 0 }];
    vi.spyOn(verifyProject, 'isLogicAppProject').mockResolvedValue(true);
    const executeCommandSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);

    await createWorkspaceFile(context, {
      workspaceProjectPath: { fsPath: externalParent, path: externalParent },
      workspaceName: 'NewWorkspace',
    });

    expect(fse.ensureDir).toHaveBeenCalledWith(externalDest);
    expect(fse.copy).toHaveBeenCalledWith(currentPath, path.join(externalDest, 'MyLogicApp'));
    expect(fse.writeJson).toHaveBeenCalledWith(
      path.join(externalDest, 'NewWorkspace.code-workspace'),
      { folders: [{ name: 'MyLogicApp', path: './MyLogicApp' }] },
      { spaces: 2 }
    );
    expect(executeCommandSpy).toHaveBeenCalled();
  });

  it('descendant rejection: throws when workspace target is inside current folder', async () => {
    const currentPath = path.resolve('/users/dev/MyLogicApp');
    (vscode.workspace as any).workspaceFolders = [{ name: 'MyLogicApp', uri: { fsPath: currentPath } as vscode.Uri, index: 0 }];

    await expect(
      createWorkspaceFile(context, {
        workspaceProjectPath: { fsPath: currentPath, path: currentPath },
        workspaceName: 'subdir',
      })
    ).rejects.toThrow(/inside the currently open folder/);
  });
});
