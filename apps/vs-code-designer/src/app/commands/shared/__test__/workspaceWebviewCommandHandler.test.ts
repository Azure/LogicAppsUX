import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import * as vscode from 'vscode';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import { cacheWebviewPanel, removeWebviewPanelFromCache, tryGetWebviewPanel } from '../../../utils/codeless/common';
import { getWebViewHTML } from '../../../utils/codeless/getWebViewHTML';
import { createWorkspaceWebviewCommandHandler } from '../workspaceWebviewCommandHandler';

vi.mock('vscode', () => ({
  ViewColumn: { Active: 1 },
  Uri: { file: vi.fn((filePath: string) => ({ fsPath: filePath })) },
  window: {
    createWebviewPanel: vi.fn(),
    showOpenDialog: vi.fn(),
  },
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  callWithTelemetryAndErrorHandling: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
}));

vi.mock('../../../../extensionVariables', () => ({
  ext: {
    extensionVersion: '1.0.0',
    context: {
      extensionPath: '/extension',
      subscriptions: [],
    },
  },
}));

vi.mock('../../../utils/codeless/common', () => ({
  cacheWebviewPanel: vi.fn(),
  removeWebviewPanelFromCache: vi.fn(),
  tryGetWebviewPanel: vi.fn(),
}));

vi.mock('../../../utils/codeless/getWebViewHTML', () => ({
  getWebViewHTML: vi.fn(),
}));

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultValue: string) => defaultValue,
}));

interface MockPanel {
  webview: {
    html: string;
    onDidReceiveMessage: ReturnType<typeof vi.fn>;
    postMessage: ReturnType<typeof vi.fn>;
  };
  onDidDispose: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  iconPath?: unknown;
  active?: boolean;
  reveal?: ReturnType<typeof vi.fn>;
}

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

