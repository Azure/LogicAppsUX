import { describe, it, expect } from 'vitest';
import { getResourceGroupFromId } from '../azure';

describe('azure', () => {
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
});
