import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { AzureWizard } from '@microsoft/vscode-azext-utils';
import type * as vscode from 'vscode';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLogicAppProjectRoot, getParentLogicAppRoot } from '../../../../utils/workspace';
import { tryGetLogicAppProjectRoot } from '../../../../utils/verifyIsProject';
import { switchDebugMode } from '../switchDebugMode';

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  prompt: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  AzureWizard: vi.fn(),
}));

vi.mock('../../../../../localize', () => ({
  localize: (_key: string, defaultValue: string) => defaultValue,
}));

vi.mock('../../../../../extensionVariables', () => ({
  ext: {
    outputChannel: {
      appendLog: vi.fn(),
    },
  },
}));

vi.mock('../../../../utils/workspace', () => ({
  getLogicAppProjectRoot: vi.fn(),
  getParentLogicAppRoot: vi.fn(),
}));

vi.mock('../../../../utils/verifyIsProject', () => ({
  tryGetLogicAppProjectRoot: vi.fn(),
}));

vi.mock('../switchDebugModeSteps/StatelessWorkflowsListStep', () => ({
  StatelessWorkflowsListStep: vi.fn(),
}));

vi.mock('../switchDebugModeSteps/UpdateDebugModeStep', () => ({
  UpdateDebugModeStep: vi.fn(),
}));

describe('switchDebugMode project resolution', () => {
  const context = {
    telemetry: { measurements: {}, properties: {} },
    ui: {},
  } as IActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AzureWizard).mockImplementation(
      () =>
        ({
          execute: mocks.execute,
          prompt: mocks.prompt,
        }) as any
    );
    vi.mocked(getLogicAppProjectRoot).mockResolvedValue('/workspace/project');
    vi.mocked(getParentLogicAppRoot).mockResolvedValue(undefined);
    vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue(undefined);
    mocks.execute.mockResolvedValue(undefined);
    mocks.prompt.mockResolvedValue(undefined);
  });

  it.each([
    ['an absent URI', undefined],
    ['an empty-object URI', {} as vscode.Uri],
  ])('falls back to workspace project selection for %s', async (_label, node) => {
    await switchDebugMode(context, node);

    expect(getLogicAppProjectRoot).toHaveBeenCalledWith(context);
    expect(getParentLogicAppRoot).not.toHaveBeenCalled();
    expect(tryGetLogicAppProjectRoot).not.toHaveBeenCalled();
    expect(AzureWizard).toHaveBeenCalledWith(expect.objectContaining({ projectPath: '/workspace/project' }), expect.any(Object));
  });

  it('resolves a nested project from a workspace-root ancestor URI', async () => {
    vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue('/workspace/projects/logic-app');

    await switchDebugMode(context, { fsPath: '/workspace' } as vscode.Uri);

    expect(getParentLogicAppRoot).toHaveBeenCalledWith('/workspace');
    expect(tryGetLogicAppProjectRoot).toHaveBeenCalledWith(context, '/workspace', true);
    expect(getLogicAppProjectRoot).not.toHaveBeenCalled();
    expect(AzureWizard).toHaveBeenCalledWith(expect.objectContaining({ projectPath: '/workspace/projects/logic-app' }), expect.any(Object));
  });

  it('resolves a project descendant through its parent Logic App root', async () => {
    vi.mocked(getParentLogicAppRoot).mockResolvedValue('/workspace/projects/logic-app');
    const workflowFilePath = '/workspace/projects/logic-app/workflows/workflow-a/workflow.json';

    await switchDebugMode(context, { fsPath: workflowFilePath } as vscode.Uri);

    expect(getParentLogicAppRoot).toHaveBeenCalledWith(workflowFilePath);
    expect(tryGetLogicAppProjectRoot).not.toHaveBeenCalled();
    expect(getLogicAppProjectRoot).not.toHaveBeenCalled();
    expect(AzureWizard).toHaveBeenCalledWith(expect.objectContaining({ projectPath: '/workspace/projects/logic-app' }), expect.any(Object));
  });
});
