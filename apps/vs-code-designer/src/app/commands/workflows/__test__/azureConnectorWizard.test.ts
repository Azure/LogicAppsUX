import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defaultMsiAudience,
  workflowAuthenticationMethodKey,
  workflowLocationKey,
  workflowManagementBaseURIKey,
  workflowResourceGroupNameKey,
  workflowsDynamicConnectionDefaultAuthAudienceKey,
  workflowSubscriptionIdKey,
  workflowTenantIdKey,
} from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { addOrUpdateLocalAppSettings } from '../../../utils/appSettings/localSettings';
import { createAzureWizard, type IAzureConnectorsContext } from '../azureConnectorWizard';

vi.mock('@microsoft/vscode-azext-azureutils', () => ({
  ResourceGroupListStep: class ResourceGroupListStep {},
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  AzureWizard: class AzureWizard<T> {
    constructor(
      public context: T,
      public options: any
    ) {}
  },
  AzureWizardExecuteStep: class AzureWizardExecuteStep<T> {},
  AzureWizardPromptStep: class AzureWizardPromptStep<T> {},
  parseError: (error: any) => ({
    isUserCancelledError: error?.isUserCancelledError === true,
  }),
}));

vi.mock('../../../../extensionVariables', () => ({
  ext: {
    azureAccountTreeItem: {
      getSubscriptionPromptStep: vi.fn(),
    },
    languageClient: {
      sendNotification: vi.fn(),
    },
  },
}));

vi.mock('../../../../localize', () => ({
  localize: (_key: string, message: string, ...args: unknown[]) =>
    message.replace(/{(\d+)}/g, (_match, index) => String(args[Number(index)] ?? '')),
}));

vi.mock('../../../utils/appSettings/localSettings', () => ({
  addOrUpdateLocalAppSettings: vi.fn(),
}));

describe('createAzureWizard', () => {
  const projectPath = 'D:\\workspace\\LogicApp';
  let context: IAzureConnectorsContext;

  beforeEach(() => {
    vi.clearAllMocks();
    context = {
      telemetry: { properties: {} },
      ui: {
        showQuickPick: vi.fn(),
      },
    } as any;
  });

  it('defaults cancelled connector selection to disabled raw keys', async () => {
    vi.mocked(context.ui.showQuickPick).mockRejectedValue({ isUserCancelledError: true });
    const wizard = createAzureWizard(context, projectPath) as any;

    await wizard.options.promptSteps[0].prompt(context);

    expect(context.enabled).toBe(false);
    expect(context.authenticationMethod).toBe('rawKeys');
    expect(context.telemetry.properties.azureConnectorsDefaulted).toBe('rawKeys');
  });

  it('surfaces non-cancel connector selection failures', async () => {
    const failure = new Error('pick failed');
    vi.mocked(context.ui.showQuickPick).mockRejectedValue(failure);
    const wizard = createAzureWizard(context, projectPath) as any;

    await expect(wizard.options.promptSteps[0].prompt(context)).rejects.toThrow(failure);
  });

  it('provides Azure subscription and resource group prompt steps only when connectors are enabled', async () => {
    const subscriptionStep = { prompt: vi.fn() } as any;
    vi.mocked(ext.azureAccountTreeItem.getSubscriptionPromptStep).mockResolvedValue(subscriptionStep);
    const wizard = createAzureWizard(context, projectPath) as any;
    const azureConnectorStep = wizard.options.promptSteps[0];

    await expect(azureConnectorStep.getSubWizard({ ...context, enabled: false })).resolves.toBeUndefined();

    const subWizard = await azureConnectorStep.getSubWizard({ ...context, enabled: true });
    expect(subWizard.promptSteps).toHaveLength(2);
    expect(subWizard.promptSteps[0]).toBe(subscriptionStep);
  });

  it('only prompts for connector selection when no prior selection exists', () => {
    const wizard = createAzureWizard(context, projectPath) as any;
    const azureConnectorStep = wizard.options.promptSteps[0];

    expect(azureConnectorStep.shouldPrompt(context)).toBe(true);
    expect(azureConnectorStep.shouldPrompt({ ...context, enabled: false })).toBe(false);
  });

  it('persists disabled raw-key settings when Azure connectors are skipped', async () => {
    context.enabled = false;
    context.authenticationMethod = 'rawKeys';
    const wizard = createAzureWizard(context, projectPath) as any;

    await wizard.options.executeSteps[0].execute(context);

    expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(context, projectPath, {
      [workflowSubscriptionIdKey]: '',
      [workflowAuthenticationMethodKey]: 'rawKeys',
    });
  });

  it('persists Azure connector settings and notifies the language client when enabled', async () => {
    Object.assign(context, {
      enabled: true,
      authenticationMethod: 'managedServiceIdentity',
      tenantId: 'tenant-id',
      subscriptionId: 'subscription-id',
      resourceGroup: { name: 'rg', location: 'westus' },
      environment: { resourceManagerEndpointUrl: 'https://management.azure.com/' },
    });
    const wizard = createAzureWizard(context, projectPath) as any;

    await wizard.options.executeSteps[0].execute(context);

    expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(context, projectPath, {
      [workflowTenantIdKey]: 'tenant-id',
      [workflowSubscriptionIdKey]: 'subscription-id',
      [workflowResourceGroupNameKey]: 'rg',
      [workflowLocationKey]: 'westus',
      [workflowManagementBaseURIKey]: 'https://management.azure.com/',
      [workflowAuthenticationMethodKey]: 'managedServiceIdentity',
      [workflowsDynamicConnectionDefaultAuthAudienceKey]: defaultMsiAudience,
    });
    expect(ext.languageClient.sendNotification).toHaveBeenCalledWith('custom/updateApiConfig', {
      subscriptionId: 'subscription-id',
      resourceGroup: { name: 'rg', location: 'westus' },
    });
  });

  it('executes only when Azure connectors are disabled or an Azure scope was selected', () => {
    const wizard = createAzureWizard(context, projectPath) as any;
    const saveStep = wizard.options.executeSteps[0];

    expect(saveStep.shouldExecute({ ...context, enabled: false })).toBe(true);
    expect(saveStep.shouldExecute({ ...context, subscriptionId: 'subscription-id' })).toBe(true);
    expect(saveStep.shouldExecute(context)).toBe(false);
  });
});
