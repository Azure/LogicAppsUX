import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TargetFramework, ProjectType } from '@microsoft/vscode-extension-logic-apps';

vi.mock('fs-extra');
vi.mock('vscode');
vi.mock('../../../../../constants', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
  };
});
vi.mock('../../../../../extensionVariables', () => ({
  ext: { outputChannel: { appendLog: vi.fn() } },
}));
vi.mock('../../../../../localize', () => ({
  localize: (_key: string, msg: string) => msg,
}));
vi.mock('../../../../utils/vsCodeConfig/launch', () => ({
  getDebugConfigs: vi.fn().mockReturnValue([]),
  updateDebugConfigs: vi.fn(),
}));
vi.mock('../../../../utils/workspace', () => ({
  getContainingWorkspace: vi.fn(),
  isMultiRootWorkspace: vi.fn().mockReturnValue(false),
}));
vi.mock('../../../../utils/funcCoreTools/funcVersion', () => ({
  tryGetLocalFuncVersion: vi.fn().mockResolvedValue('~4'),
}));
vi.mock('../../../../utils/debug', () => ({
  getCustomCodeRuntime: vi.fn((tf: string) => (tf === 'net472' ? 'clr' : 'coreclr')),
  getDebugConfiguration: vi.fn().mockReturnValue({}),
  usesPublishFolderProperty: vi.fn((pt: string, tf: string) => pt === 'customCode' && tf !== 'net472'),
}));

import { FunctionAppFilesStep } from '../functionAppFilesStep';

describe('FunctionAppFilesStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('template name mappings', () => {
    it('should map Net10 to FunctionsFileNet10 in csTemplateFileName', () => {
      const step = new FunctionAppFilesStep();
      const mapping = (step as any).csTemplateFileName;
      expect(mapping[TargetFramework.Net10]).toBe('FunctionsFileNet10');
    });

    it('should preserve Net8 mapping in csTemplateFileName', () => {
      const step = new FunctionAppFilesStep();
      const mapping = (step as any).csTemplateFileName;
      expect(mapping[TargetFramework.Net8]).toBe('FunctionsFileNet8');
    });

    it('should preserve NetFx mapping in csTemplateFileName', () => {
      const step = new FunctionAppFilesStep();
      const mapping = (step as any).csTemplateFileName;
      expect(mapping[TargetFramework.NetFx]).toBe('FunctionsFileNetFx');
    });

    it('should preserve rulesEngine mapping in csTemplateFileName', () => {
      const step = new FunctionAppFilesStep();
      const mapping = (step as any).csTemplateFileName;
      expect(mapping[ProjectType.rulesEngine]).toBe('RulesFunctionsFile');
    });

    it('should map Net10 to FunctionsProjNet10 in csprojTemplateFileName', () => {
      const step = new FunctionAppFilesStep();
      const mapping = (step as any).csprojTemplateFileName;
      expect(mapping[TargetFramework.Net10]).toBe('FunctionsProjNet10');
    });

    it('should preserve Net8 mapping in csprojTemplateFileName', () => {
      const step = new FunctionAppFilesStep();
      const mapping = (step as any).csprojTemplateFileName;
      expect(mapping[TargetFramework.Net8]).toBe('FunctionsProjNet8');
    });

    it('should preserve NetFx mapping in csprojTemplateFileName', () => {
      const step = new FunctionAppFilesStep();
      const mapping = (step as any).csprojTemplateFileName;
      expect(mapping[TargetFramework.NetFx]).toBe('FunctionsProjNetFx');
    });

    it('should preserve rulesEngine mapping in csprojTemplateFileName', () => {
      const step = new FunctionAppFilesStep();
      const mapping = (step as any).csprojTemplateFileName;
      expect(mapping[ProjectType.rulesEngine]).toBe('RulesFunctionsProj');
    });
  });

  describe('shouldPrompt', () => {
    it('should always return true', () => {
      const step = new FunctionAppFilesStep();
      expect(step.shouldPrompt()).toBe(true);
    });
  });
});
