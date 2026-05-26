import { describe, it, expect, vi } from 'vitest';

// Override the global AzureWizardPromptStep mock: the test-setup version returns `{}`
// from its constructor, which throws away subclass prototype methods. Use real classes.
vi.mock('@microsoft/vscode-azext-utils', () => ({
  AzureWizardPromptStep: class {},
  AzureWizardExecuteStep: class {},
  AzureWizard: class {},
}));

// Sub-step modules pull in tree items / azureappservice / azureappsettings, which all do
// a CommonJS require('vscode') at module load. Stub them so the three SUTs load cleanly.
vi.mock('../adoDeploymentScriptsSteps/LogicAppNameStep', () => ({ LogicAppNameStep: class {} }));
vi.mock('../adoDeploymentScriptsSteps/StorageAccountNameStep', () => ({ StorageAccountNameStep: class {} }));
vi.mock('../adoDeploymentScriptsSteps/AppServicePlanNameStep', () => ({ AppServicePlanNameStep: class {} }));
vi.mock('../adoDeploymentScriptsSteps/GenerateADODeploymentScriptsStep', () => ({ GenerateADODeploymentScriptsStep: class {} }));
vi.mock('../deploymentCenterScriptsSteps/LogicAppStep', () => ({ LogicAppStep: class {} }));
vi.mock('../deploymentCenterScriptsSteps/LogicAppMSIStep', () => ({ LogicAppMSIStep: class {} }));
vi.mock('../deploymentCenterScriptsSteps/GenerateDeploymentCenterScriptsStep', () => ({ GenerateDeploymentCenterScriptsStep: class {} }));
vi.mock('../SubscriptionAndResourceGroupStep', () => ({ SubscriptionAndResourceGroupStep: class {} }));
vi.mock('../../../../utils/azureClients', () => ({ createContainerClient: vi.fn() }));

import { DeploymentScriptType, DeploymentTargetType } from '@microsoft/vscode-extension-logic-apps';
import { DeploymentScriptTypeStep } from '../DeploymentScriptTypeStep';
import { DeploymentTargetStep } from '../DeploymentTargetStep';
import { ConnectedEnvironmentStep } from '../adoDeploymentScriptsSteps/ConnectedEnvironmentStep';

// Minimal context — only the fields these steps read.
const makeContext = (overrides: Record<string, any> = {}) => ({
  telemetry: { properties: {}, measurements: {} },
  ui: { showQuickPick: vi.fn().mockResolvedValue({ data: undefined }) },
  ...overrides,
});

describe('DeploymentScriptTypeStep', () => {
  const step = new DeploymentScriptTypeStep();

  it('always prompts', () => {
    expect(step.shouldPrompt()).toBe(true);
  });

  it('captures the selected script type and stores it on telemetry', async () => {
    const ctx = makeContext();
    ctx.ui.showQuickPick = vi.fn().mockResolvedValue({ data: DeploymentScriptType.azureDevOpsPipeline });
    await step.prompt(ctx as any);
    expect((ctx as any).deploymentScriptType).toBe(DeploymentScriptType.azureDevOpsPipeline);
    expect(ctx.telemetry.properties.lastStep).toBe('DeploymentScriptTypeStep');
  });

  it('returns the ADO sub-wizard when ADO pipeline is chosen', async () => {
    const ctx = makeContext({ deploymentScriptType: DeploymentScriptType.azureDevOpsPipeline });
    const sub = await step.getSubWizard(ctx as any);
    // Two prompt steps + one execute step for the ADO flow.
    expect(sub.promptSteps).toHaveLength(2);
    expect(sub.executeSteps).toHaveLength(1);
    expect(ctx.telemetry.properties.deploymentScriptType).toBe('azureDevOpsPipeline');
  });

  it('returns the Deployment Center sub-wizard otherwise', async () => {
    const ctx = makeContext({
      deploymentScriptType: DeploymentScriptType.azureDeploymentCenter,
      projectPath: '/path/to/MyLogicApp',
    });
    const sub = await step.getSubWizard(ctx as any);
    expect(sub.promptSteps).toHaveLength(3);
    expect(sub.executeSteps).toHaveLength(1);
    expect(ctx.telemetry.properties.deploymentScriptType).toBe('azureDeploymentCenter');
    expect((ctx as any).localLogicAppName).toBe('MyLogicApp');
  });
});

describe('DeploymentTargetStep', () => {
  const step = new DeploymentTargetStep();

  it('always prompts', () => {
    expect(step.shouldPrompt()).toBe(true);
  });

  it('records the chosen target on context and telemetry', async () => {
    const ctx = makeContext();
    ctx.ui.showQuickPick = vi.fn().mockResolvedValue({ data: DeploymentTargetType.hybrid });
    await step.prompt(ctx as any);
    expect((ctx as any).deploymentTarget).toBe(DeploymentTargetType.hybrid);
    expect(ctx.telemetry.properties.deploymentTarget).toBe(DeploymentTargetType.hybrid);
  });

  it('returns Hybrid sub-steps when target is hybrid', async () => {
    const ctx = makeContext({ deploymentTarget: DeploymentTargetType.hybrid });
    const sub = await step.getSubWizard(ctx as any);
    // SubscriptionAndResourceGroupStep + ConnectedEnvironmentStep
    expect(sub.promptSteps).toHaveLength(2);
  });

  it('returns Standard sub-steps for any other target', async () => {
    const ctx = makeContext({ deploymentTarget: DeploymentTargetType.standard });
    const sub = await step.getSubWizard(ctx as any);
    // SubscriptionAndResourceGroupStep + StorageAccountNameStep + AppServicePlanNameStep
    expect(sub.promptSteps).toHaveLength(3);
  });
});

describe('ConnectedEnvironmentStep', () => {
  const step = new ConnectedEnvironmentStep();

  it('always prompts', () => {
    expect(step.shouldPrompt()).toBe(true);
  });
});
