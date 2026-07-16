/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { describe, it, expect, vi } from 'vitest';
import { generateTasksJson } from '../tasksGenerator';
import type { VSCodeProjectConfig } from '../types';
import { ProjectType, ProjectPackageType, TargetFramework } from '@microsoft/vscode-extension-logic-apps';

vi.mock('../../../codeless/funcHostTaskEnv', () => ({
  getFuncHostTaskEnv: (extras?: { cwd?: string }) => ({
    options: { ...(extras?.cwd ? { cwd: extras.cwd } : {}), env: { PATH: '${env:PATH}' } },
    windows: { options: { ...(extras?.cwd ? { cwd: extras.cwd } : {}), env: { PATH: 'win-path' } } },
    linux: { options: { ...(extras?.cwd ? { cwd: extras.cwd } : {}), env: { PATH: 'linux-path' } } },
    osx: { options: { ...(extras?.cwd ? { cwd: extras.cwd } : {}), env: { PATH: 'osx-path' } } },
  }),
}));

describe('generateTasksJson', () => {
  describe('codeless project', () => {
    const baseConfig: VSCodeProjectConfig = {
      projectType: ProjectType.logicApp,
      projectPackageType: ProjectPackageType.Bundle,
      hasFuncBinaries: true,
    };

    it('should generate tasks with generateDebugSymbols and func:host start', () => {
      const result = generateTasksJson(baseConfig);

      expect(result.version).toBe('2.0.0');
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].label).toBe('generateDebugSymbols');
      expect(result.tasks[1].label).toBe('func: host start');
    });

    it('should include inputs with getDebugSymbolDll', () => {
      const result = generateTasksJson(baseConfig);

      expect(result.inputs).toHaveLength(1);
      expect(result.inputs[0].id).toBe('getDebugSymbolDll');
      expect(result.inputs[0].command).toBe('azureLogicAppsStandard.getDebugSymbolDll');
    });

    it('should use shell type when binaries exist', () => {
      const result = generateTasksJson(baseConfig);
      const funcTask = result.tasks[1];

      expect(funcTask.type).toBe('shell');
      expect(funcTask.command).toBe('${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}');
      expect(funcTask.args).toEqual(['host', 'start']);
    });

    it('should use func type when binaries do not exist', () => {
      const result = generateTasksJson({ ...baseConfig, hasFuncBinaries: false });
      const funcTask = result.tasks[1];

      expect(funcTask.type).toBe('func');
      expect(funcTask.command).toBe('host start');
      expect(funcTask.args).toBeUndefined();
    });

    it('should include platform-keyed env options when binaries exist', () => {
      const result = generateTasksJson(baseConfig);
      const funcTask = result.tasks[1];

      expect(funcTask.options).toBeDefined();
      expect(funcTask.windows).toBeDefined();
      expect(funcTask.linux).toBeDefined();
      expect(funcTask.osx).toBeDefined();
    });

    it('should not include env options when binaries do not exist', () => {
      const result = generateTasksJson({ ...baseConfig, hasFuncBinaries: false });
      const funcTask = result.tasks[1];

      expect(funcTask.options).toBeUndefined();
      expect(funcTask.windows).toBeUndefined();
    });

    it('should suppress env options for devcontainer projects', () => {
      const result = generateTasksJson({ ...baseConfig, isDevContainer: true });
      const funcTask = result.tasks[1];

      expect(funcTask.options).toBeUndefined();
      expect(funcTask.windows).toBeUndefined();
      expect(funcTask.linux).toBeUndefined();
      expect(funcTask.osx).toBeUndefined();
    });

    it('should include group on func:host start for codeless', () => {
      const result = generateTasksJson(baseConfig);
      const funcTask = result.tasks[1];

      expect(funcTask.group).toEqual({ kind: 'build', isDefault: true });
    });

    it('should not include dependsOn for codeless func:host start', () => {
      const result = generateTasksJson(baseConfig);
      const funcTask = result.tasks[1];

      expect(funcTask.dependsOn).toBeUndefined();
    });
  });

  describe('customCode project', () => {
    it('should generate same structure as codeless', () => {
      const codeless = generateTasksJson({
        projectType: ProjectType.logicApp,
        projectPackageType: ProjectPackageType.Bundle,
        hasFuncBinaries: true,
      });
      const customCode = generateTasksJson({
        projectType: ProjectType.customCode,
        projectPackageType: ProjectPackageType.Bundle,
        hasFuncBinaries: true,
      });

      expect(customCode.tasks).toHaveLength(codeless.tasks.length);
      expect(customCode.tasks[0].label).toBe('generateDebugSymbols');
      expect(customCode.tasks[1].label).toBe('func: host start');
      expect(customCode.tasks[1].group).toEqual({ kind: 'build', isDefault: true });
    });
  });

  describe('nuget project', () => {
    const baseConfig: VSCodeProjectConfig = {
      projectType: ProjectType.logicApp,
      projectPackageType: ProjectPackageType.Nuget,
      hasFuncBinaries: true,
      targetFramework: TargetFramework.Net8,
    };

    it('should generate dotnet tasks with generateDebugSymbols', () => {
      const result = generateTasksJson(baseConfig);

      expect(result.tasks).toHaveLength(6);
      const labels = result.tasks.map((t) => t.label);
      expect(labels).toEqual(['generateDebugSymbols', 'clean', 'build', 'clean release', 'publish', 'func: host start']);
    });

    it('should have correct clean release args with clean subcommand', () => {
      const result = generateTasksJson(baseConfig);
      const cleanRelease = result.tasks.find((t) => t.label === 'clean release');

      expect(cleanRelease.args).toEqual([
        'clean',
        '--configuration',
        'Release',
        '/property:GenerateFullPaths=true',
        '/consoleloggerparameters:NoSummary',
      ]);
    });

    it('should have correct publish args', () => {
      const result = generateTasksJson(baseConfig);
      const publishTask = result.tasks.find((t) => t.label === 'publish');

      expect(publishTask.args).toEqual([
        'publish',
        '--configuration',
        'Release',
        '/property:GenerateFullPaths=true',
        '/consoleloggerparameters:NoSummary',
      ]);
      expect(publishTask.dependsOn).toBe('clean release');
    });

    it('should set func:host start to depend on build', () => {
      const result = generateTasksJson(baseConfig);
      const funcTask = result.tasks.find((t) => t.label === 'func: host start');

      expect(funcTask.dependsOn).toBe('build');
    });

    it('should not include group on func:host start for dotnet', () => {
      const result = generateTasksJson(baseConfig);
      const funcTask = result.tasks.find((t) => t.label === 'func: host start');

      expect(funcTask.group).toBeUndefined();
    });

    it('should include cwd in env options based on targetFramework', () => {
      const result = generateTasksJson(baseConfig);
      const funcTask = result.tasks.find((t) => t.label === 'func: host start');

      expect((funcTask.options as any).cwd).toBe('bin/Debug/net8');
    });

    it('should include inputs with getDebugSymbolDll', () => {
      const result = generateTasksJson(baseConfig);

      expect(result.inputs).toHaveLength(1);
      expect(result.inputs[0].id).toBe('getDebugSymbolDll');
    });
  });

  describe('codeful project', () => {
    it('should generate dotnet build tasks without generateDebugSymbols', () => {
      const result = generateTasksJson({
        projectType: ProjectType.codeful,
        projectPackageType: ProjectPackageType.Nuget,
        hasFuncBinaries: true,
        targetFramework: TargetFramework.Net8,
      });

      expect(result.tasks).toHaveLength(5);
      const labels = result.tasks.map((t) => t.label);
      expect(labels).toEqual(['clean', 'build', 'clean release', 'publish', 'func: host start']);
    });

    it('should not include inputs for codeful projects', () => {
      const result = generateTasksJson({
        projectType: ProjectType.codeful,
        projectPackageType: ProjectPackageType.Nuget,
        hasFuncBinaries: true,
        targetFramework: TargetFramework.Net8,
      });

      expect(result.inputs).toBeUndefined();
    });
  });
});
