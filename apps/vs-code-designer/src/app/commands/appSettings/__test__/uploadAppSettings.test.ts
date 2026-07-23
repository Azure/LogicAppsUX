import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import {
  inlineCodeNodeExecutablePathKey,
  workflowLocationKey,
  workflowResourceGroupNameKey,
  workflowSubscriptionIdKey,
  workflowTenantIdKey,
} from '../../../../constants';
import { getLocalSettingsJson } from '../../../utils/appSettings/localSettings';
import { getLocalSettingsFile } from '../getLocalSettingsFile';
import { uploadAppSettings } from '../uploadAppSettings';
import { confirmOverwriteSettings } from '@microsoft/vscode-azext-azureappservice';

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultValue: string, ...args: unknown[]) =>
    defaultValue.replace(/{(\d+)}/g, (_match, index) => String(args[Number(index)] ?? '')),
}));

vi.mock('../getLocalSettingsFile', () => ({
  getLocalSettingsFile: vi.fn(),
}));

vi.mock('../../../utils/appSettings/localSettings', () => ({
  getLocalSettingsJson: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-azureappservice', () => ({
  // Mimic the real behavior: copy the (already filtered) source settings onto the target.
  confirmOverwriteSettings: vi.fn(async (_context: unknown, source: Record<string, string>, target: Record<string, string>) => {
    Object.assign(target, source);
  }),
}));

vi.mock('@microsoft/vscode-azext-azureappsettings', () => ({
  AppSettingsTreeItem: { contextValue: 'appSettings' },
}));

describe('uploadAppSettings', () => {
  let context: any;
  let updateApplicationSettings: Mock;
  let node: any;

  const portalSubscriptionId = 'real-portal-subscription-id';

  beforeEach(() => {
    vi.clearAllMocks();
    context = { telemetry: { properties: {}, measurements: {} } };
    (getLocalSettingsFile as Mock).mockResolvedValue('D:\\workspace\\LogicApp\\local.settings.json');

    updateApplicationSettings = vi.fn();
    const client = {
      fullName: 'my-logic-app',
      // Portal already has the correct platform-provided subscription id.
      listApplicationSettings: vi.fn(async () => ({ properties: { [workflowSubscriptionIdKey]: portalSubscriptionId } })),
      updateApplicationSettings,
    };
    node = { clientProvider: { createClient: vi.fn(async () => client) } };
  });

  const getUploadedProperties = (): Record<string, string> => updateApplicationSettings.mock.calls[0][0].properties;

  it('excludes name-matched settings like the inline-code node executable path', async () => {
    (getLocalSettingsJson as Mock).mockResolvedValue({
      Values: {
        FUNCTIONS_WORKER_RUNTIME: 'node',
        [inlineCodeNodeExecutablePathKey]: 'C:\\Users\\dev\\.azurelogicapps\\dependencies\\NodeJs\\node.exe',
      },
    });

    await uploadAppSettings(context, node, undefined, [inlineCodeNodeExecutablePathKey]);

    const uploaded = getUploadedProperties();
    expect(uploaded[inlineCodeNodeExecutablePathKey]).toBeUndefined();
    expect(uploaded.FUNCTIONS_WORKER_RUNTIME).toBe('node');
    expect(confirmOverwriteSettings).toHaveBeenCalled();
  });

  it('skips empty WORKFLOWS_* connector settings so they do not overwrite portal values', async () => {
    (getLocalSettingsJson as Mock).mockResolvedValue({
      Values: {
        [workflowSubscriptionIdKey]: '',
        [workflowTenantIdKey]: '',
        [workflowResourceGroupNameKey]: '   ',
        [workflowLocationKey]: '',
        FUNCTIONS_WORKER_RUNTIME: 'node',
      },
    });

    await uploadAppSettings(context, node, undefined, []);

    const uploaded = getUploadedProperties();
    // Empty local sentinels must not be uploaded...
    expect(uploaded[workflowTenantIdKey]).toBeUndefined();
    expect(uploaded[workflowResourceGroupNameKey]).toBeUndefined();
    expect(uploaded[workflowLocationKey]).toBeUndefined();
    // ...and the portal's real subscription id must be preserved.
    expect(uploaded[workflowSubscriptionIdKey]).toBe(portalSubscriptionId);
    expect(uploaded.FUNCTIONS_WORKER_RUNTIME).toBe('node');
  });

  it('uploads WORKFLOWS_* connector settings when they have real values', async () => {
    (getLocalSettingsJson as Mock).mockResolvedValue({
      Values: {
        [workflowSubscriptionIdKey]: 'local-subscription-id',
        [workflowTenantIdKey]: 'local-tenant-id',
      },
    });

    await uploadAppSettings(context, node, undefined, []);

    const uploaded = getUploadedProperties();
    expect(uploaded[workflowSubscriptionIdKey]).toBe('local-subscription-id');
    expect(uploaded[workflowTenantIdKey]).toBe('local-tenant-id');
  });
});
