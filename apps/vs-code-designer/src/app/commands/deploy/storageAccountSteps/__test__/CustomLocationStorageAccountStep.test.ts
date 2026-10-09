import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageAccountCreateStep, StorageAccountListStep } from '@microsoft/vscode-azext-azureutils';
import { StorageOptions } from '@microsoft/vscode-extension-logic-apps';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { CustomLocationStorageAccountStep } from '../CustomLocationStorageAccountStep';

vi.mock('@microsoft/vscode-azext-azureutils', () => ({
  StorageAccountCreateStep: vi.fn(),
  StorageAccountListStep: vi.fn(),
  StorageAccountKind: { Storage: 'Storage', StorageV2: 'StorageV2', BlobStorage: 'BlobStorage' },
  StorageAccountPerformance: { Standard: 'Standard', Premium: 'Premium' },
  StorageAccountReplication: { LRS: 'LRS', ZRS: 'ZRS' },
}));

vi.mock('@microsoft/vscode-azext-azureappservice', () => ({
  AppInsightsCreateStep: vi.fn(),
  AppInsightsListStep: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  AzureWizardPromptStep: class {},
}));

vi.mock('../SQLStringNameStep', () => ({
  SQLStringNameStep: vi.fn(),
}));

describe('CustomLocationStorageAccountStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a StorageV2 account for basic hybrid creation', async () => {
    const step = new CustomLocationStorageAccountStep();
    await step.getSubWizard({
      useHybrid: true,
      storageType: StorageOptions.AzureStorage,
      advancedCreation: false,
    } as ILogicAppWizardContext);

    expect(StorageAccountCreateStep).toHaveBeenCalledWith(expect.objectContaining({ kind: 'StorageV2' }));
  });

  it('uses StorageV2 as the default kind for advanced hybrid creation', async () => {
    const step = new CustomLocationStorageAccountStep();
    await step.getSubWizard({
      useHybrid: true,
      storageType: StorageOptions.AzureStorage,
      advancedCreation: true,
    } as ILogicAppWizardContext);

    expect(StorageAccountListStep).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'StorageV2' }),
      expect.objectContaining({ kind: ['BlobStorage'] })
    );
  });
});
