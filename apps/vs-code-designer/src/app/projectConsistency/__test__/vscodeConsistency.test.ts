import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { FuncVersion, ProjectLanguage, ProjectPackageType, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import { type Uri, type WorkspaceFolder, workspace } from 'vscode';
import {
  enableProjectConsistencyChecksSetting,
  extensionsFileName,
  funcVersionSetting,
  launchFileName,
  projectLanguageSetting,
  settingsFileName,
  tasksFileName,
  vscodeFolderName,
} from '../../../constants';
import { generateExtensionsJson, generateLaunchJson, generateSettingsJson, generateTasksJson } from '../fileGenerators';
import { binariesExistSync } from '../../utils/binaries';
import { detectCustomCodeTargetFramework } from '../../utils/customCodeUtils';
import { writeFormattedJson } from '../../utils/fs';
import { detectProjectPackageType, detectProjectType } from '../../utils/project';
import { tryGetLogicAppProjectRoot } from '../../utils/verifyIsProject';
import { initProjectForVSCode } from '../../commands/initProjectForVSCode/initProjectForVSCode';
import { ensureVSCodeFiles } from '../vscodeConsistency';
import { getWorkspaceSetting, updateGlobalSetting, isProjectConsistencyCheckEnabled } from '../../utils/vsCodeConfig/settings';

vi.mock('../../utils/verifyIsProject', () => ({
  tryGetLogicAppProjectRoot: vi.fn(),
}));

vi.mock('../../utils/vsCodeConfig/settings', () => ({
  getWorkspaceSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
  isProjectConsistencyCheckEnabled: vi.fn().mockReturnValue(true),
}));

vi.mock('../../commands/initProjectForVSCode/initProjectForVSCode', () => ({
  initProjectForVSCode: vi.fn(),
}));

vi.mock('../../utils/project', () => ({
  detectProjectType: vi.fn(),
  detectProjectPackageType: vi.fn(),
}));

vi.mock('../../utils/customCodeUtils', () => ({
  detectCustomCodeTargetFramework: vi.fn(),
}));

vi.mock('../../utils/dotnet/dotnet', () => ({
  tryGetTargetFramework: vi.fn().mockResolvedValue(undefined),
  getDotnetRuntimeFromFunc: vi.fn().mockReturnValue('coreclr'),
  getDotnetRuntimeFromFramework: vi.fn().mockReturnValue('coreclr'),
}));

vi.mock('../../utils/binaries', () => ({
  binariesExistSync: vi.fn(),
}));

vi.mock('../../utils/fs', () => ({
  writeFormattedJson: vi.fn(),
}));

vi.mock('fs-extra', () => ({
  default: {},
  existsSync: vi.fn(),
  ensureDir: vi.fn(),
  readJson: vi.fn(),
}));

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [],
  },
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  // DialogResponses values must be distinct non-undefined objects so `===` checks in source work correctly.
  DialogResponses: {
    yes: { title: 'Yes' },
    no: { title: 'No' },
    dontWarnAgain: { title: "Don't warn again" },
  },
  // Stubs needed by transitive imports (e.g. initProjectForVSCode chain)
  AzureWizard: vi.fn(),
  AzureWizardExecuteStep: class {},
  AzureWizardPromptStep: class {},
  UserCancelledError: class extends Error {},
  nonNullProp: vi.fn((_obj: unknown, key: string) => key),
  nonNullOrEmptyValue: vi.fn((val: unknown) => val),
  openUrl: vi.fn(),
  parseError: vi.fn((e: unknown) => ({ message: String(e) })),
  callWithTelemetryAndErrorHandling: vi.fn(),
}));

// Re-import the mocked module values for use in test assertions
const { DialogResponses } = await import('@microsoft/vscode-azext-utils');

