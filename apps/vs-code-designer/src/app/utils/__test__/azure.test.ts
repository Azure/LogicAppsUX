import { getResourceGroupFromId } from '../azure';
import { describe, it, expect, vi, Mock, beforeEach } from 'vitest';
import { getStorageConnectionString } from '../azure';
import type { IStorageAccountWizardContext } from '@microsoft/vscode-azext-azureutils';
import type { StorageAccount, StorageAccountListKeysResult, StorageManagementClient } from '@azure/arm-storage';
import { createStorageClient } from '../azureClients';
import { nonNullProp, nonNullValue } from '@microsoft/vscode-azext-utils';

describe('azure', () => {
  vi.mock('../azureClients', () => ({
    createStorageClient: vi.fn(),
  }));

  describe('getResourceGroupFromId', () => {
    it('should return the resource group from a valid storage account ID', () => {
      const id = '/subscriptions/123/resourceGroups/myResourceGroup/providers/Microsoft.Storage/storageAccounts/myStorageAccount';
      const result = getResourceGroupFromId(id);
      expect(result).toBe('myResourceGroup');
    });

    it('should throw an error for an invalid storage account ID', () => {
      const id = '/invalid/resource/id';
      expect(() => getResourceGroupFromId(id)).toThrow('Invalid Azure Resource Id');
    });
  });

  describe('getStorageConnectionString', () => {
    let mockClient: StorageManagementClient;

    beforeEach(() => {
      mockClient = {
        storageAccounts: {
          listKeys: vi.fn().mockResolvedValue({
            keys: [{ value: 'mockKey' }],
          } as StorageAccountListKeysResult),
        },
      } as unknown as StorageManagementClient;

      (nonNullProp as Mock).mockImplementation((obj, prop) => {
        if (!obj[prop]) {
          throw new Error();
        }
        return obj[prop];
      });

      (nonNullValue as Mock).mockImplementation((value) => {
        if (!value) {
          throw new Error();
        }
        return value;
      });
    });

    it('should return the storage connection string for a valid context', async () => {
      const mockContext: IStorageAccountWizardContext = {
        storageAccount: {
          id: '/subscriptions/123/resourceGroups/myResourceGroup/providers/Microsoft.Storage/storageAccounts/myStorageAccount',
          name: 'myStorageAccount',
        } as StorageAccount,
        environment: {
          storageEndpointSuffix: '.core.windows.net',
        },
      } as IStorageAccountWizardContext;

      (createStorageClient as Mock).mockResolvedValue(mockClient);
      (nonNullValue as Mock).mockImplementation((value) => value);

      const result = await getStorageConnectionString(mockContext);

      expect(result).toEqual({
        name: 'myStorageAccount',
        connectionString: 'DefaultEndpointsProtocol=https;AccountName=myStorageAccount;AccountKey=mockKey;EndpointSuffix=core.windows.net',
      });
    });

    it('should throw an error if storage account ID is invalid', async () => {
      const mockContext: IStorageAccountWizardContext = {
        storageAccount: {
          id: '/invalid/resource/id',
          name: 'myStorageAccount',
        } as StorageAccount,
        environment: {
          storageEndpointSuffix: '.core.windows.net',
        },
      } as IStorageAccountWizardContext;

      (createStorageClient as Mock).mockResolvedValue(mockClient);
      (nonNullValue as Mock).mockImplementation((value) => value);

      await expect(getStorageConnectionString(mockContext)).rejects.toThrow('Invalid Azure Resource Id');
    });

    it('should throw an error if context does not have storageAccount', async () => {
      const mockContext: IStorageAccountWizardContext = {
        environment: {
          storageEndpointSuffix: '.core.windows.net',
        },
      } as IStorageAccountWizardContext;

      (createStorageClient as Mock).mockResolvedValue(mockClient);

      await expect(getStorageConnectionString(mockContext)).rejects.toThrow();
    });

    it('should throw an error if storageAccount does not have a name', async () => {
      const mockContext: IStorageAccountWizardContext = {
        storageAccount: {
          id: '/subscriptions/123/resourceGroups/myResourceGroup/providers/Microsoft.Storage/storageAccounts/myStorageAccount',
        } as StorageAccount,
        environment: {
          storageEndpointSuffix: '.core.windows.net',
        },
      } as IStorageAccountWizardContext;

      (createStorageClient as Mock).mockResolvedValue(mockClient);

      await expect(getStorageConnectionString(mockContext)).rejects.toThrow();
    });
  });
});
