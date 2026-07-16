/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { VSCodeProjectConfig } from './types';
import { deploySubpathSetting, funcVersionSetting, projectLanguageSetting } from '../../../../constants';
import { latestGAVersion, ProjectLanguage, ProjectPackageType, ProjectType, TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';
import { ext } from '../../../../extensionVariables';

/**
 * Generates the canonical settings.json content for a Logic App project.
 */
export function generateSettingsJson(config: VSCodeProjectConfig): Record<string, unknown> {
  const { projectType, projectPackageType, funcVersion, language, targetFramework } = config;
  const resolvedLanguage = language ?? (projectType === ProjectType.codeful ? ProjectLanguage.CSharp : ProjectLanguage.JavaScript);
  const resolvedVersion = funcVersion ?? latestGAVersion;

  const baseSettings: Record<string, unknown> = {
    [`${ext.prefix}.${projectLanguageSetting}`]: resolvedLanguage,
    [`${ext.prefix}.${funcVersionSetting}`]: resolvedVersion,
    'debug.internalConsoleOptions': 'neverOpen',
    'azureFunctions.suppressProject': true,
  };

  if (projectType === ProjectType.codeful) {
    const deploySubPathValue = path.posix.join('bin', 'Release', targetFramework ?? TargetFramework.NetFx, 'publish');
    return {
      ...baseSettings,
      'azureFunctions.deploySubpath': deploySubPathValue,
      'azureFunctions.preDeployTask': 'publish',
      'azureFunctions.projectSubpath': deploySubPathValue,
      'omnisharp.enableMsBuildLoadProjectsOnDemand': false,
      'omnisharp.disableMSBuildDiagnosticWarning': true,
    };
  }
  
  if (projectPackageType === ProjectPackageType.Nuget) {
    const deploySubPathValue = path.posix.join('bin', 'Release', targetFramework ?? TargetFramework.NetFx, 'publish');
    return {
      ...baseSettings,
      [`${ext.prefix}.${deploySubpathSetting}`]: deploySubPathValue,
      'azureFunctions.preDeployTask': 'publish',
    };
  }
  
  if (projectType === ProjectType.logicApp) {
    return {
      ...baseSettings,
      [`${ext.prefix}.${deploySubpathSetting}`]: '.',
    };
  }

  return baseSettings;
}
