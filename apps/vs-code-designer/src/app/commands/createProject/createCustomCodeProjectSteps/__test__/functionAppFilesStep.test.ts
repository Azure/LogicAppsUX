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
import * as fs from 'fs-extra';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';

describe('FunctionAppFilesStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('template name mappings', () => {
    it('should map Net10 to FunctionsFileNet10 in csTemplateFileNames', () => {
      expect(csTemplateFileNames[TargetFramework.Net10]).toBe('FunctionsFileNet10');
    });

    it('should preserve Net8 mapping in csTemplateFileNames', () => {
      expect(csTemplateFileNames[TargetFramework.Net8]).toBe('FunctionsFileNet8');
    });

    it('should preserve NetFx mapping in csTemplateFileNames', () => {
      expect(csTemplateFileNames[TargetFramework.NetFx]).toBe('FunctionsFileNetFx');
    });

    it('should preserve rulesEngine mapping in csTemplateFileNames', () => {
      expect(csTemplateFileNames[ProjectType.rulesEngine]).toBe('RulesFunctionsFile');
    });

    it('should map Net10 to FunctionsProjNet10 in csprojTemplateFileNames', () => {
      expect(csprojTemplateFileNames[TargetFramework.Net10]).toBe('FunctionsProjNet10');
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

  describe('Program.cs generation via prompt', () => {
    function createMockContext(overrides: Partial<IProjectWizardContext> = {}): IProjectWizardContext {
      return {
        functionAppName: 'TestFunction',
        functionAppNamespace: 'TestNamespace',
        targetFramework: TargetFramework.Net10,
        logicAppName: 'TestLogicApp',
        version: '~4',
        workspacePath: '/mock/workspace',
        projectType: ProjectType.customCode,
        shouldCreateLogicAppProject: true,
        ...overrides,
      } as IProjectWizardContext;
    }

    beforeEach(() => {
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue('template with <%= namespace %> placeholder');
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.writeJson).mockResolvedValue(undefined);
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.pathExists).mockResolvedValue(false);
    });

    it('should create Program.cs for Net10 custom code project', async () => {
      const step = new FunctionAppFilesStep();
      const context = createMockContext({
        targetFramework: TargetFramework.Net10,
        projectType: ProjectType.customCode,
      });

      await step.prompt(context);

      const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
      const programCsCall = writeFileCalls.find((call) => String(call[0]).endsWith('Program.cs'));
      expect(programCsCall).toBeDefined();
      expect(String(programCsCall![1])).not.toContain('<%= namespace %>');
    });

    it('should replace namespace placeholder in Program.cs', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('namespace <%= namespace %>\n{\n    class Program {}\n}');
      const step = new FunctionAppFilesStep();
      const context = createMockContext({
        targetFramework: TargetFramework.Net10,
        projectType: ProjectType.customCode,
        functionAppNamespace: 'MyCompany.Functions',
      });

      await step.prompt(context);

      const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
      const programCsCall = writeFileCalls.find((call) => String(call[0]).endsWith('Program.cs'));
      expect(programCsCall).toBeDefined();
      expect(String(programCsCall![1])).toContain('namespace MyCompany.Functions');
      expect(String(programCsCall![1])).not.toContain('<%= namespace %>');
    });

    it('should not create Program.cs for Net8 custom code project', async () => {
      const step = new FunctionAppFilesStep();
      const context = createMockContext({
        targetFramework: TargetFramework.Net8,
        projectType: ProjectType.customCode,
      });

      await step.prompt(context);

      const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
      const programCsCall = writeFileCalls.find((call) => String(call[0]).endsWith('Program.cs'));
      expect(programCsCall).toBeUndefined();
    });

    it('should not create Program.cs for NetFx custom code project', async () => {
      const step = new FunctionAppFilesStep();
      const context = createMockContext({
        targetFramework: TargetFramework.NetFx,
        projectType: ProjectType.customCode,
      });

      await step.prompt(context);

      const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
      const programCsCall = writeFileCalls.find((call) => String(call[0]).endsWith('Program.cs'));
      expect(programCsCall).toBeUndefined();
    });

    it('should not create Program.cs for rulesEngine project even with Net10', async () => {
      const step = new FunctionAppFilesStep();
      const context = createMockContext({
        targetFramework: TargetFramework.Net10,
        projectType: ProjectType.rulesEngine,
      });

      await step.prompt(context);

      const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
      const programCsCall = writeFileCalls.find((call) => String(call[0]).endsWith('Program.cs'));
      expect(programCsCall).toBeUndefined();
    });
  });
});
