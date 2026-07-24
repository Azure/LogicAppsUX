/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type {
  FuncVersion,
  ProjectLanguage,
  ProjectPackageType,
  ProjectType,
  TargetFramework,
} from '@microsoft/vscode-extension-logic-apps';

export interface VSCodeProjectConfig {
  projectType: ProjectType;
  projectPackageType: ProjectPackageType;
  hasFuncBinaries: boolean;
  targetFramework?: TargetFramework;
  isDevContainer?: boolean;
  logicAppName?: string;
  funcVersion?: FuncVersion;
  language?: ProjectLanguage;
  customCodeTargetFramework?: TargetFramework;
}

export interface TasksJsonContent {
  version: string;
  tasks: Record<string, unknown>[];
  inputs?: TaskInputJson[];
}

export interface TaskDefinitionJson {
  label: string;
  type: string;
  command?: string;
  args?: string[];
  problemMatcher: string;
  isBackground?: boolean;
  dependsOn?: string;
  group?: { kind: string; isDefault: boolean };
  options?: Record<string, unknown>;
  windows?: Record<string, unknown>;
  linux?: Record<string, unknown>;
  osx?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface TaskInputJson {
  id: string;
  type: string;
  command: string;
}
