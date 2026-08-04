import { describe, expect, it } from 'vitest';
import { getAppSettingsFromNode, getHybridSiteSecretsFromNode } from '../slotTreeUtils';

describe('slotTreeUtils', () => {
  describe('getAppSettingsFromNode', () => {
    it('resolves appSettingsTreeItem from a SlotTreeItem (via resourceTree)', () => {
      const mockAppSettings = { contextValue: 'appSettings' };
      const node = {
        resourceTree: {
          appSettingsTreeItem: mockAppSettings,
        },
      } as any;

      expect(getAppSettingsFromNode(node)).toBe(mockAppSettings);
    });

    it('resolves appSettingsTreeItem from a ResolvedAppResourceTreeItem (direct property)', () => {
      const mockAppSettings = { contextValue: 'appSettings' };
      const node = {
        appSettingsTreeItem: mockAppSettings,
        // No resourceTree — this is a resolved tree item from Azure Resources tree
      } as any;

      expect(getAppSettingsFromNode(node)).toBe(mockAppSettings);
    });

    it('prefers resourceTree.appSettingsTreeItem when both are present', () => {
      const resourceTreeAppSettings = { contextValue: 'fromResourceTree' };
      const directAppSettings = { contextValue: 'direct' };
      const node = {
        resourceTree: {
          appSettingsTreeItem: resourceTreeAppSettings,
        },
        appSettingsTreeItem: directAppSettings,
      } as any;

      expect(getAppSettingsFromNode(node)).toBe(resourceTreeAppSettings);
    });

    it('throws when appSettingsTreeItem cannot be resolved from either path', () => {
      const node = {} as any;

      expect(() => getAppSettingsFromNode(node)).toThrow('Could not resolve appSettingsTreeItem from the deploy target node.');
    });

    it('falls back to direct property when resourceTree exists but has no appSettingsTreeItem', () => {
      const mockAppSettings = { contextValue: 'appSettings' };
      const node = {
        resourceTree: {},
        appSettingsTreeItem: mockAppSettings,
      } as any;

      expect(getAppSettingsFromNode(node)).toBe(mockAppSettings);
    });
  });

  describe('getHybridSiteSecretsFromNode', () => {
    it('resolves secrets from a SlotTreeItem (via resourceTree)', () => {
      const secrets = [{ name: 'secret1', value: 'value1' }];
      const node = {
        resourceTree: {
          hybridSiteSecrets: secrets,
        },
      } as any;

      expect(getHybridSiteSecretsFromNode(node)).toBe(secrets);
    });

    it('resolves secrets from a ResolvedAppResourceTreeItem (direct property)', () => {
      const secrets = [{ name: 'secret1', value: 'value1' }];
      const node = {
        hybridSiteSecrets: secrets,
      } as any;

      expect(getHybridSiteSecretsFromNode(node)).toBe(secrets);
    });

    it('returns undefined when no secrets exist on either path', () => {
      const node = {} as any;

      expect(getHybridSiteSecretsFromNode(node)).toBeUndefined();
    });

    it('returns undefined when resourceTree exists but has no secrets, and node has no direct secrets', () => {
      const node = {
        resourceTree: {},
      } as any;

      expect(getHybridSiteSecretsFromNode(node)).toBeUndefined();
    });
  });
});
