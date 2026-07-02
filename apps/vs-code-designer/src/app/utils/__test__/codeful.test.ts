import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lspDirectory } from '../../../constants';
import {
  codefulProjectsExist,
  extractHttpTriggerName,
  hasHttpRequestTrigger,
  invalidateCodefulSdkCacheIfNeeded,
  parseCsprojCopyToCodefulInfo,
} from '../codeful';

const mocks = vi.hoisted(() => ({
  ensureDir: vi.fn(),
  getGlobalSetting: vi.fn(),
  pathExists: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
  remove: vi.fn(),
  statSync: vi.fn(),
  workspaceFolders: undefined as { uri: { fsPath: string } }[] | undefined,
  writeFile: vi.fn(),
}));

vi.mock('vscode', () => ({
  workspace: {
    get workspaceFolders() {
      return mocks.workspaceFolders;
    },
  },
}));

vi.mock('fs-extra', () => ({
  ensureDir: mocks.ensureDir,
  pathExists: mocks.pathExists,
  readdir: mocks.readdir,
  readFile: mocks.readFile,
  remove: mocks.remove,
  statSync: mocks.statSync,
  writeFile: mocks.writeFile,
}));

vi.mock('../vsCodeConfig/settings', () => ({
  getGlobalSetting: mocks.getGlobalSetting,
}));

vi.mock('../../../extensionVariables', () => ({
  ext: {
    outputChannel: {
      appendLog: vi.fn(),
    },
  },
}));

describe('invalidateCodefulSdkCacheIfNeeded', () => {
  const projectPath = 'D:\\workspace\\CodefulLogicApp';
  const runtimeDependenciesPath = 'D:\\runtime-dependencies';
  const lspDirectoryPath = path.join(runtimeDependenciesPath, lspDirectory);
  const nugetConfigPath = path.join(projectPath, 'nuget.config');
  const installedSdkHashMarkerPath = path.join(runtimeDependenciesPath, '.lspsdk-hash');
  const projectSdkHashMarkerPath = path.join(projectPath, '.nuget', '.logicapps-lspsdk-hash');
  const projectSdkPackagePath = path.join(projectPath, '.nuget', 'packages', 'microsoft.azure.workflows.sdk', '1.0.0-preview.1');
  const projectAssetsPath = path.join(projectPath, 'obj', 'project.assets.json');
  const projectNugetCachePath = path.join(projectPath, 'obj', 'project.nuget.cache');
  const localSettingsPath = path.join(projectPath, 'local.settings.json');
  const codefulLocalSettings = JSON.stringify({ IsEncrypted: false, Values: { WORKFLOW_CODEFUL_ENABLED: 'true' } });
  const currentSdkHash = 'current-sdk-hash';
  const codefulNugetConfig = `
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <config>
    <add key="globalPackagesFolder" value=".nuget\\packages" />
  </config>
  <packageSources>
    <add key="current" value="${lspDirectoryPath}" />
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
  </packageSources>
</configuration>`;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getGlobalSetting.mockReturnValue(runtimeDependenciesPath);
    mocks.ensureDir.mockResolvedValue(undefined);
    mocks.remove.mockResolvedValue(undefined);
    mocks.writeFile.mockResolvedValue(undefined);
    mocks.readdir.mockResolvedValue(['CodefulLogicApp.csproj']);
    mocks.statSync.mockReturnValue({ isDirectory: () => true });
    setExistingPaths([
      localSettingsPath,
      nugetConfigPath,
      installedSdkHashMarkerPath,
      projectSdkPackagePath,
      projectAssetsPath,
      projectNugetCachePath,
    ]);
    mocks.readFile.mockImplementation(async (filePath: string) => {
      if (filePath === localSettingsPath) {
        return codefulLocalSettings;
      }
      if (filePath === nugetConfigPath) {
        return codefulNugetConfig;
      }
      if (filePath === installedSdkHashMarkerPath) {
        return currentSdkHash;
      }
      return '';
    });
  });

  function setExistingPaths(paths: string[]): void {
    const existingPaths = new Set(paths);
    mocks.pathExists.mockImplementation(async (filePath: string) => existingPaths.has(filePath));
  }

  it('removes only the stale project-local SDK package when the installed VSIX SDK hash changes', async () => {
    const invalidated = await invalidateCodefulSdkCacheIfNeeded(projectPath);

    expect(invalidated).toBe(true);
    expect(mocks.remove).toHaveBeenCalledWith(projectSdkPackagePath);
    expect(mocks.remove).toHaveBeenCalledWith(projectAssetsPath);
    expect(mocks.remove).toHaveBeenCalledWith(projectNugetCachePath);
    expect(mocks.ensureDir).toHaveBeenCalledWith(path.join(projectPath, '.nuget'));
    expect(mocks.writeFile).toHaveBeenCalledWith(projectSdkHashMarkerPath, currentSdkHash);
  });

  it('keeps the project cache when its marker already matches the installed SDK hash', async () => {
    setExistingPaths([localSettingsPath, nugetConfigPath, installedSdkHashMarkerPath, projectSdkHashMarkerPath, projectSdkPackagePath]);
    mocks.readFile.mockImplementation(async (filePath: string) => {
      if (filePath === localSettingsPath) {
        return codefulLocalSettings;
      }
      if (filePath === nugetConfigPath) {
        return codefulNugetConfig;
      }
      if (filePath === installedSdkHashMarkerPath || filePath === projectSdkHashMarkerPath) {
        return currentSdkHash;
      }
      return '';
    });

    const invalidated = await invalidateCodefulSdkCacheIfNeeded(projectPath);

    expect(invalidated).toBe(false);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.writeFile).not.toHaveBeenCalled();
  });

  it('does not touch caches for projects that do not use the extension local SDK source and project-local packages folder', async () => {
    mocks.readFile.mockImplementation(async (filePath: string) => {
      if (filePath === localSettingsPath) {
        return codefulLocalSettings;
      }
      if (filePath === nugetConfigPath) {
        return codefulNugetConfig.replace(lspDirectoryPath, 'https://api.nuget.org/v3/index.json');
      }
      if (filePath === installedSdkHashMarkerPath) {
        return currentSdkHash;
      }
      return '';
    });

    const invalidated = await invalidateCodefulSdkCacheIfNeeded(projectPath);

    expect(invalidated).toBe(false);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.writeFile).not.toHaveBeenCalled();
  });
});