describe('vscodeConsistency', () => {
  const projectPath = path.join('/workspace', 'logicapp');
  let context: IActionContext;
  let showWarningMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    showWarningMessage = vi.fn();

    context = {
      telemetry: { properties: {}, suppressIfSuccessful: false },
      errorHandling: { suppressDisplay: false },
      ui: { showWarningMessage },
    } as unknown as IActionContext;

    (workspace as any).workspaceFolders = [createWorkspaceFolder(projectPath, 'logicapp')];
    vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue(projectPath);
    vi.mocked(detectProjectType).mockResolvedValue(ProjectType.logicApp);
    vi.mocked(detectProjectPackageType).mockResolvedValue(ProjectPackageType.Bundle);
    vi.mocked(detectCustomCodeTargetFramework).mockResolvedValue(undefined);
    vi.mocked(binariesExistSync).mockReturnValue(true);
    vi.mocked(isProjectConsistencyCheckEnabled).mockReturnValue(true);
    vi.mocked(fse.existsSync).mockReturnValue(true);
    vi.mocked(fse.ensureDir).mockResolvedValue(undefined);
    vi.mocked(getWorkspaceSetting).mockImplementation((key: string) => {
      switch (key) {
        case enableProjectConsistencyChecksSetting:
          return true;
        case enableProjectConsistencyChecksSetting:
          return true;
        case funcVersionSetting:
          return '~4';
        case projectLanguageSetting:
          return 'JavaScript';
        default:
          return undefined;
      }
    });
  });

  it('prompts to initialize when a required .vscode file is missing', async () => {
    vi.mocked(fse.existsSync).mockImplementation((filePath) => !String(filePath).endsWith(settingsFileName));
    showWarningMessage.mockResolvedValue(DialogResponses.yes);

    await ensureVSCodeFiles(context);

    expect(context.ui.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining('logicapp'),
      {},
      DialogResponses.yes,
      DialogResponses.dontWarnAgain
    );
    expect(initProjectForVSCode).toHaveBeenCalledWith(context, projectPath);
  });

  it('suppresses the initialization prompt when the warning setting is disabled', async () => {
    vi.mocked(fse.existsSync).mockImplementation((filePath) => !String(filePath).endsWith(tasksFileName));
    vi.mocked(isProjectConsistencyCheckEnabled).mockReturnValue(false);

    await ensureVSCodeFiles(context);

    expect(context.ui.showWarningMessage).not.toHaveBeenCalled();
    expect(initProjectForVSCode).not.toHaveBeenCalled();
  });

  it('offers dont-warn-again when initialization is declined permanently', async () => {
    vi.mocked(fse.existsSync).mockImplementation((filePath) => !String(filePath).endsWith(tasksFileName));
    showWarningMessage.mockImplementation(async (_message, _options, _yes, dontWarnAgain) => dontWarnAgain);

    await ensureVSCodeFiles(context);

    expect(showWarningMessage).toHaveBeenCalledWith(expect.any(String), {}, DialogResponses.yes, DialogResponses.dontWarnAgain);
  });

  it('does not prompt for freshness when files already match expected content', async () => {
    const folder = createWorkspaceFolder(projectPath, 'logicapp');
    const expectedConfig = {
      projectType: ProjectType.logicApp,
      projectPackageType: ProjectPackageType.Bundle,
      hasFuncBinaries: true,
      funcVersion: FuncVersion.v4,
      language: ProjectLanguage.JavaScript,
      logicAppName: folder.name,
    };

    vi.mocked(fse.readJson).mockImplementation(async (filePath) => {
      const fileName = String(filePath);
      if (fileName.endsWith(tasksFileName)) {
        return generateTasksJson(expectedConfig);
      }

      if (fileName.endsWith(launchFileName)) {
        return generateLaunchJson(expectedConfig);
      }

      if (fileName.endsWith(settingsFileName)) {
        return { ...generateSettingsJson(expectedConfig), 'custom.setting': true };
      }

      if (fileName.endsWith(extensionsFileName)) {
        return { recommendations: [...generateExtensionsJson().recommendations, 'custom.extension'] };
      }

      return {};
    });

    await ensureVSCodeFiles(context);

    expect(showWarningMessage).not.toHaveBeenCalled();
    expect(writeFormattedJson).not.toHaveBeenCalled();
  });

  it('rewrites all .vscode files when drift is detected and the user confirms', async () => {
    const folder = createWorkspaceFolder(projectPath, 'logicapp');
    vi.mocked(fse.readJson).mockImplementation(async (filePath) => {
      const fileName = String(filePath);
      if (fileName.endsWith(tasksFileName)) {
        return { version: 'stale', tasks: [] };
      }

      if (fileName.endsWith(launchFileName)) {
        return generateLaunchJson({
          projectType: ProjectType.logicApp,
          projectPackageType: ProjectPackageType.Bundle,
          hasFuncBinaries: true,
          funcVersion: '~4',
          language: 'JavaScript',
          logicAppName: folder.name,
        });
      }

      if (fileName.endsWith(settingsFileName)) {
        return generateSettingsJson({
          projectType: ProjectType.logicApp,
          projectPackageType: ProjectPackageType.Bundle,
          hasFuncBinaries: true,
          funcVersion: '~4',
          language: 'JavaScript',
          logicAppName: folder.name,
        });
      }

      return generateExtensionsJson();
    });
    showWarningMessage.mockResolvedValue(DialogResponses.yes);

    await ensureVSCodeFiles(context);

    expect(showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining('logicapp'),
      {},
      DialogResponses.yes,
      DialogResponses.dontWarnAgain
    );
    expect(fse.ensureDir).toHaveBeenCalledWith(path.join(projectPath, vscodeFolderName));
    expect(writeFormattedJson).toHaveBeenCalledTimes(4);
  });

  it('disables future freshness prompts when the user selects dont ask again', async () => {
    vi.mocked(fse.readJson).mockResolvedValue({ version: 'stale', tasks: [] });
    showWarningMessage.mockResolvedValue(DialogResponses.dontWarnAgain);

    await ensureVSCodeFiles(context);

    expect(updateGlobalSetting).toHaveBeenCalledWith(enableProjectConsistencyChecksSetting, false);
  });
});

function createWorkspaceFolder(fsPath: string, name: string): WorkspaceFolder {
  return {
    uri: { fsPath } as Uri,
    name,
    index: 0,
  };
}
