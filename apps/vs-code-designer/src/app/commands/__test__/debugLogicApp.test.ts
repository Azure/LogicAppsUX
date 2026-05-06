import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../../extensionVariables';
import { debugLogicApp } from '../debugLogicApp';
import { pickFuncProcessInternal } from '../pickFuncProcess';
import { tryGetLogicAppProjectRoot } from '../../utils/verifyIsProject';
import { pickCustomCodeNetFxWorkerProcessInternal, pickCustomCodeNetHostProcessInternal } from '../pickCustomCodeWorkerProcess';

vi.mock('vscode', () => ({
  debug: {
    startDebugging: vi.fn(),
  },
  workspace: {
    getWorkspaceFolder: vi.fn(),
  },
  Uri: {
    file: (fsPath: string) => ({ fsPath }),
  },
}));

vi.mock('../pickFuncProcess', () => ({
  pickFuncProcessInternal: vi.fn(),
}));

vi.mock('../../utils/verifyIsProject', () => ({
  tryGetLogicAppProjectRoot: vi.fn(),
}));

vi.mock('../pickCustomCodeWorkerProcess', () => ({
  pickCustomCodeNetFxWorkerProcessInternal: vi.fn(),
  pickCustomCodeNetHostProcessInternal: vi.fn(),
}));

describe('debugLogicApp', () => {
  const workspaceFolder = { uri: { fsPath: 'D:/workspace/MyLogicApp' } } as vscode.WorkspaceFolder;
  let context: IActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    context = {
      telemetry: {
        properties: {},
        measurements: {},
      },
      errorHandling: {},
      ui: {},
      valuesToMask: [],
    } as any;
    vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue('D:/workspace/MyLogicApp');
    vi.mocked(pickFuncProcessInternal).mockResolvedValue('1234');
    vi.mocked(vscode.debug.startDebugging).mockResolvedValue(true);
    vi.mocked(ext.outputChannel.appendLog).mockClear();
  });

  it('logs workflow attach attempts and results', async () => {
    await debugLogicApp(
      context,
      {
        funcRuntime: 'coreclr',
        isCodeless: true,
      } as vscode.DebugConfiguration,
      workspaceFolder
    );

    expect(vscode.debug.startDebugging).toHaveBeenCalledWith(
      workspaceFolder,
      expect.objectContaining({
        name: 'Debug logic app MyLogicApp',
        type: 'coreclr',
        request: 'attach',
        processId: '1234',
      })
    );
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(expect.stringContaining('Starting logic app debug attach for "MyLogicApp"'));
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(expect.stringContaining('Attempting workflow debug attach for "MyLogicApp"'));
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      expect.stringContaining('Workflow debug attach request for "MyLogicApp" completed with result "true"')
    );
  });

  it('logs custom code attach attempts and results for coreclr', async () => {
    vi.mocked(pickCustomCodeNetHostProcessInternal).mockResolvedValue('5678');

    await debugLogicApp(
      context,
      {
        funcRuntime: 'coreclr',
        customCodeRuntime: 'coreclr',
        isCodeless: true,
      } as vscode.DebugConfiguration,
      workspaceFolder
    );

    expect(vscode.debug.startDebugging).toHaveBeenNthCalledWith(
      2,
      workspaceFolder,
      expect.objectContaining({
        name: 'Debug local function',
        type: 'coreclr',
        request: 'attach',
        processId: '5678',
      })
    );
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      expect.stringContaining('Attempting custom code debug attach for "MyLogicApp"')
    );
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      expect.stringContaining('Custom code debug attach request for "MyLogicApp" completed with result "true"')
    );
  });

  it('logs when custom code attach is skipped because no worker process is found', async () => {
    vi.mocked(pickCustomCodeNetHostProcessInternal).mockResolvedValue(undefined);

    await debugLogicApp(
      context,
      {
        funcRuntime: 'coreclr',
        customCodeRuntime: 'coreclr',
        isCodeless: true,
      } as vscode.DebugConfiguration,
      workspaceFolder
    );

    expect(vscode.debug.startDebugging).toHaveBeenCalledTimes(1);
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      expect.stringContaining('Skipping custom code debug attach for "MyLogicApp" because no custom code worker process was found.')
    );
  });

  it('logs custom code attach attempts for clr', async () => {
    vi.mocked(pickCustomCodeNetFxWorkerProcessInternal).mockResolvedValue('9012');

    await debugLogicApp(
      context,
      {
        funcRuntime: 'coreclr',
        customCodeRuntime: 'clr',
        isCodeless: true,
      } as vscode.DebugConfiguration,
      workspaceFolder
    );

    expect(vscode.debug.startDebugging).toHaveBeenNthCalledWith(
      2,
      workspaceFolder,
      expect.objectContaining({
        name: 'Debug local function',
        type: 'clr',
        request: 'attach',
        processId: '9012',
      })
    );
  });
});
