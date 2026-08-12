/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { describe, it, expect } from 'vitest';
import { generateSettingsJson } from '../vscodeSettings';
import type { VSCodeProjectConfig } from '../types';
import { ProjectLanguage, ProjectType, ProjectPackageType, TargetFramework } from '@microsoft/vscode-extension-logic-apps';

describe('generateSettingsJson', () => {
  describe('codeless project', () => {
    it('should match settings generated for a codeless Logic App project', () => {
      const config: VSCodeProjectConfig = {
        projectType: ProjectType.logicApp,
        projectPackageType: ProjectPackageType.Bundle,
        hasFuncBinaries: true,
      };
      const result = generateSettingsJson(config);

      expect(result).toEqual({
        'azureLogicAppsStandard.deploySubpath': '.',
        'azureLogicAppsStandard.projectLanguage': 'JavaScript',
        'azureLogicAppsStandard.projectRuntime': '~4',
        'debug.internalConsoleOptions': 'neverOpen',
        'azureFunctions.suppressProject': true,
      });
      expect(Object.keys(result)).toEqual([
        'azureLogicAppsStandard.deploySubpath',
        'azureLogicAppsStandard.projectLanguage',
        'azureLogicAppsStandard.projectRuntime',
        'debug.internalConsoleOptions',
        'azureFunctions.suppressProject',
      ]);
    });

    it('should default to JavaScript language', () => {
      const config: VSCodeProjectConfig = {
        projectType: ProjectType.logicApp,
        projectPackageType: ProjectPackageType.Bundle,
        hasFuncBinaries: true,
      };
      const result = generateSettingsJson(config);

      expect(result['azureLogicAppsStandard.projectLanguage']).toBe('JavaScript');
    });
  });

  describe('codeful project', () => {
    it('should add deploy/publish and OmniSharp settings', () => {
      const config: VSCodeProjectConfig = {
        projectType: ProjectType.codeful,
        projectPackageType: ProjectPackageType.Nuget,
        hasFuncBinaries: true,
        targetFramework: TargetFramework.Net8,
      };
      const result = generateSettingsJson(config);

      expect(result).toHaveProperty('azureLogicAppsStandard.deploySubpath');
      expect(result).not.toHaveProperty('azureLogicAppsStandard.preDeployTask');
      expect(result).toHaveProperty('omnisharp.enableMsBuildLoadProjectsOnDemand', false);
      expect(result).toHaveProperty('omnisharp.disableMSBuildDiagnosticWarning', true);
    });

    it('should use CSharp language for codeful', () => {
      const config: VSCodeProjectConfig = {
        projectType: ProjectType.codeful,
        projectPackageType: ProjectPackageType.Nuget,
        hasFuncBinaries: true,
      };
      const result = generateSettingsJson(config);

      expect(result['azureLogicAppsStandard.projectLanguage']).toBe('C#');
    });
  });

  describe('nuget project', () => {
    it('should add deploySubpath and preDeployTask without OmniSharp', () => {
      const config: VSCodeProjectConfig = {
        projectType: ProjectType.logicApp,
        projectPackageType: ProjectPackageType.Nuget,
        hasFuncBinaries: true,
        targetFramework: TargetFramework.Net8,
      };
      const result = generateSettingsJson(config);

      expect(result).toHaveProperty('azureLogicAppsStandard.deploySubpath');
      expect(result).toHaveProperty('azureLogicAppsStandard.preDeployTask');
      expect(result).not.toHaveProperty('omnisharp.enableMsBuildLoadProjectsOnDemand');
    });

    it('should match settings regenerated for a converted codeless NuGet project', () => {
      const config: VSCodeProjectConfig = {
        projectType: ProjectType.logicApp,
        projectPackageType: ProjectPackageType.Nuget,
        hasFuncBinaries: true,
        targetFramework: 'net8.0' as TargetFramework,
        language: ProjectLanguage.CSharp,
      };
      const result = generateSettingsJson(config);

      expect(result).toEqual({
        'azureLogicAppsStandard.deploySubpath': 'bin/Release/net8.0/publish',
        'azureLogicAppsStandard.projectLanguage': 'C#',
        'azureLogicAppsStandard.projectRuntime': '~4',
        'debug.internalConsoleOptions': 'neverOpen',
        'azureFunctions.suppressProject': true,
        'azureLogicAppsStandard.preDeployTask': 'publish',
      });
      expect(Object.keys(result)).toEqual([
        'azureLogicAppsStandard.deploySubpath',
        'azureLogicAppsStandard.preDeployTask',
        'azureLogicAppsStandard.projectLanguage',
        'azureLogicAppsStandard.projectRuntime',
        'debug.internalConsoleOptions',
        'azureFunctions.suppressProject',
      ]);
    });
  });
});