describe('parseCsprojCopyToCodefulInfo', () => {
  it('detects modern codeful targets that run on Build and Publish', () => {
    const info = parseCsprojCopyToCodefulInfo(`
<Project Sdk="Microsoft.NET.Sdk">
  <Target Name="CopyToCodefulFolder" AfterTargets="Build;Publish" />
  <Target Name="ReplaceLanguageNetCore" AfterTargets="Build;Publish" />
</Project>`);

    expect(info).toEqual({
      copyAfterTargets: 'Build;Publish',
      replaceLangAfterTargets: 'Build;Publish',
      runsOnBuild: true,
    });
  });

  it('keeps legacy Publish-only targets from being treated as Build hooks', () => {
    const info = parseCsprojCopyToCodefulInfo(`
<Project Sdk="Microsoft.NET.Sdk">
  <Target Name="CopyToCodefulFolder" AfterTargets="Publish" />
  <Target Name="ReplaceLanguageNetCore" AfterTargets="Publish" />
</Project>`);

    expect(info).toEqual({
      copyAfterTargets: 'Publish',
      replaceLangAfterTargets: 'Publish',
      runsOnBuild: false,
    });
  });

  it('ignores commented-out targets when reading project files', () => {
    const info = parseCsprojCopyToCodefulInfo(`
<Project Sdk="Microsoft.NET.Sdk">
  <!-- <Target Name="CopyToCodefulFolder" AfterTargets="Build;Publish" /> -->
  <Target Name="CopyToCodefulFolder" AfterTargets="Publish" />
  <Target Name="ReplaceLanguageNetCore" AfterTargets="Build;Publish" />
</Project>`);

    expect(info).toEqual({
      copyAfterTargets: 'Publish',
      replaceLangAfterTargets: 'Build;Publish',
      runsOnBuild: false,
    });
  });
});

