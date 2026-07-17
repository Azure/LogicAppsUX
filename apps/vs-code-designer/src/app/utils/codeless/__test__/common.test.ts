import { beforeEach, describe, expect, it, vi } from 'vitest';
import { workflowSubscriptionIdKey } from '../../../../constants';

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultMessage: string, ...args: unknown[]) =>
    defaultMessage.replace(/{(\d+)}/g, (_match, index) => String(args[Number(index)] ?? '')),
}));

vi.mock('../../appSettings/localSettings', () => ({
  addOrUpdateLocalAppSettings: vi.fn(),
  getLocalSettingsJson: vi.fn(),
}));

vi.mock('../../../commands/workflows/azureConnectorWizard', () => ({
  createAzureWizard: vi.fn(),
}));

vi.mock('../getAuthorizationToken', () => ({
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

import { createAzureWizard } from '../../../commands/workflows/azureConnectorWizard';
import { addOrUpdateLocalAppSettings, getLocalSettingsJson } from '../../appSettings/localSettings';
import { getAuthData } from '../getAuthorizationToken';
import { getAzureConnectorDetailsForLocalProject, invalidateAzureDetailsCache } from '../common';

describe('getAzureConnectorDetailsForLocalProject', () => {
  const projectPath = 'D:\\workspace\\LogicApp';
  let context: any;

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateAzureDetailsCache(projectPath);
    context = {
      telemetry: { properties: {}, measurements: {} },
    };
  });

  it('defaults cancelled Azure connector discovery to disabled settings', async () => {
    vi.mocked(getLocalSettingsJson).mockResolvedValue({ Values: {} } as any);
    vi.mocked(createAzureWizard).mockReturnValue({
      prompt: vi.fn().mockRejectedValue({ isUserCancelledError: true }),
      execute: vi.fn(),
    } as any);

    const details = await getAzureConnectorDetailsForLocalProject(context, projectPath);

    expect(details).toEqual({ enabled: false });
    expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(context, projectPath, {
      [workflowSubscriptionIdKey]: '',
    });
    expect(getAuthData).not.toHaveBeenCalled();
  });

  it('handles undefined projectPath', async () => {
    const details = await getAzureConnectorDetailsForLocalProject(context, undefined as any);

    expect(details).toEqual({ enabled: false });
    expect(getLocalSettingsJson).not.toHaveBeenCalled();
    expect(createAzureWizard).not.toHaveBeenCalled();
    expect(context.telemetry.properties.azureConnectorDetailsProjectPathMissing).toBe('true');
  });

  it('treats explicitly skipped Azure connectors as disabled without requesting auth', async () => {
    vi.mocked(getLocalSettingsJson).mockResolvedValue({ Values: { [workflowSubscriptionIdKey]: '' } } as any);

    const details = await getAzureConnectorDetailsForLocalProject(context, projectPath);

    expect(details.enabled).toBe(false);
    expect(createAzureWizard).not.toHaveBeenCalled();
    expect(getAuthData).not.toHaveBeenCalled();
  });

  it('throws non-cancellation wizard failures', async () => {
    vi.mocked(getLocalSettingsJson).mockResolvedValue({ Values: {} } as any);
    vi.mocked(createAzureWizard).mockReturnValue({
      prompt: vi.fn().mockRejectedValue(new Error('wizard failed')),
      execute: vi.fn(),
    } as any);

    await expect(getAzureConnectorDetailsForLocalProject(context, projectPath)).rejects.toThrow('wizard failed');
    expect(addOrUpdateLocalAppSettings).not.toHaveBeenCalled();
  });

  it('persists disabled state when the Azure wizard explicitly skips connectors', async () => {
    vi.mocked(getLocalSettingsJson).mockResolvedValue({ Values: {} } as any);
    vi.mocked(createAzureWizard).mockImplementation((wizardContext: any) => ({
      prompt: vi.fn(async () => {
        wizardContext.enabled = false;
      }),
      execute: vi.fn(async () => {
        await addOrUpdateLocalAppSettings(wizardContext, projectPath, {
          [workflowSubscriptionIdKey]: '',
        });
      }),
    })) as any;

    const details = await getAzureConnectorDetailsForLocalProject(context, projectPath);

    expect(details.enabled).toBe(false);
    expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(context, projectPath, {
      [workflowSubscriptionIdKey]: '',
    });
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
