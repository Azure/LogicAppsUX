import { beforeEach, describe, expect, it, vi } from 'vitest';
import { workflowSubscriptionIdKey } from '../../../../constants';

vi.mock('../../../../extensionVariables', () => ({
  ext: {
    context: {
      globalState: {
        get: vi.fn().mockReturnValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
      },
    },
  },
}));

import { ext } from '../../../../extensionVariables';

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultMessage: string, ...args: unknown[]) =>
    defaultMessage.replace(/{(\d+)}/g, (_match, index) => String(args[Number(index)] ?? '')),
}));

vi.mock('../../../utils/appSettings/localSettings', () => ({
  addOrUpdateLocalAppSettings: vi.fn(),
  getLocalSettingsJson: vi.fn(),
}));

vi.mock('../azureConnectorWizard', () => ({
  createAzureWizard: vi.fn(),
}));

vi.mock('../../../utils/codeless/getAuthorizationToken', () => ({
  getAuthData: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  DialogResponses: {
    cancel: { title: 'Cancel' },
  },
  parseError: (error: any) => ({
    isUserCancelledError: error?.isUserCancelledError === true,
    message: error?.message ?? String(error),
  }),
  openUrl: vi.fn(),
}));

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

vi.mock('fs-extra', () => ({
  pathExists: vi.fn(),
  readdir: vi.fn(),
  lstat: vi.fn(),
  writeFile: vi.fn(),
}));

import { addOrUpdateLocalAppSettings, getLocalSettingsJson } from '../../../utils/appSettings/localSettings';
import { getAuthData } from '../../../utils/codeless/getAuthorizationToken';
import { createAzureWizard } from '../azureConnectorWizard';
import { getAzureConnectorDetailsForLocalProject, invalidateAzureDetailsCache } from '../azureConnectorDetails';
import { setConnectorSetupSkipped } from '../../../state/connectors';

