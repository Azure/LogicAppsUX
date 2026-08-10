import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as verifyIsProject from '../verifyIsProject';
import { hostFileName, localSettingsFileName, workflowFileName } from '../../../constants';

describe('isLogicAppProject', () => {
  const projectPath = path.join('test', 'LogicApp');

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when the folder does not exist', async () => {
    vi.spyOn(fse, 'pathExists').mockResolvedValue(false);
    expect(await verifyIsProject.isLogicAppProject(projectPath)).toBe(false);
  });

  it('detects a codeless project via workflow.json even when host.json is missing', async () => {
    const workflowJsonPath = path.join(projectPath, 'stateful1', workflowFileName);
    // No host.json, no local.settings.json, no .csproj on disk — only the workflow folder exists.
    vi.spyOn(fse, 'pathExists').mockImplementation(async (p: fse.PathLike) => {
      const s = String(p);
      return s === projectPath || s === workflowJsonPath;
    });
    vi.spyOn(fse, 'readdir').mockImplementation(async (p: fse.PathLike) => (String(p) === projectPath ? ['stateful1'] : []));
    vi.spyOn(fse, 'readFile').mockImplementation(async (p: fse.PathLike) => {
      if (String(p) === workflowJsonPath) {
        return JSON.stringify({
          definition: {
            $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          },
        });
      }
      return '';
    });

    expect(await verifyIsProject.isLogicAppProject(projectPath)).toBe(true);
  });

  it('detects a codeless project even when a present host.json is corrupted', async () => {
    const workflowJsonPath = path.join(projectPath, 'stateful1', workflowFileName);
    vi.spyOn(fse, 'pathExists').mockImplementation(async (p: fse.PathLike) => {
      const s = String(p);
      return s === projectPath || s === path.join(projectPath, hostFileName) || s === workflowJsonPath;
    });
    vi.spyOn(fse, 'readdir').mockImplementation(async (p: fse.PathLike) => (String(p) === projectPath ? [hostFileName, 'stateful1'] : []));
    vi.spyOn(fse, 'readFile').mockImplementation(async (p: fse.PathLike) => {
      if (String(p) === path.join(projectPath, hostFileName)) {
        return 'this is not valid json {';
      }
      if (String(p) === workflowJsonPath) {
        return JSON.stringify({
          definition: {
            $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          },
        });
      }
      return '';
    });

    expect(await verifyIsProject.isLogicAppProject(projectPath)).toBe(true);
  });

  it('detects a codeful project via its .csproj SDK reference regardless of the workflow .cs file name', async () => {
    const csprojPath = path.join(projectPath, 'MyLogicApp.csproj');
    // A codeful project is a .NET 8 project referencing the Logic Apps SDK; the workflow C# file
    // can be named anything (here, MyCustomWorkflow.cs — not workflow.cs). Detection is structural
    // (via the .csproj), so a literal workflow.cs is never required.
    vi.spyOn(fse, 'statSync').mockReturnValue({ isDirectory: () => true } as unknown as fse.Stats);
    vi.spyOn(fse, 'pathExists').mockImplementation(async (p: fse.PathLike) => String(p) === projectPath);
    vi.spyOn(fse, 'readdir').mockImplementation(async (p: fse.PathLike) =>
      String(p) === projectPath ? ['MyLogicApp.csproj', 'MyCustomWorkflow.cs', 'Program.cs'] : []
    );
    vi.spyOn(fse, 'readFile').mockImplementation(async (p: fse.PathLike) => {
      if (String(p) === csprojPath) {
        return [
          '<Project Sdk="Microsoft.NET.Sdk">',
          '  <PropertyGroup><TargetFramework>net8</TargetFramework></PropertyGroup>',
          '  <ItemGroup><PackageReference Include="Microsoft.Azure.Workflows.Sdk" Version="1.0.0-preview.1" /></ItemGroup>',
          '</Project>',
        ].join('\n');
      }
      return '';
    });

    expect(await verifyIsProject.isLogicAppProject(projectPath)).toBe(true);
  });

  it('does not tag a plain Functions project (host.json present, no workflow signal)', async () => {
    const localSettingsPath = path.join(projectPath, localSettingsFileName);
    vi.spyOn(fse, 'pathExists').mockImplementation(async (p: fse.PathLike) => {
      const s = String(p);
      return s === projectPath || s === path.join(projectPath, hostFileName) || s === localSettingsPath;
    });
    vi.spyOn(fse, 'readdir').mockImplementation(async (p: fse.PathLike) =>
      String(p) === projectPath ? [hostFileName, localSettingsFileName, 'MyHttpFunction'] : []
    );
    vi.spyOn(fse, 'readFile').mockImplementation(async (p: fse.PathLike) => {
      if (String(p) === localSettingsPath) {
        return JSON.stringify({ Values: { FUNCTIONS_WORKER_RUNTIME: 'dotnet' } });
      }
      return '';
    });

    expect(await verifyIsProject.isLogicAppProject(projectPath)).toBe(false);
  });

  it('does not tag a folder that only has the codeful workspace setting but no .csproj', async () => {
    // WORKFLOW_CODEFUL_ENABLED lives in the gitignored local.settings.json and is no longer a
    // detection signal — without the authoritative .csproj SDK reference the folder is not a project.
    const localSettingsPath = path.join(projectPath, localSettingsFileName);
    vi.spyOn(fse, 'pathExists').mockImplementation(async (p: fse.PathLike) => {
      const s = String(p);
      return s === projectPath || s === localSettingsPath;
    });
    vi.spyOn(fse, 'readdir').mockImplementation(async (p: fse.PathLike) =>
      String(p) === projectPath ? [localSettingsFileName, 'Program.cs'] : []
    );
    vi.spyOn(fse, 'readFile').mockImplementation(async (p: fse.PathLike) => {
      if (String(p) === localSettingsPath) {
        return JSON.stringify({ Values: { WORKFLOW_CODEFUL_ENABLED: 'true' } });
      }
      return '';
    });

    expect(await verifyIsProject.isLogicAppProject(projectPath)).toBe(false);
  });

  it('does not tag a folder whose workflow.json is not a Microsoft.Logic workflow', async () => {
    const workflowJsonPath = path.join(projectPath, 'wf', workflowFileName);
    vi.spyOn(fse, 'pathExists').mockImplementation(async (p: fse.PathLike) => {
      const s = String(p);
      return s === projectPath || s === workflowJsonPath;
    });
    vi.spyOn(fse, 'readdir').mockImplementation(async (p: fse.PathLike) => (String(p) === projectPath ? ['wf'] : []));
    vi.spyOn(fse, 'readFile').mockImplementation(async (p: fse.PathLike) =>
      String(p) === workflowJsonPath ? JSON.stringify({ definition: { $schema: 'https://example.com/not-logic.json#' } }) : ''
    );

    expect(await verifyIsProject.isLogicAppProject(projectPath)).toBe(false);
  });
});
