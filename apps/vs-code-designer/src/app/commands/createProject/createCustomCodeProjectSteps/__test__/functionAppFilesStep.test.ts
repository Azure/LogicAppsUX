import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TargetFramework, ProjectType } from '@microsoft/vscode-extension-logic-apps';

vi.mock('fs-extra', () => ({
  writeFile: vi.fn(() => Promise.resolve()),
  ensureDir: vi.fn(() => Promise.resolve()),
  readFile: vi.fn(() => Promise.resolve('')),
  pathExists: vi.fn(() => Promise.resolve(false)),
  existsSync: vi.fn(() => false),
  readdir: vi.fn(),
  stat: vi.fn(),
  writeJson: vi.fn(() => Promise.resolve()),
  copyFile: vi.fn(() => Promise.resolve()),
  readJson: vi.fn(() => Promise.resolve({})),
}));
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
import { csTemplateFileNames, csprojTemplateFileNames } from '../../../../utils/functionProjectFiles';

describe('FunctionAppFilesStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('template name mappings', () => {
    it('should preserve Net8 mapping in csTemplateFileNames', () => {
      expect(csTemplateFileNames[TargetFramework.Net8]).toBe('FunctionsFileNet8');
    });

    it('should preserve NetFx mapping in csTemplateFileNames', () => {
      expect(csTemplateFileNames[TargetFramework.NetFx]).toBe('FunctionsFileNetFx');
    });

    it('should preserve rulesEngine mapping in csTemplateFileNames', () => {
      expect(csTemplateFileNames[ProjectType.rulesEngine]).toBe('RulesFunctionsFile');
    });

    it('should preserve Net8 mapping in csprojTemplateFileNames', () => {
      expect(csprojTemplateFileNames[TargetFramework.Net8]).toBe('FunctionsProjNet8');
    });

    it('should preserve NetFx mapping in csprojTemplateFileNames', () => {
      expect(csprojTemplateFileNames[TargetFramework.NetFx]).toBe('FunctionsProjNetFx');
    });

    it('should preserve rulesEngine mapping in csprojTemplateFileNames', () => {
      expect(csprojTemplateFileNames[ProjectType.rulesEngine]).toBe('RulesFunctionsProj');
    });
  });

  describe('shouldPrompt', () => {
    it('should always return true', () => {
      const step = new FunctionAppFilesStep();
      expect(step.shouldPrompt()).toBe(true);
    });
  });
});
