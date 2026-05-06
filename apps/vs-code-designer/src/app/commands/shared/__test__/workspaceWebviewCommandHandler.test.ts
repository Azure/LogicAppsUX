import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ext } from '../../../../extensionVariables';
import { cacheWebviewPanel, removeWebviewPanelFromCache, tryGetWebviewPanel } from '../../../utils/codeless/common';
import { getWebViewHTML } from '../../../utils/codeless/getWebViewHTML';
import { createWorkspaceWebviewCommandHandler, type WorkspaceWebviewCommandConfig } from '../workspaceWebviewCommandHandler';

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultValue: string, ...args: unknown[]) =>
    defaultValue.replace(/{(\d+)}/g, (_match, index) => String(args[Number(index)] ?? '')),
}));

vi.mock('../../../utils/codeless/common', () => ({
  cacheWebviewPanel: vi.fn(),
  removeWebviewPanelFromCache: vi.fn(),
  tryGetWebviewPanel: vi.fn(),
}));

vi.mock('../../../utils/codeless/getWebViewHTML', () => ({
  getWebViewHTML: vi.fn(),
}));

function baseConfig(overrides: Partial<WorkspaceWebviewCommandConfig> = {}): WorkspaceWebviewCommandConfig {
  return {
    panelName: 'Create workspace',
    panelGroupKey: 'createWorkspace',
    projectName: ProjectName.createWorkspace,
    createCommand: ExtensionCommand.createWorkspace,
    createHandler: vi.fn(),
    ...overrides,
  };
}

describe('createWorkspaceWebviewCommandHandler', () => {
  let messageHandler: ((message: any) => Promise<void>) | undefined;
  let disposeHandler: (() => void) | undefined;
  let panel: any;

  beforeEach(() => {
    vi.clearAllMocks();
    messageHandler = undefined;
    disposeHandler = undefined;
    (ext as any).context = { extensionPath: 'D:\\extension', subscriptions: [] };
    panel = {
      active: true,
      reveal: vi.fn(),
      dispose: vi.fn(),
      onDidDispose: vi.fn((callback: () => void) => {
        disposeHandler = callback;
      }),
      webview: {
        html: '',
        asWebviewUri: vi.fn((uri: any) => uri),
        onDidReceiveMessage: vi.fn((callback: (message: any) => Promise<void>) => {
          messageHandler = callback;
        }),
        postMessage: vi.fn(),
      },
    };
    (vscode.window.createWebviewPanel as Mock).mockReturnValue(panel);
    (vscode.window as any).showOpenDialog = vi.fn();
    (getWebViewHTML as Mock).mockResolvedValue('<html />');
    (tryGetWebviewPanel as Mock).mockReturnValue(undefined);
    (fs.existsSync as Mock).mockReturnValue(false);
    (fs as any).statSync = vi.fn();
  });

  it('reveals an existing inactive panel instead of creating a new one', async () => {
    const existingPanel = { active: false, reveal: vi.fn() };
    (tryGetWebviewPanel as Mock).mockReturnValue(existingPanel);

    await createWorkspaceWebviewCommandHandler(baseConfig());

    expect(existingPanel.reveal).toHaveBeenCalledWith(vscode.ViewColumn.Active);
    expect(vscode.window.createWebviewPanel).not.toHaveBeenCalled();
  });

  it('initializes, validates, selects paths, and invokes the configured create handler', async () => {
    const createHandler = vi.fn().mockResolvedValue(undefined);
    const onResolve = vi.fn();
    const config = baseConfig({
      createHandler,
      onResolve,
      extraInitializeData: { workspaceName: 'MyWorkspace' },
      dialogOptions: {
        workspace: { canSelectMany: false, openLabel: 'Pick workspace' },
        package: { canSelectMany: false, openLabel: 'Pick package', filters: { Packages: ['zip'] } },
      },
    });

    await createWorkspaceWebviewCommandHandler(config);

    expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith('CreateWorkspace', 'Create workspace', vscode.ViewColumn.Active, {
      enableScripts: true,
      retainContextWhenHidden: true,
    });
    expect(panel.webview.html).toBe('<html />');
    expect(cacheWebviewPanel).toHaveBeenCalledWith('createWorkspace', 'Create workspace', panel);

    await messageHandler?.({ command: ExtensionCommand.initialize });
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.initialize_frame,
      data: expect.objectContaining({
        apiVersion: '2021-03-01',
        project: ProjectName.createWorkspace,
        hostVersion: ext.extensionVersion,
        workspaceName: 'MyWorkspace',
      }),
    });

    (vscode.window.showOpenDialog as Mock).mockResolvedValue([{ fsPath: 'D:\\selected', path: '\\selected' }]);
    await messageHandler?.({ command: ExtensionCommand.select_folder });
    expect(vscode.window.showOpenDialog).toHaveBeenCalledWith(config.dialogOptions?.workspace);
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.update_workspace_path,
      data: { targetDirectory: { fsPath: 'D:\\selected', path: '\\selected' } },
    });

    (fs.existsSync as Mock).mockReturnValue(true);
    (fs as any).statSync.mockReturnValue({ isDirectory: () => false, isFile: () => true });
    await messageHandler?.({
      command: ExtensionCommand.validatePath,
      data: { path: 'D:\\package.zip', type: ExtensionCommand.package_file },
    });
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.package_existence_result,
      data: {
        project: ProjectName.createWorkspace,
        path: 'D:\\package.zip',
        isValid: true,
      },
    });

    await messageHandler?.({
      command: ExtensionCommand.createWorkspace,
      data: { workspaceName: 'MyWorkspace' },
      _diagnostics: { source: 'test' },
    });
    expect(createHandler).toHaveBeenCalledWith(expect.objectContaining({ telemetry: expect.any(Object) }), {
      workspaceName: 'MyWorkspace',
    });
    expect(onResolve).toHaveBeenCalledWith(true);
    expect(panel.dispose).toHaveBeenCalled();
  });

  it('removes cached panels and resolves false when the panel is disposed', async () => {
    const onResolve = vi.fn();
    await createWorkspaceWebviewCommandHandler(baseConfig({ onResolve }));

    disposeHandler?.();

    expect(removeWebviewPanelFromCache).toHaveBeenCalledWith('createWorkspace', 'Create workspace');
    expect(onResolve).toHaveBeenCalledWith(false);
  });
});
