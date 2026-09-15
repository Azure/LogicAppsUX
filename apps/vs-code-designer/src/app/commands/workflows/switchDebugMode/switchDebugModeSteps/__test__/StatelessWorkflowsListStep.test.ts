import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStatelessWorkflowNames } from '../StatelessWorkflowsListStep';
import { UpdateDebugModeStep } from '../UpdateDebugModeStep';
import { addOrUpdateLocalAppSettings } from '../../../../../utils/appSettings/localSettings';
import { lstat, pathExists, readdir, readFileSync } from 'fs-extra';

vi.mock('@microsoft/vscode-azext-utils', () => ({
  AzureWizardExecuteStep: class AzureWizardExecuteStep<T> {},
  AzureWizardPromptStep: class AzureWizardPromptStep<T> {},
}));

vi.mock('../../../../../utils/appSettings/localSettings', () => ({
  addOrUpdateLocalAppSettings: vi.fn(),
}));

vi.mock('fs-extra', () => ({
  lstat: vi.fn(),
  pathExists: vi.fn(),
  readdir: vi.fn(),
  readFileSync: vi.fn(),
}));

describe('StatelessWorkflowsListStep', () => {
  const projectPath = 'C:\\projects\\logic-app';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(pathExists).mockResolvedValue(true);
  });

  it('discovers codeless and codeful stateless workflows without duplicates', async () => {
    vi.mocked(readdir).mockResolvedValue([
      'codeless-stateless',
      'StatelessWorkflow.cs',
      'MultipleWorkflows.cs',
      'DuplicateWorkflow.cs',
      'StatefulWorkflow.cs',
      'AgentWorkflow.cs',
    ] as never);
    vi.mocked(lstat).mockImplementation(
      async (filePath) =>
        ({
          isDirectory: () => String(filePath).endsWith('codeless-stateless'),
          isFile: () => !String(filePath).endsWith('codeless-stateless'),
        }) as never
    );
    vi.mocked(readFileSync).mockImplementation((filePath) => {
      const normalizedPath = String(filePath);
      if (normalizedPath.endsWith('workflow.json')) {
        return JSON.stringify({ kind: 'Stateless' });
      }
      if (normalizedPath.endsWith('StatelessWorkflow.cs')) {
        return 'WorkflowFactory.CreateStatelessWorkflow("codeful-stateless", workflow);';
      }
      if (normalizedPath.endsWith('MultipleWorkflows.cs')) {
        return `
          WorkflowFactory.CreateStatelessWorkflow("codeful-stateless-two", workflow);
          WorkflowBuilderFactory.CreateStatelessWorkflow("codeful-stateless-three", workflow);
          WorkflowFactory.CreateStatelessWorkflow(variableName, workflow);
          // WorkflowFactory.CreateStatelessWorkflow("commented-out", workflow);
        `;
      }
      if (normalizedPath.endsWith('DuplicateWorkflow.cs')) {
        return 'WorkflowBuilderFactory.CreateStatelessWorkflow("codeless-stateless", workflow);';
      }
      if (normalizedPath.endsWith('StatefulWorkflow.cs')) {
        return 'WorkflowFactory.CreateStatefulWorkflow("codeful-stateful", workflow);';
      }
      return 'WorkflowFactory.CreateAgentWorkflow("codeful-agent", workflow);';
    });

    await expect(getStatelessWorkflowNames(projectPath)).resolves.toEqual([
      'codeless-stateless',
      'codeful-stateless',
      'codeful-stateless-two',
      'codeful-stateless-three',
    ]);
  });

  it('skips unreadable or malformed workflow files', async () => {
    vi.mocked(readdir).mockResolvedValue(['broken', 'Unreadable.cs'] as never);
    vi.mocked(lstat).mockImplementation(
      async (filePath) =>
        ({
          isDirectory: () => String(filePath).endsWith('broken'),
          isFile: () => String(filePath).endsWith('.cs'),
        }) as never
    );
    vi.mocked(readFileSync).mockImplementation((filePath) => {
      if (String(filePath).endsWith('workflow.json')) {
        return '{';
      }
      throw new Error('Access denied');
    });

    await expect(getStatelessWorkflowNames(projectPath)).resolves.toEqual([]);
  });

  it('returns no workflows when the project path does not exist', async () => {
    vi.mocked(pathExists).mockResolvedValue(false);

    await expect(getStatelessWorkflowNames(projectPath)).resolves.toEqual([]);
    expect(readdir).not.toHaveBeenCalled();
  });
});

describe('UpdateDebugModeStep', () => {
  it('enables stateless run history for the selected codeful workflow', async () => {
    const context = {
      projectPath: 'C:\\projects\\logic-app',
      workflowName: 'codeful-stateless',
      enableDebugMode: true,
    } as any;

    await new UpdateDebugModeStep().execute(context, {} as any);

    expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(context, context.projectPath, {
      'Workflows.codeful-stateless.OperationOptions': 'WithStatelessRunHistory',
    });
  });

  it('disables stateless run history for the selected codeful workflow', async () => {
    const context = {
      projectPath: 'C:\\projects\\logic-app',
      workflowName: 'codeful-stateless',
      enableDebugMode: false,
    } as any;

    await new UpdateDebugModeStep().execute(context, {} as any);

    expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(context, context.projectPath, {
      'Workflows.codeful-stateless.OperationOptions': 'None',
    });
  });
});
