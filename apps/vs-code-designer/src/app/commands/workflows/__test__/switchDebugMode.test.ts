import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { AzureWizard, type IActionContext } from '@microsoft/vscode-azext-utils';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { selectWorkspaceFile } from '../../../utils/workspace';
import { switchDebugMode } from '../switchDebugMode/switchDebugMode';

const { prompt, execute } = vi.hoisted(() => ({ prompt: vi.fn(), execute: vi.fn() }));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  AzureWizard: vi.fn().mockImplementation(() => ({ prompt, execute })),
}));
vi.mock('../../../../extensionVariables', () => ({ ext: { outputChannel: { appendLog: vi.fn() } } }));
vi.mock('../../../utils/verifyIsProject', () => ({ tryGetLogicAppProjectRoot: vi.fn() }));
vi.mock('../../../utils/workspace', () => ({ selectWorkspaceFile: vi.fn() }));
vi.mock('../switchDebugMode/switchDebugModeSteps/StatelessWorkflowsListStep', () => ({ StatelessWorkflowsListStep: vi.fn() }));
vi.mock('../switchDebugMode/switchDebugModeSteps/UpdateDebugModeStep', () => ({ UpdateDebugModeStep: vi.fn() }));

describe('switchDebugMode project selection', () => {
  const context = {} as IActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AzureWizard).mockImplementation(() => ({ prompt, execute }) as any);
    vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue('/apps/Orders');
  });

  it('uses the clicked Logic App instead of prompting for another workspace folder', async () => {
    const target = vscode.Uri.file('/apps/Orders');
    await switchDebugMode(context, target);
    expect(tryGetLogicAppProjectRoot).toHaveBeenCalledWith(context, target.fsPath, true);
    expect(selectWorkspaceFile).not.toHaveBeenCalled();
    expect(AzureWizard).toHaveBeenCalledWith(expect.objectContaining({ projectPath: '/apps/Orders' }), expect.anything());
    expect(prompt).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledOnce();
  });

  it('preserves workspace selection when no Explorer target is supplied', async () => {
    const previousFolders = vscode.workspace.workspaceFolders;
    Object.assign(vscode.workspace, { workspaceFolders: [] });
    vi.mocked(selectWorkspaceFile).mockResolvedValue('/apps/Selected');
    await switchDebugMode(context);
    expect(selectWorkspaceFile).toHaveBeenCalled();
    expect(tryGetLogicAppProjectRoot).toHaveBeenCalledWith(context, '/apps/Selected', true);
    Object.assign(vscode.workspace, { workspaceFolders: previousFolders });
  });

  it('does not open a debug-mode wizard when the clicked project no longer exists', async () => {
    vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue(undefined);
    await switchDebugMode(context, vscode.Uri.file('/apps/Removed'));
    expect(AzureWizard).not.toHaveBeenCalled();
    expect(vscode.window.showErrorMessage).toHaveBeenCalled();
  });
});