describe('codefulProjectsExist', () => {
  const codefulSettingsJson = JSON.stringify({
    IsEncrypted: false,
    Values: { WORKFLOW_CODEFUL_ENABLED: 'true' },
  });
  const nonCodefulSettingsJson = JSON.stringify({
    IsEncrypted: false,
    Values: { AzureWebJobsStorage: 'UseDevelopmentStorage=true' },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.workspaceFolders = undefined;
  });

  it('returns false when there are no workspace folders', async () => {
    mocks.workspaceFolders = undefined;

    const result = await codefulProjectsExist();

    expect(result).toBe(false);
  });

  it('returns false when workspace folders array is empty', async () => {
    mocks.workspaceFolders = [];

    const result = await codefulProjectsExist();

    expect(result).toBe(false);
  });

  it('returns true when a workspace folder has WORKFLOW_CODEFUL_ENABLED', async () => {
    const folderPath = 'D:\\workspace\\codeful-project';
    mocks.workspaceFolders = [{ uri: { fsPath: folderPath } }];
    mocks.pathExists.mockResolvedValue(true);
    mocks.readFile.mockResolvedValue(codefulSettingsJson);

    const result = await codefulProjectsExist();

    expect(result).toBe(true);
    expect(mocks.pathExists).toHaveBeenCalledWith(path.join(folderPath, 'local.settings.json'));
  });

  it('returns false when workspace folder does not have WORKFLOW_CODEFUL_ENABLED', async () => {
    const folderPath = 'D:\\workspace\\standard-project';
    mocks.workspaceFolders = [{ uri: { fsPath: folderPath } }];
    mocks.pathExists.mockResolvedValue(true);
    mocks.readFile.mockResolvedValue(nonCodefulSettingsJson);

    const result = await codefulProjectsExist();

    expect(result).toBe(false);
  });

  it('returns false when WORKFLOW_CODEFUL_ENABLED is set to "false"', async () => {
    const folderPath = 'D:\\workspace\\disabled-codeful-project';
    mocks.workspaceFolders = [{ uri: { fsPath: folderPath } }];
    mocks.pathExists.mockResolvedValue(true);
    mocks.readFile.mockResolvedValue(JSON.stringify({ IsEncrypted: false, Values: { WORKFLOW_CODEFUL_ENABLED: 'false' } }));

    const result = await codefulProjectsExist();

    expect(result).toBe(false);
  });

  it('returns true when at least one of multiple folders is codeful', async () => {
    const standardPath = 'D:\\workspace\\standard-project';
    const codefulPath = 'D:\\workspace\\codeful-project';
    mocks.workspaceFolders = [{ uri: { fsPath: standardPath } }, { uri: { fsPath: codefulPath } }];
    mocks.pathExists.mockResolvedValue(true);
    mocks.readFile.mockImplementation(async (filePath: string) => {
      if (filePath === path.join(codefulPath, 'local.settings.json')) {
        return codefulSettingsJson;
      }
      return nonCodefulSettingsJson;
    });

    const result = await codefulProjectsExist();

    expect(result).toBe(true);
  });

  it('returns false when local.settings.json does not exist', async () => {
    mocks.workspaceFolders = [{ uri: { fsPath: 'D:\\workspace\\empty-project' } }];
    mocks.pathExists.mockResolvedValue(false);

    const result = await codefulProjectsExist();

    expect(result).toBe(false);
  });

  it('returns false when local.settings.json contains invalid JSON', async () => {
    mocks.workspaceFolders = [{ uri: { fsPath: 'D:\\workspace\\broken-project' } }];
    mocks.pathExists.mockResolvedValue(true);
    mocks.readFile.mockResolvedValue('not valid json');

    const result = await codefulProjectsExist();

    expect(result).toBe(false);
  });
});

describe('codeful HTTP trigger detection', () => {
  it('detects HTTP triggers that use the static WorkflowTriggers accessor', () => {
    const workflowContent = `
      var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger("manual");
    `;

    expect(hasHttpRequestTrigger(workflowContent)).toBe(true);
    expect(extractHttpTriggerName(workflowContent)).toBe('manual');
  });

  it('detects HTTP triggers that use the constructor-based WorkflowBuiltInTriggers accessor', () => {
    const workflowContent = `
      var trigger = new WorkflowBuiltInTriggers().CreateHttpTrigger("manual");
    `;

    expect(hasHttpRequestTrigger(workflowContent)).toBe(true);
    expect(extractHttpTriggerName(workflowContent)).toBe('manual');
  });

  it('ignores commented constructor-based HTTP triggers', () => {
    const workflowContent = `
      // var trigger = new WorkflowBuiltInTriggers().CreateHttpTrigger("manual");
      var trigger = new WorkflowBuiltInTriggers().CreateTimerTrigger();
    `;

    expect(hasHttpRequestTrigger(workflowContent)).toBe(false);
    expect(extractHttpTriggerName(workflowContent)).toBeUndefined();
  });
});
