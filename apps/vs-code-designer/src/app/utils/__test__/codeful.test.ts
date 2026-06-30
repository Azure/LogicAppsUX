import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { codefulProjectsExist, parseCsprojCopyToCodefulInfo } from '../codeful';

const mocks = vi.hoisted(() => ({
  pathExists: vi.fn(),
  readFile: vi.fn(),
  statSync: vi.fn(),
  readdir: vi.fn(),
  workspaceFolders: undefined as { uri: { fsPath: string } }[] | undefined,
}));

vi.mock('vscode', () => ({
  workspace: {
    get workspaceFolders() {
      return mocks.workspaceFolders;
    },
  },
}));

vi.mock('fs-extra', () => ({
  pathExists: mocks.pathExists,
  readdir: mocks.readdir,
  readFile: mocks.readFile,
  statSync: mocks.statSync,
}));

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
