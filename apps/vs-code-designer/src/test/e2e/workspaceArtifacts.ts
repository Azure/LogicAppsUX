import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import type { CodefulControlVariant } from './createWorkspaceTypes';

const dotnetBinaryPathSetting = '${config:azureLogicAppsStandard.dotnetBinaryPath}';
const funcCoreToolsBinaryPathSetting = '${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}';
const logicAppsGetDebugSymbolDllCommand = 'azureLogicAppsStandard.getDebugSymbolDll';
const logicAppsPickProcessCommand = 'azureLogicAppsStandard.pickFuncProcess';
const funcHostStartTaskLabel = 'func: host start';

interface TaskJson extends Record<string, unknown> {
  label?: string;
  command?: string;
  args?: string[];
  type?: string;
  problemMatcher?: string;
  dependsOn?: string;
  group?: Record<string, unknown>;
  isBackground?: boolean;
  options?: Record<string, unknown>;
  windows?: Record<string, unknown>;
  linux?: Record<string, unknown>;
  osx?: Record<string, unknown>;
}

interface LaunchJson {
  version?: string;
  configurations?: Record<string, unknown>[];
}

interface TasksJson {
  version?: string;
  tasks?: TaskJson[];
  inputs?: unknown;
}

export function hasCsproj(folderPath: string): boolean {
  return fs.existsSync(folderPath) && fs.readdirSync(folderPath).some((entry) => entry.endsWith('.csproj'));
}

export function requiredValue(value: string | undefined): string {
  assert.ok(value, 'Expected required workspace creation value to be defined');
  return value;
}