describe('getAzureConnectorDetailsForLocalProject', () => {
  const projectPath = 'D:\\workspace\\LogicApp';
  let context: any;
  let mockGlobalStateGet: ReturnType<typeof vi.fn>;
  let mockGlobalStateUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateAzureDetailsCache(projectPath);
    context = {
      telemetry: { properties: {}, measurements: {} },
    };
    mockGlobalStateGet = vi.mocked(ext.context.globalState.get);
    mockGlobalStateUpdate = vi.mocked(ext.context.globalState.update);
    mockGlobalStateGet.mockReturnValue(undefined);
  });

  it('defaults cancelled Azure connector discovery to disabled settings via globalState', async () => {
    vi.mocked(getLocalSettingsJson).mockResolvedValue({ Values: {} } as any);
    vi.mocked(createAzureWizard).mockReturnValue({
      prompt: vi.fn().mockRejectedValue({ isUserCancelledError: true }),
      execute: vi.fn(),
    } as any);

    const details = await getAzureConnectorDetailsForLocalProject(context, projectPath);

    expect(details).toEqual({ enabled: false });
    expect(mockGlobalStateUpdate).toHaveBeenCalledWith(`azureConnectors.skipped.${projectPath}`, true);
    expect(addOrUpdateLocalAppSettings).not.toHaveBeenCalled();
    expect(getAuthData).not.toHaveBeenCalled();
  });

  it('handles undefined projectPath', async () => {
    const details = await getAzureConnectorDetailsForLocalProject(context, undefined as any);

    expect(details).toEqual({ enabled: false });
    expect(getLocalSettingsJson).not.toHaveBeenCalled();
    expect(createAzureWizard).not.toHaveBeenCalled();
    expect(context.telemetry.properties.azureConnectorDetailsProjectPathMissing).toBe('true');
  });

  it('skips wizard when globalState indicates user previously skipped', async () => {
    mockGlobalStateGet.mockReturnValue(true);
    vi.mocked(getLocalSettingsJson).mockResolvedValue({ Values: {} } as any);

    const details = await getAzureConnectorDetailsForLocalProject(context, projectPath);

    expect(details.enabled).toBe(false);
    expect(createAzureWizard).not.toHaveBeenCalled();
    expect(getAuthData).not.toHaveBeenCalled();
  });

  it('treats empty string subscription as absent and checks globalState', async () => {
    mockGlobalStateGet.mockReturnValue(true);
    vi.mocked(getLocalSettingsJson).mockResolvedValue({ Values: { [workflowSubscriptionIdKey]: '' } } as any);

    const details = await getAzureConnectorDetailsForLocalProject(context, projectPath);

    expect(details.enabled).toBe(false);
    expect(createAzureWizard).not.toHaveBeenCalled();
    expect(getAuthData).not.toHaveBeenCalled();
  });

  it('shows wizard when subscription is empty and globalState is not skipped', async () => {
    mockGlobalStateGet.mockReturnValue(undefined);
    vi.mocked(getLocalSettingsJson).mockResolvedValue({ Values: { [workflowSubscriptionIdKey]: '' } } as any);
    vi.mocked(createAzureWizard).mockImplementation((wizardContext: any) => ({
      prompt: vi.fn(async () => {
        wizardContext.enabled = false;
      }),
      execute: vi.fn(async () => {
        await setConnectorSetupSkipped(projectPath);
      }),
    })) as any;

    const details = await getAzureConnectorDetailsForLocalProject(context, projectPath);

    expect(details.enabled).toBe(false);
    expect(createAzureWizard).toHaveBeenCalled();
  });

  it('throws non-cancellation wizard failures', async () => {
    vi.mocked(getLocalSettingsJson).mockResolvedValue({ Values: {} } as any);
    vi.mocked(createAzureWizard).mockReturnValue({
      prompt: vi.fn().mockRejectedValue(new Error('wizard failed')),
      execute: vi.fn(),
    } as any);

    await expect(getAzureConnectorDetailsForLocalProject(context, projectPath)).rejects.toThrow('wizard failed');
    expect(mockGlobalStateUpdate).not.toHaveBeenCalled();
  });

  it('persists disabled state to globalState when the Azure wizard explicitly skips connectors', async () => {
    vi.mocked(getLocalSettingsJson).mockResolvedValue({ Values: {} } as any);
    vi.mocked(createAzureWizard).mockImplementation((wizardContext: any) => ({
      prompt: vi.fn(async () => {
        wizardContext.enabled = false;
      }),
      execute: vi.fn(async () => {
        await setConnectorSetupSkipped(projectPath);
      }),
    })) as any;

    const details = await getAzureConnectorDetailsForLocalProject(context, projectPath);

    expect(details.enabled).toBe(false);
    expect(mockGlobalStateUpdate).toHaveBeenCalledWith(`azureConnectors.skipped.${projectPath}`, true);
    expect(addOrUpdateLocalAppSettings).not.toHaveBeenCalled();
  });

  it('reads existing Azure connector settings without launching the wizard', async () => {
    vi.mocked(getLocalSettingsJson).mockResolvedValue({
      Values: {
        [workflowSubscriptionIdKey]: 'subscription-id',
        WORKFLOWS_TENANT_ID: 'tenant-id',
        WORKFLOWS_RESOURCE_GROUP_NAME: 'rg',
        WORKFLOWS_LOCATION_NAME: 'westus',
      },
    } as any);
    vi.mocked(getAuthData).mockResolvedValue({ accessToken: 'token', account: { id: 'client-id.tenant-id' } } as any);

    const details = await getAzureConnectorDetailsForLocalProject(context, projectPath);

    expect(createAzureWizard).not.toHaveBeenCalled();
    expect(details).toEqual(
      expect.objectContaining({
        enabled: true,
        accessToken: 'Bearer token',
        subscriptionId: 'subscription-id',
        tenantId: 'tenant-id',
        clientId: 'client-id',
      })
    );
  });
});
