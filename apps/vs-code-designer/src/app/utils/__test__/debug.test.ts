import { usesPublishFolderProperty } from '../debug';
import { describe, it, expect } from 'vitest';
import { ProjectType, TargetFramework } from '@microsoft/vscode-extension-logic-apps';

describe('debug', () => {
  describe('usesPublishFolderProperty', () => {
    it('should return true for custom code with .NET 8', () => {
      expect(usesPublishFolderProperty(ProjectType.customCode, TargetFramework.Net8)).toBe(true);
    });

    it('should return true for custom code with .NET 10', () => {
      expect(usesPublishFolderProperty(ProjectType.customCode, TargetFramework.Net10)).toBe(true);
    });

    it('should return false for custom code with .NET Framework', () => {
      expect(usesPublishFolderProperty(ProjectType.customCode, TargetFramework.NetFx)).toBe(false);
    });

    it('should return false for rules engine projects', () => {
      expect(usesPublishFolderProperty(ProjectType.rulesEngine, TargetFramework.Net8)).toBe(false);
    });

    it('should return false for standard logic app projects', () => {
      expect(usesPublishFolderProperty(ProjectType.logicApp, TargetFramework.Net8)).toBe(false);
    });
  });
});
