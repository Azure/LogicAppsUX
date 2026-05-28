import { beforeEach, describe, it, expect, vi, Mock } from 'vitest';
import { CodefulWorkflowCreateStep } from '../codefulWorkflowCreateStep';
import { IFunctionWizardContext, WorkerRuntime } from '@microsoft/vscode-extension-logic-apps';
import { setLocalAppSetting } from '../../../../../utils/appSettings/localSettings';
import { getGlobalSetting } from '../../../../../utils/vsCodeConfig/settings';
import * as fse from 'fs-extra';
import path from 'path';
import {
  appKindSetting,
  azureWebJobsStorageKey,
  functionsInprocNet8Enabled,
  functionsInprocNet8EnabledTrue,
  localEmulatorConnectionString,
  logicAppKind,
  workerRuntimeKey,
} from '../../../../../../constants';

vi.mock('../../../../../utils/vsCodeConfig/settings', () => ({
  getGlobalSetting: vi.fn(),
}));

describe('CodefulWorkflowCreateStep', async () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateAppSettings', async () => {
    it('update app settings with mock setLocalAppSetting', async () => {
      const mockContext: Partial<IFunctionWizardContext> = { projectPath: 'testPath' };
      const testCodefulWorkflowCreateStep = new CodefulWorkflowCreateStep();

      vi.mock('../../../../../utils/appSettings/localSettings', () => ({
        setLocalAppSetting: vi.fn().mockReturnValue(Promise.resolve()),
        removeAppKindFromLocalSettings: vi.fn(),
      }));

      testCodefulWorkflowCreateStep.updateAppSettings(mockContext as IFunctionWizardContext);
      expect(
        (setLocalAppSetting as unknown as Mock).mock.calls.some((call) => {
          return call[2] == workerRuntimeKey && call[3] == WorkerRuntime.Dotnet;
        })
      );
      expect(
        (setLocalAppSetting as unknown as Mock).mock.calls.some((call) => {
          return call[2] == functionsInprocNet8Enabled && call[3] == functionsInprocNet8EnabledTrue;
        })
      );
      expect(
        (setLocalAppSetting as unknown as Mock).mock.calls.some((call) => {
          return call[2] == appKindSetting && call[3] == logicAppKind;
        })
      );
      expect(
        (setLocalAppSetting as unknown as Mock).mock.calls.some((call) => {
          return call[2] == azureWebJobsStorageKey && call[1] == localEmulatorConnectionString;
        })
      );
    });
  });

  describe('addNugetConfig', () => {
    const projectPath = 'D:\\logicapp';
    const dependenciesPath = 'D:\\runtime-dependencies';
    const templateNugetConfig = `<?xml version="1.0" encoding="utf-8"?>
<configuration>
    <config>
        <add key="globalPackagesFolder" value=".nuget\\packages" />
    </config>
    <packageSources>
        <add key="current" value=<%= lspDirectory %> />
    </packageSources>
</configuration>`;

    it('writes the shared codeful NuGet config when nuget.config is missing', async () => {
      const testCodefulWorkflowCreateStep = new CodefulWorkflowCreateStep();
      vi.mocked(getGlobalSetting).mockReturnValue(dependenciesPath);
      vi.mocked(fse.pathExists).mockResolvedValue(false);
      vi.mocked(fse.readFile).mockResolvedValue(templateNugetConfig);

      await (testCodefulWorkflowCreateStep as any).addNugetConfig(projectPath);

      const writeCall = vi.mocked(fse.writeFile).mock.calls.find((call) => String(call[0]).endsWith('nuget.config'));
      expect(writeCall).toBeDefined();
      expect(writeCall?.[0]).toBe(path.join(projectPath, 'nuget.config'));
      expect(writeCall?.[1]).toContain('<add key="globalPackagesFolder" value=".nuget\\packages" />');
      expect(writeCall?.[1]).toContain(`<add key="current" value="${path.join(dependenciesPath, 'LanguageServerLogicApps')}" />`);
      expect(writeCall?.[1]).not.toContain('C:\\dev\\.packages');
    });

    it('merges the local SDK package source into an existing nuget.config without removing user sources', async () => {
      const testCodefulWorkflowCreateStep = new CodefulWorkflowCreateStep();
      const existingNugetConfig = `<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" protocolVersion="3" />
  </packageSources>
</configuration>`;
      vi.mocked(getGlobalSetting).mockReturnValue(dependenciesPath);
      vi.mocked(fse.pathExists).mockResolvedValue(true);
      vi.mocked(fse.readFile).mockImplementation(async (filePath: string) => {
        return String(filePath).includes('CodefulProjectTemplate') ? templateNugetConfig : existingNugetConfig;
      });

      await (testCodefulWorkflowCreateStep as any).addNugetConfig(projectPath);

      const writeCall = vi.mocked(fse.writeFile).mock.calls.find((call) => String(call[0]).endsWith('nuget.config'));
      expect(writeCall).toBeDefined();
      expect(writeCall?.[1]).toContain('<add key="nuget.org" value="https://api.nuget.org/v3/index.json" protocolVersion="3" />');
      expect(writeCall?.[1]).toContain('<add key="globalPackagesFolder" value=".nuget\\packages" />');
      expect(writeCall?.[1]).toContain(`<add key="current" value="${path.join(dependenciesPath, 'LanguageServerLogicApps')}" />`);
      expect(writeCall?.[1]).not.toContain('C:\\dev\\.packages');
    });
  });
});