describe('createWorkspaceWebviewCommandHandler', () => {
  let panel: MockPanel;
  let receivedMessageHandler: ((message: any) => Promise<void>) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    receivedMessageHandler = undefined;
    panel = {
      webview: {
        html: '',
        onDidReceiveMessage: vi.fn((handler: (message: any) => Promise<void>) => {
          receivedMessageHandler = handler;
        }),
        postMessage: vi.fn(),
      },
      onDidDispose: vi.fn(),
      dispose: vi.fn(),
    };

    vi.mocked(tryGetWebviewPanel).mockReturnValue(undefined);
    vi.mocked(getWebViewHTML).mockResolvedValue('<html></html>');
    vi.mocked(vscode.window.createWebviewPanel).mockReturnValue(panel as any);
    vi.mocked(callWithTelemetryAndErrorHandling).mockImplementation(async (_eventName, callback: any) => {
      try {
        await callback({ telemetry: { properties: {}, measurements: {} } });
      } catch {
        // Match the extension helper behavior: errors are reported through telemetry and not rethrown.
      }
    });
  });

  async function createHandlerHarness(createHandler = vi.fn().mockResolvedValue(undefined), onResolve = vi.fn()) {
    await createWorkspaceWebviewCommandHandler({
      panelName: 'Create Workspace',
      panelGroupKey: 'workspace',
      projectName: 'LogicApp',
      createCommand: ExtensionCommand.createWorkspaceStructure,
      createHandler,
      onResolve,
    });

    expect(receivedMessageHandler).toBeDefined();
    return { createHandler, onResolve, sendMessage: receivedMessageHandler as (message: any) => Promise<void> };
  }

  it('posts initialization data to the webview', async () => {
    const { sendMessage } = await createHandlerHarness();

    await sendMessage({ command: ExtensionCommand.initialize });

    expect(panel.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: ExtensionCommand.initialize_frame,
        data: expect.objectContaining({
          project: 'LogicApp',
          hostVersion: '1.0.0',
        }),
      })
    );
    expect(cacheWebviewPanel).toHaveBeenCalledWith('workspace', 'Create Workspace', panel);
  });

  it('reveals an existing panel instead of creating another one', async () => {
    const reveal = vi.fn();
    vi.mocked(tryGetWebviewPanel).mockReturnValue({ active: false, reveal } as any);

    await createWorkspaceWebviewCommandHandler({
      panelName: 'Create Workspace',
      panelGroupKey: 'workspace',
      projectName: 'LogicApp',
      createCommand: ExtensionCommand.createWorkspaceStructure,
      createHandler: vi.fn(),
    });

    expect(reveal).toHaveBeenCalledWith(vscode.ViewColumn.Active);
    expect(vscode.window.createWebviewPanel).not.toHaveBeenCalled();
  });

  it('ignores duplicate create messages while creation is in progress', async () => {
    const deferred = createDeferred();
    const createHandler = vi.fn().mockReturnValue(deferred.promise);
    const { sendMessage } = await createHandlerHarness(createHandler);

    const firstCreate = sendMessage({ command: ExtensionCommand.createWorkspaceStructure, data: { workspaceName: 'one' } });
    const secondCreate = sendMessage({ command: ExtensionCommand.createWorkspaceStructure, data: { workspaceName: 'one' } });

    expect(createHandler).toHaveBeenCalledTimes(1);
    deferred.resolve();
    await Promise.all([firstCreate, secondCreate]);
    expect(panel.dispose).toHaveBeenCalledTimes(1);
  });

  it('resets the in-progress guard after a failed create so the user can retry', async () => {
    const createHandler = vi.fn().mockRejectedValueOnce(new Error('create failed')).mockResolvedValueOnce(undefined);
    const onResolve = vi.fn();
    const { sendMessage } = await createHandlerHarness(createHandler, onResolve);

    await sendMessage({ command: ExtensionCommand.createWorkspaceStructure, data: { workspaceName: 'one' } });
    await sendMessage({ command: ExtensionCommand.createWorkspaceStructure, data: { workspaceName: 'one' } });

    expect(createHandler).toHaveBeenCalledTimes(2);
    expect(onResolve).toHaveBeenCalledWith(true);
    expect(panel.dispose).toHaveBeenCalledTimes(1);
  });

  it('removes the cached panel when disposed', async () => {
    await createHandlerHarness();
    const disposeHandler = vi.mocked(panel.onDidDispose).mock.calls[0][0];

    disposeHandler();

    expect(removeWebviewPanelFromCache).toHaveBeenCalledWith('workspace', 'Create Workspace');
  });

  it('posts folder and package selections back to the webview', async () => {
    const { sendMessage } = await createHandlerHarness();
    vi.mocked(vscode.window.showOpenDialog)
      .mockResolvedValueOnce([{ fsPath: 'C:\\workspace', path: '/workspace' }] as any)
      .mockResolvedValueOnce([{ fsPath: 'C:\\Downloads\\package.zip', path: '/Downloads/package.zip' }] as any);

    await sendMessage({ command: ExtensionCommand.select_folder });
    await sendMessage({ command: ExtensionCommand.update_package_path });

    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.update_workspace_path,
      data: {
        targetDirectory: {
          fsPath: 'C:\\workspace',
          path: '/workspace',
        },
      },
    });
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.update_package_path,
      data: {
        targetDirectory: {
          fsPath: 'C:\\Downloads\\package.zip',
          path: '/Downloads/package.zip',
        },
      },
    });
  });

  it('validates folder, file, package, and invalid paths', async () => {
    const fs = await import('fs');
    const { sendMessage } = await createHandlerHarness();
    vi.mocked(fs.existsSync).mockImplementation((pathToValidate: any) => pathToValidate !== 'missing');
    vi.mocked(fs.statSync).mockImplementation((pathToValidate: any) => {
      const value = String(pathToValidate);
      return {
        isDirectory: () => value.includes('folder'),
        isFile: () => value.includes('file') || value.includes('package'),
      } as any;
    });

    await sendMessage({
      command: ExtensionCommand.validatePath,
      data: { path: 'C:\\folder', type: ExtensionCommand.workspace_folder },
    });
    await sendMessage({
      command: ExtensionCommand.validatePath,
      data: { path: 'C:\\file.workflow', type: ExtensionCommand.workspace_file },
    });
    await sendMessage({
      command: ExtensionCommand.validatePath,
      data: { path: 'C:\\package.zip', type: ExtensionCommand.package_file },
    });
    await sendMessage({
      command: ExtensionCommand.validatePath,
      data: { path: 'missing' },
    });

    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.workspace_existence_result,
      data: {
        project: 'LogicApp',
        workspacePath: 'C:\\folder',
        exists: true,
        type: ExtensionCommand.workspace_folder,
      },
    });
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.workspace_existence_result,
      data: {
        project: 'LogicApp',
        workspacePath: 'C:\\file.workflow',
        exists: true,
        type: ExtensionCommand.workspace_file,
      },
    });
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.package_existence_result,
      data: {
        project: 'LogicApp',
        path: 'C:\\package.zip',
        isValid: true,
      },
    });
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.validatePath,
      data: {
        project: 'LogicApp',
        path: 'missing',
        isValid: false,
      },
    });
  });
});
