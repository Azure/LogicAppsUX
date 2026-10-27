// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as fs from 'fs';
import * as path from 'path';

export const CUSTOM_CODE_DOTNET_TARGETS = ['net8', 'net10'] as const;

export type CustomCodeDotNetTarget = (typeof CUSTOM_CODE_DOTNET_TARGETS)[number];

export interface CustomCodeDotNetLayout {
  target: CustomCodeDotNetTarget;
  dotNetVersionLabel: '.NET 8' | '.NET 10';
  expectedDotNetSetting: 'net8' | 'net10.0';
  expectedTargetFramework: 'net8' | 'net10.0';
  workspaceParentDir: string;
  workspaceName: string;
  workspaceDir: string;
  workspaceFilePath: string;
  appName: string;
  appDir: string;
  workflowName: string;
  workflowDir: string;
  customCodeFolderName: string;
  functionName: string;
  functionNamespace: 'MyCompany.Functions';
  functionProjectPath: string;
  localSettingsPath: string;
}

function isCustomCodeDotNetTarget(value: string): value is CustomCodeDotNetTarget {
  return (CUSTOM_CODE_DOTNET_TARGETS as readonly string[]).includes(value);
}

const getErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export function canonicalizeDotNetBinary(candidate: string, source: string): string {
  try {
    return fs.realpathSync(candidate);
  } catch (error: unknown) {
    throw new Error(`Failed to canonicalize dotnet binary from ${source} ("${candidate}"): ${getErrorMessage(error)}`);
  }
}

export function parseCustomCodeDotNetTarget(rawValue: string | undefined): CustomCodeDotNetTarget {
  const normalized = (rawValue || 'net8').trim().toLowerCase();
  if (!isCustomCodeDotNetTarget(normalized)) {
    throw new Error(`CUSTOMCODE_DOTNET_E2E_VERSION must be one of ${CUSTOM_CODE_DOTNET_TARGETS.join(' | ')}; got "${rawValue}"`);
  }
  return normalized;
}

export function parseCustomCodeDotNetTargets(rawValue: string | undefined): CustomCodeDotNetTarget[] {
  const raw = (rawValue ?? '').trim();
  if (!raw) {
    return [...CUSTOM_CODE_DOTNET_TARGETS];
  }

  const requested = raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const unknown = requested.filter((value) => !isCustomCodeDotNetTarget(value));
  if (unknown.length > 0 || requested.length === 0) {
    throw new Error(
      `CUSTOMCODE_DOTNET_E2E_VERSIONS must be a comma-separated list of ${CUSTOM_CODE_DOTNET_TARGETS.join('|')} (received "${raw}")`
    );
  }
  return requested as CustomCodeDotNetTarget[];
}

export function deriveCustomCodeDotNetLayout(target: CustomCodeDotNetTarget, tempDirectory: string): CustomCodeDotNetLayout {
  const workspaceParentDir = path.join(tempDirectory, 'la-e2e-test', `customcode-dotnet-${target}-parent`);
  const workspaceName = `cc${target}ws`;
  const workspaceDir = path.join(workspaceParentDir, workspaceName);
  const appName = `cc${target}app`;
  const appDir = path.join(workspaceDir, appName);
  const workflowName = `cc${target}wf`;
  const workflowDir = path.join(appDir, workflowName);
  const customCodeFolderName = `cc${target}folder`;
  const functionName = `cc${target}fn`;

  return {
    target,
    dotNetVersionLabel: target === 'net10' ? '.NET 10' : '.NET 8',
    expectedDotNetSetting: target === 'net10' ? 'net10.0' : 'net8',
    expectedTargetFramework: target === 'net10' ? 'net10.0' : 'net8',
    workspaceParentDir,
    workspaceName,
    workspaceDir,
    workspaceFilePath: path.join(workspaceDir, `${workspaceName}.code-workspace`),
    appName,
    appDir,
    workflowName,
    workflowDir,
    customCodeFolderName,
    functionName,
    functionNamespace: 'MyCompany.Functions',
    functionProjectPath: path.join(workspaceDir, customCodeFolderName, `${functionName}.csproj`),
    localSettingsPath: path.join(appDir, 'local.settings.json'),
  };
}
