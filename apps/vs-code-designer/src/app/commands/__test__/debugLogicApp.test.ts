import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../../extensionVariables';
import { debugLogicApp } from '../debugLogicApp';
import { pickFuncProcessInternal } from '../pickFuncProcess';
import { tryGetLogicAppProjectRoot } from '../../utils/verifyIsProject';
import { pickCustomCodeNetFxWorkerProcessInternal, pickCustomCodeNetHostProcessInternal } from '../pickCustomCodeWorkerProcess';
import { openProjectOverviewForDebugInvocation } from '../workflows/projectOverview/openProjectOverview';
import { projectRuntimeRegistry } from '../../utils/funcCoreTools/projectRuntimeRegistry';

const terminationListeners: Array<(session: vscode.DebugSession) => void> = [];

vi.mock('vscode', () => ({
  debug: {
    startDebugging: vi.fn(),
    onDidTerminateDebugSession: vi.fn((listener) => {
      terminationListeners.push(listener);
      return { dispose: vi.fn() };
    }),
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

vi.mock('../workflows/projectOverview/openProjectOverview', () => ({
  openProjectOverviewForDebugInvocation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../utils/funcCoreTools/projectRuntimeRegistry', () => ({
  projectRuntimeRegistry: {
    createDebugInvocationId: vi.fn().mockReturnValue('project#debug-1'),
    cancelDebugInvocation: vi.fn(),
    endDebugInvocation: vi.fn(),
  },
}));

describe('debugLogicApp', () => {
  const workspaceFolder = { uri: { fsPath: 'D:/workspace/MyLogicApp' } } as vscode.WorkspaceFolder;
  let context: IActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    terminationListeners.length = 0;
    vi.mocked(projectRuntimeRegistry.createDebugInvocationId).mockReturnValue('project#debug-1');
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
    vi.mocked(openProjectOverviewForDebugInvocation).mockResolvedValue(undefined);
    vi.mocked(ext.outputChannel.appendLog).mockClear();
  });

  it('logs workflow attach attempts and results', async () => {
    await debugLogicApp(
      context,
      {
        type: 'logicapp',
        name: 'Run/Debug logic app MyLogicApp',
        request: 'launch',
        funcRuntime: 'coreclr',
        isCodeless: true,
      },
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
    expect(openProjectOverviewForDebugInvocation).toHaveBeenCalledWith(context, 'D:/workspace/MyLogicApp', 'project#debug-1');
  });

  it('starts a single debug session for codeful projects', async () => {
    await debugLogicApp(
      context,
      {
        type: 'logicapp',
        name: 'Run/Debug logic app MyLogicApp',
        request: 'launch',
        funcRuntime: 'coreclr',
        isCodeless: false,
      },
      workspaceFolder
    );

    expect(vscode.debug.startDebugging).toHaveBeenCalledTimes(1);
    expect(vscode.debug.startDebugging).toHaveBeenCalledWith(
      workspaceFolder,
      expect.objectContaining({
        name: 'Debug logic app MyLogicApp',
        type: 'coreclr',
        request: 'attach',
        processId: '1234',
      })
    );
    expect(pickCustomCodeNetHostProcessInternal).not.toHaveBeenCalled();
    expect(ext.outputChannel.appendLog).not.toHaveBeenCalledWith(expect.stringContaining('Skipping custom code debug attach'));
  });

  it('logs custom code attach attempts and results for coreclr', async () => {
    vi.mocked(pickCustomCodeNetHostProcessInternal).mockResolvedValue('5678');

    await debugLogicApp(
      context,
      {
        type: 'logicapp',
        name: 'Run/Debug logic app with local function MyLogicApp',
        request: 'launch',
        funcRuntime: 'coreclr',
        customCodeRuntime: 'coreclr',
        isCodeless: true,
      },
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
        type: 'logicapp',
        name: 'Run/Debug logic app with local function MyLogicApp',
        request: 'launch',
        funcRuntime: 'coreclr',
        customCodeRuntime: 'coreclr',
        isCodeless: true,
      },
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
        type: 'logicapp',
        name: 'Run/Debug logic app with local function MyLogicApp',
        request: 'launch',
        funcRuntime: 'coreclr',
        customCodeRuntime: 'clr',
        isCodeless: true,
      },
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

  describe('custom code dual-attach contract', () => {
    it('attaches to TWO DIFFERENT processes for coreclr custom code projects', async () => {
      vi.mocked(pickFuncProcessInternal).mockResolvedValue('1234');
      vi.mocked(pickCustomCodeNetHostProcessInternal).mockResolvedValue('5678');

      await debugLogicApp(
        context,
        {
          type: 'logicapp',
          name: 'Run/Debug logic app with local function MyLogicApp',
          request: 'launch',
          funcRuntime: 'coreclr',
          customCodeRuntime: 'coreclr',
          isCodeless: true,
        },
        workspaceFolder
      );

      expect(vscode.debug.startDebugging).toHaveBeenCalledTimes(2);

      const calls = vi.mocked(vscode.debug.startDebugging).mock.calls;
      const workflowProcessId = (calls[0][1] as vscode.DebugConfiguration).processId;
      const customCodeProcessId = (calls[1][1] as vscode.DebugConfiguration).processId;

      // The workflow and custom-code debuggers must attach to DIFFERENT processes.
      expect(workflowProcessId).toBe('1234');
      expect(customCodeProcessId).toBe('5678');
      expect(workflowProcessId).not.toBe(customCodeProcessId);
      expect(openProjectOverviewForDebugInvocation).toHaveBeenCalledTimes(1);
    });

    it('attaches to TWO DIFFERENT processes for clr (NetFx) custom code projects', async () => {
      vi.mocked(pickFuncProcessInternal).mockResolvedValue('1234');
      vi.mocked(pickCustomCodeNetFxWorkerProcessInternal).mockResolvedValue('9999');

      await debugLogicApp(
        context,
        {
          type: 'logicapp',
          name: 'Run/Debug logic app with local function MyLogicApp',
          request: 'launch',
          funcRuntime: 'coreclr',
          customCodeRuntime: 'clr',
          isCodeless: true,
        },
        workspaceFolder
      );

      expect(vscode.debug.startDebugging).toHaveBeenCalledTimes(2);

      const calls = vi.mocked(vscode.debug.startDebugging).mock.calls;
      const workflowProcessId = (calls[0][1] as vscode.DebugConfiguration).processId;
      const customCodeProcessId = (calls[1][1] as vscode.DebugConfiguration).processId;

      expect(workflowProcessId).toBe('1234');
      expect(customCodeProcessId).toBe('9999');
      expect(workflowProcessId).not.toBe(customCodeProcessId);
      expect(openProjectOverviewForDebugInvocation).toHaveBeenCalledTimes(1);
    });
  });

  it('suppresses the pending overview when a matching debug session terminates', async () => {
    let resolveOverview: (() => void) | undefined;
    vi.mocked(openProjectOverviewForDebugInvocation).mockReturnValue(
      new Promise<void>((resolve) => {
        resolveOverview = resolve;
      })
    );

    await debugLogicApp(
      context,
      {
        type: 'logicapp',
        name: 'Run/Debug logic app MyLogicApp',
        request: 'launch',
        funcRuntime: 'coreclr',
        isCodeless: true,
      },
      workspaceFolder
    );

    terminationListeners[0]({
      configuration: { logicAppsDebugInvocationId: 'project#debug-1' },
    } as vscode.DebugSession);
    expect(projectRuntimeRegistry.endDebugInvocation).toHaveBeenCalledWith('D:/workspace/MyLogicApp', 'project#debug-1');
    resolveOverview?.();
  });

  it('does not schedule an overview after a failed attach request', async () => {
    vi.mocked(vscode.debug.startDebugging).mockResolvedValue(false);

    await debugLogicApp(
      context,
      {
        type: 'logicapp',
        name: 'Run/Debug logic app MyLogicApp',
        request: 'launch',
        funcRuntime: 'coreclr',
        isCodeless: true,
      },
      workspaceFolder
    );

    expect(openProjectOverviewForDebugInvocation).not.toHaveBeenCalled();
    expect(projectRuntimeRegistry.endDebugInvocation).toHaveBeenCalledWith('D:/workspace/MyLogicApp', 'project#debug-1');
  });
});