export async function waitForPathExists(filePath: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (fs.existsSync(filePath)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const parentPath = path.dirname(filePath);
  const parentContents = fs.existsSync(parentPath) ? fs.readdirSync(parentPath) : ['(parent missing)'];
  assert.fail(`Timed out waiting for generated path ${filePath}. Parent contents: ${JSON.stringify(parentContents)}`);
}

export function readJsonFile<T>(filePath: string): T {
  assert.ok(fs.existsSync(filePath), `Expected JSON file to exist: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

export function getCodefulCsprojPath(appDir: string): string {
  const csprojFiles = fs.readdirSync(appDir).filter((name) => name.endsWith('.csproj'));
  assert.strictEqual(csprojFiles.length, 1, `Expected exactly one codeful .csproj in ${appDir}, found ${csprojFiles.join(', ')}`);
  const csprojFile = csprojFiles[0];
  assert.ok(csprojFile, `Expected a codeful .csproj in ${appDir}`);
  return path.join(appDir, csprojFile);
}

export function applyCodefulControlVariantToProject(appDir: string, variant: CodefulControlVariant | undefined): void {
  if (variant !== 'legacy-control') {
    return;
  }

  const csprojPath = getCodefulCsprojPath(appDir);
  let csprojContent = fs.readFileSync(csprojPath, 'utf-8');

  for (const targetName of ['CopyToCodefulFolder', 'ReplaceLanguageNetCore']) {
    const targetMatch = csprojContent.match(new RegExp(`<Target\\b[^>]*Name=["']${targetName}["'][^>]*>`));
    assert.ok(targetMatch, `Legacy-control codeful case should find ${targetName} target in ${csprojPath}`);

    const targetTag = targetMatch[0];
    const updatedTargetTag = targetTag.replace(/(AfterTargets=["'])Build;Publish(["'])/, '$1Publish$2');
    assert.notStrictEqual(
      updatedTargetTag,
      targetTag,
      `Legacy-control codeful case should patch ${targetName} AfterTargets in ${csprojPath}`
    );
    csprojContent = csprojContent.replace(targetTag, updatedTargetTag);
  }

  fs.writeFileSync(csprojPath, csprojContent, 'utf-8');
}

export function patchCodefulProjectForDebugGuard(appDir: string, workflowName: string, context: string): void {
  const workflowFile = path.join(appDir, `${workflowName}.cs`);
  const programFile = path.join(appDir, 'Program.cs');

  for (const requiredPath of [workflowFile, programFile]) {
    assert.ok(fs.existsSync(requiredPath), `Missing generated ${context} codeful file required for debug guard: ${requiredPath}`);
  }

  const originalWorkflow = fs.readFileSync(workflowFile, 'utf-8');
  const namespaceName = originalWorkflow.match(/namespace\s+([A-Za-z_][A-Za-z0-9_.]*)/)?.[1];
  const className = originalWorkflow.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/)?.[1];
  assert.ok(namespaceName, `Could not read namespace from generated codeful workflow: ${workflowFile}`);
  assert.ok(className, `Could not read class from generated codeful workflow: ${workflowFile}`);

  fs.writeFileSync(
    workflowFile,
    `// -----------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// -----------------------------------------------------------

namespace ${namespaceName}
{
    using Microsoft.Azure.Workflows.Sdk;

    /// <summary>
    /// "${workflowName}" connector-free Stateful workflow for the debug task guard.
    /// </summary>
    public class ${className}
    {
        /// <summary>
        /// Gets a built-in HTTP request/response workflow definition.
        /// </summary>
        public FlowDefinition GetWorkflow()
        {
            var trigger = WorkflowTriggers.BuiltIn.CreateHttpTrigger();
            var response = WorkflowActions.BuiltIn.Response(responseBody: () => "ok");
            var workflow = trigger.Then(response);

            return WorkflowFactory.CreateStatefulWorkflow("${workflowName}", workflow);
        }
    }
}
`,
    'utf-8'
  );

  const originalProgram = fs.readFileSync(programFile, 'utf-8');
  const patchedProgram = originalProgram.replace(/^\s*services\.AddWorkflowProviders\(typeof\(Program\)\.Assembly\);\r?\n/m, '');
  assert.ok(
    patchedProgram !== originalProgram || !originalProgram.includes('AddWorkflowProviders'),
    `Could not remove stale AddWorkflowProviders call from ${programFile}`
  );
  fs.writeFileSync(programFile, patchedProgram, 'utf-8');

  for (const connectionArtifact of ['connections.json', 'parameters.json']) {
    const artifactPath = path.join(appDir, connectionArtifact);
    if (fs.existsSync(artifactPath)) {
      fs.rmSync(artifactPath, { force: true });
    }
  }
}

export function assertCodefulControlVariant(appDir: string, variant: CodefulControlVariant | undefined, context: string): void {
  const csprojContent = fs.readFileSync(getCodefulCsprojPath(appDir), 'utf-8');
  const expectedControlVariant = variant ?? 'modern-control';

  for (const targetName of ['CopyToCodefulFolder', 'ReplaceLanguageNetCore']) {
    const afterTargets = getCsprojTargetAfterTargets(csprojContent, targetName);
    if (expectedControlVariant === 'legacy-control') {
      assert.strictEqual(afterTargets, 'Publish', `${context} should keep ${targetName} as a legacy Publish-only target`);
    } else {
      const targetTokens = getAfterTargetsTokens(afterTargets);
      assert.ok(
        targetTokens.includes('Build') && targetTokens.includes('Publish'),
        `${context} should keep ${targetName} on the modern Build;Publish target. Actual: ${afterTargets ?? '(missing)'}`
      );
    }
  }
}

export function assertConvertedNugetProject(appDir: string, appName: string, workflowName: string): void {
  const csprojPath = path.join(appDir, `${appName}.csproj`);
  const tasksPath = path.join(appDir, '.vscode', 'tasks.json');
  const launchPath = path.join(appDir, '.vscode', 'launch.json');
  const settingsPath = path.join(appDir, '.vscode', 'settings.json');
  const extensionsPath = path.join(appDir, '.vscode', 'extensions.json');

  assert.ok(fs.existsSync(csprojPath), `NuGet conversion should create ${csprojPath}`);
  assert.ok(fs.existsSync(tasksPath), 'NuGet conversion should regenerate .vscode/tasks.json');
  assert.ok(fs.existsSync(launchPath), 'NuGet conversion should regenerate .vscode/launch.json');
  assert.ok(fs.existsSync(settingsPath), 'NuGet conversion should regenerate .vscode/settings.json');
  assert.ok(fs.existsSync(extensionsPath), 'NuGet conversion should regenerate .vscode/extensions.json');
  assert.ok(fs.existsSync(path.join(appDir, 'host.json')), 'NuGet conversion should restore host.json');
  assert.ok(fs.existsSync(path.join(appDir, 'local.settings.json')), 'NuGet conversion should restore local.settings.json');
  assert.ok(!fs.existsSync(path.join(appDir, 'host.json-copy')), 'NuGet conversion should not leave host.json-copy behind');
  assert.ok(
    !fs.existsSync(path.join(appDir, 'local.settings.json-copy')),
    'NuGet conversion should not leave local.settings.json-copy behind'
  );

  const csprojContent = fs.readFileSync(csprojPath, 'utf-8');
  const targetFramework = csprojContent.match(/<TargetFramework>(net(?:6\.0|8\.0|10\.0))<\/TargetFramework>/)?.[1];
  assert.ok(targetFramework, 'NuGet .csproj should target a supported .NET framework');
  assert.ok(csprojContent.includes('<AzureFunctionsVersion>v4</AzureFunctionsVersion>'), 'NuGet .csproj should target Azure Functions v4');
  assert.ok(csprojContent.includes('Include="Microsoft.NET.Sdk.Functions"'), 'NuGet .csproj should reference Microsoft.NET.Sdk.Functions');
  assert.ok(
    csprojContent.includes('Include="Microsoft.Azure.Workflows.WebJobs.Extension"'),
    'NuGet .csproj should reference Microsoft.Azure.Workflows.WebJobs.Extension'
  );
  assert.match(
    csprojContent,
    new RegExp(
      `Update="${escapeRegExp(workflowName)}[/\\\\]\\*\\*[/\\\\]\\*\\.\\*"[\\s\\S]*<CopyToOutputDirectory>PreserveNewest<\\/CopyToOutputDirectory>`
    ),
    'NuGet .csproj should copy the workflow folder to output'
  );

  const tasks = readJsonFile<TasksJson>(tasksPath);
  assert.strictEqual(tasks.version, '2.0.0', 'NuGet tasks.json should use VS Code tasks schema 2.0.0');
  const taskList = assertRecordArray<TaskJson>(tasks.tasks, 'NuGet tasks.json tasks');
  assertTaskLabels(taskList, ['generateDebugSymbols', 'clean', 'build', 'clean release', 'publish', funcHostStartTaskLabel]);
  assert.deepStrictEqual(tasks.inputs, [
    {
      id: 'getDebugSymbolDll',
      type: 'command',
      command: logicAppsGetDebugSymbolDllCommand,
    },
  ]);
  assertDotnetBuildTaskChain(taskList);
  assertFuncHostStartTask(requiredTask(taskList, funcHostStartTaskLabel), 'build', targetFramework);

  const launch = readJsonFile<LaunchJson>(launchPath);
  assert.strictEqual(launch.version, '0.2.0', 'NuGet launch.json should use VS Code launch schema 0.2.0');
  assert.deepStrictEqual(launch.configurations, [
    {
      name: `Run/Debug logic app ${appName}`,
      type: 'coreclr',
      request: 'attach',
      processId: `\${command:${logicAppsPickProcessCommand}}`,
    },
  ]);

  const settings = readJsonFile<Record<string, unknown>>(settingsPath);
  assert.strictEqual(settings['azureLogicAppsStandard.deploySubpath'], `bin/Release/${targetFramework}/publish`);
  assert.strictEqual(settings['azureLogicAppsStandard.projectLanguage'], 'C#');
  assert.strictEqual(settings['azureLogicAppsStandard.projectRuntime'], '~4');
  assert.strictEqual(settings['debug.internalConsoleOptions'], 'neverOpen');
  assert.strictEqual(settings['azureFunctions.suppressProject'], true);
  assert.strictEqual(settings['azureLogicAppsStandard.preDeployTask'], 'publish');

  const extensions = readJsonFile<{ recommendations?: string[] }>(extensionsPath);
  assert.deepStrictEqual(extensions.recommendations, [
    'ms-azuretools.vscode-azurelogicapps',
    'ms-dotnettools.csharp',
    'ms-azuretools.vscode-azurefunctions',
    'ms-dotnettools.csdevkit',
  ]);
}

function getCsprojTargetAfterTargets(csprojContent: string, targetName: string): string | null {
  const targetMatch = csprojContent.match(new RegExp(`<Target\\b[^>]*Name=["']${targetName}["'][^>]*>`));
  if (!targetMatch) {
    return null;
  }

  const afterTargetsMatch = targetMatch[0].match(/\bAfterTargets=["']([^"']+)["']/);
  return afterTargetsMatch?.[1] ?? '';
}

function getAfterTargetsTokens(afterTargets: string | null): string[] {
  return (afterTargets ?? '')
    .split(';')
    .map((token) => token.trim())
    .filter(Boolean);
}

function assertRecordArray<T extends Record<string, unknown>>(value: unknown, context: string): T[] {
  assert.ok(Array.isArray(value), `${context} should be an array`);
  for (const item of value) {
    assert.ok(typeof item === 'object' && item !== null && !Array.isArray(item), `${context} items should be objects`);
  }
  return value as T[];
}

function assertTaskLabels(tasks: TaskJson[], expectedLabels: string[]): void {
  const actualLabels = tasks.map((task) => task.label);
  assert.deepStrictEqual([...actualLabels].sort(), [...expectedLabels].sort(), 'NuGet tasks.json should contain the stable task label set');
}

function assertDotnetBuildTaskChain(tasks: TaskJson[]): void {
  const clean = requiredTask(tasks, 'clean');
  assert.strictEqual(clean.type, 'process');
  assert.strictEqual(clean.command, dotnetBinaryPathSetting);
  assert.deepStrictEqual(clean.args, ['clean', '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary']);
  assert.strictEqual(clean.problemMatcher, '$msCompile');

  const build = requiredTask(tasks, 'build');
  assert.strictEqual(build.type, 'process');
  assert.strictEqual(build.command, dotnetBinaryPathSetting);
  assert.deepStrictEqual(build.args, ['build', '/property:GenerateFullPaths=true', '/consoleloggerparameters:NoSummary']);
  assert.strictEqual(build.dependsOn, 'clean');
  assert.deepStrictEqual(build.group, { kind: 'build', isDefault: true });
  assert.strictEqual(build.problemMatcher, '$msCompile');

  const cleanRelease = requiredTask(tasks, 'clean release');
  assert.strictEqual(cleanRelease.type, 'process');
  assert.strictEqual(cleanRelease.command, dotnetBinaryPathSetting);
  assert.deepStrictEqual(cleanRelease.args, [
    'clean',
    '--configuration',
    'Release',
    '/property:GenerateFullPaths=true',
    '/consoleloggerparameters:NoSummary',
  ]);
  assert.strictEqual(cleanRelease.problemMatcher, '$msCompile');

  const publish = requiredTask(tasks, 'publish');
  assert.strictEqual(publish.type, 'process');
  assert.strictEqual(publish.command, dotnetBinaryPathSetting);
  assert.deepStrictEqual(publish.args, [
    'publish',
    '--configuration',
    'Release',
    '/property:GenerateFullPaths=true',
    '/consoleloggerparameters:NoSummary',
  ]);
  assert.strictEqual(publish.dependsOn, 'clean release');
  assert.strictEqual(publish.problemMatcher, '$msCompile');
}

function assertFuncHostStartTask(task: TaskJson, expectedDependsOn: string | undefined, targetFramework = 'net8.0'): void {
  assert.strictEqual(task.problemMatcher, '$func-watch');
  assert.strictEqual(task.isBackground, true);
  assert.strictEqual(task.dependsOn, expectedDependsOn);
  assert.strictEqual(task.group, undefined);
  assert.strictEqual(task.type, 'shell');
  assert.strictEqual(task.command, funcCoreToolsBinaryPathSetting);
  assert.deepStrictEqual(task.args, ['host', 'start']);
  assertPlatformFuncTaskEnv(task, targetFramework);
}

function assertPlatformFuncTaskEnv(task: TaskJson, targetFramework: string): void {
  const platformBlocks = [
    ['windows', '\\NodeJs;', '\\DotNetSDK;', '${env:PATH}'],
    ['linux', '/NodeJs:', '/DotNetSDK:', '${env:PATH}'],
    ['osx', '/NodeJs:', '/DotNetSDK:', '${env:PATH}'],
  ] as const;

  for (const [platform, nodePath, dotnetPath, pathVariable] of platformBlocks) {
    const platformOptions = (task[platform] as { options?: { cwd?: string; env?: { PATH?: string } } } | undefined)?.options;
    assert.ok(platformOptions, `func host task should include ${platform} options`);
    assert.strictEqual(
      platformOptions?.cwd,
      `bin/Debug/${targetFramework}`,
      `${platform} func host task should run from ${targetFramework} output`
    );
    const platformPath = platformOptions?.env?.PATH;
    assert.ok(platformPath?.includes(nodePath), `${platform} func host PATH should include managed NodeJs path: ${platformPath ?? ''}`);
    assert.ok(
      platformPath?.includes(dotnetPath),
      `${platform} func host PATH should include managed DotNetSDK path: ${platformPath ?? ''}`
    );
    assert.ok(platformPath?.includes(pathVariable), `${platform} func host PATH should preserve inherited PATH: ${platformPath ?? ''}`);
  }

  const options = task.options as { cwd?: string; env?: { PATH?: string } } | undefined;
  assert.strictEqual(options?.cwd, `\${workspaceFolder}/bin/Debug/${targetFramework}`);
  assert.strictEqual(options?.env?.PATH, '${env:PATH}');
}

function requiredTask(tasks: TaskJson[], label: string): TaskJson {
  const task = tasks.find((candidate) => candidate.label === label);
  assert.ok(task, `Expected task ${label}. Tasks: ${JSON.stringify(tasks.map((candidate) => candidate.label))}`);
  return task;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
