import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getStatelessWorkflowNames } from '../StatelessWorkflowsListStep';
import { UpdateDebugModeStep } from '../UpdateDebugModeStep';
import { addOrUpdateLocalAppSettings } from '../../../../../utils/appSettings/localSettings';
import { ensureDir, mkdtemp, remove, writeFile } from 'fs-extra';
import { tmpdir } from 'os';
import path from 'path';

vi.mock('@microsoft/vscode-azext-utils', () => ({
  AzureWizardExecuteStep: class AzureWizardExecuteStep<T> {},
  AzureWizardPromptStep: class AzureWizardPromptStep<T> {},
}));

vi.mock('../../../../../utils/appSettings/localSettings', () => ({
  addOrUpdateLocalAppSettings: vi.fn(),
}));

vi.mock('fs-extra', async () => vi.importActual<typeof import('fs-extra')>('fs-extra'));
vi.mock('os', async () => vi.importActual<typeof import('os')>('os'));

describe('StatelessWorkflowsListStep', () => {
  let projectPath: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    projectPath = await mkdtemp(path.join(tmpdir(), 'stateless-workflows-'));
  });

  afterEach(async () => {
    await remove(projectPath);
  });

  it('discovers codeless and codeful stateless workflows without duplicates', async () => {
    const codelessWorkflowPath = path.join(projectPath, 'codeless-stateless');
    await ensureDir(codelessWorkflowPath);
    await writeFile(path.join(codelessWorkflowPath, 'workflow.json'), JSON.stringify({ kind: 'Stateless' }));
    await writeFile(
      path.join(projectPath, 'StatelessWorkflow.cs'),
      createWorkflowProvider('WorkflowFactory.CreateStatelessWorkflow("codeful-stateless", workflow)')
    );
    await writeFile(
      path.join(projectPath, 'MultipleWorkflows.cs'),
      createWorkflowProvider(`
        WorkflowFactory.CreateStatelessWorkflow("codeful-stateless-two", workflow),
        WorkflowBuilderFactory.CreateStatelessWorkflow("codeful-stateless-three", workflow),
        WorkflowFactory.CreateStatelessWorkflow(variableName, workflow)
        // WorkflowFactory.CreateStatelessWorkflow("commented-out", workflow)
      `)
    );
    await writeFile(
      path.join(projectPath, 'DuplicateWorkflow.cs'),
      createWorkflowProvider('WorkflowBuilderFactory.CreateStatelessWorkflow("codeless-stateless", workflow)')
    );
    await writeFile(
      path.join(projectPath, 'StatefulWorkflow.cs'),
      createWorkflowProvider('WorkflowFactory.CreateStatefulWorkflow("codeful-stateful", workflow)')
    );
    await writeFile(
      path.join(projectPath, 'AgentWorkflow.cs'),
      createWorkflowProvider('WorkflowFactory.CreateAgentWorkflow("codeful-agent", workflow)')
    );

    const workflows = await getStatelessWorkflowNames(projectPath);

    expect(workflows).toEqual(
      expect.arrayContaining(['codeless-stateless', 'codeful-stateless', 'codeful-stateless-two', 'codeful-stateless-three'])
    );
    expect(workflows).toHaveLength(4);
  });

  it('skips malformed workflow files', async () => {
    const brokenWorkflowPath = path.join(projectPath, 'broken');
    await ensureDir(brokenWorkflowPath);
    await writeFile(path.join(brokenWorkflowPath, 'workflow.json'), '{');

    await expect(getStatelessWorkflowNames(projectPath)).resolves.toEqual([]);
  });

  it('returns no workflows when the project path does not exist', async () => {
    const missingProjectPath = path.join(projectPath, 'missing');

    await expect(getStatelessWorkflowNames(missingProjectPath)).resolves.toEqual([]);
  });
});

function createWorkflowProvider(factoryCalls: string): string {
  return `
    namespace TestProject
    {
      using Microsoft.Azure.Workflows.Sdk;

      public class TestWorkflow : IWorkflowProvider
      {
        public FlowDefinition[] GetWorkflows()
        {
          var variableName = "variable-workflow";
          var workflow = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
          return new[]
          {
            ${factoryCalls}
          };
        }
      }
    }
  `;
}

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
