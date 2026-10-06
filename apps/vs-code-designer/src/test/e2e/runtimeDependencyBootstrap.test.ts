import * as assert from 'assert';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { assertNoDialogAttempts, installDialogGuard } from './dialogGuard';
import { bootstrapRequest, snapshotBootstrapBinary, writeBootstrapAttestation } from './workspaceMultiRootBootstrap';

const logicAppsExtensionId = 'ms-azuretools.vscode-azurelogicapps';
const validateDependenciesCommand = 'azureLogicAppsStandard.validateAndInstallBinaries';
const outputChannel = vscode.window.createOutputChannel('Logic Apps @vscode/test-cli Runtime Dependencies');

installDialogGuard();

suite('Runtime Dependency Bootstrap', function () {
  this.timeout(600000);

  suiteTeardown(() => {
    outputChannel.dispose();
  });

  test('validates managed Func Core Tools in the configured dependency root', async () => {
    const runtimeDependenciesRoot = process.env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT;
    assert.ok(runtimeDependenciesRoot, 'LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT must be set for dependency bootstrap');

    const resolvedRoot = path.resolve(runtimeDependenciesRoot);
    const familyBootstrap = bootstrapRequest(process.env);
    if (familyBootstrap) {
      assert.strictEqual(
        fs.realpathSync(resolvedRoot),
        familyBootstrap.context.runtimeRoot,
        'Native bootstrap must use this current job-owned dependency root'
      );
    }
    log(`Runtime dependency root: ${resolvedRoot}`);
    assert.ok(
      !isUserAzureLogicAppsCache(resolvedRoot),
      `Dependency bootstrap must use an isolated test root, not the user cache: ${resolvedRoot}`
    );

    if (process.env.LA_E2E_CLI_EXPECT_EMPTY_RUNTIME_DEPENDENCIES_ROOT === '1') {
      assert.strictEqual(
        process.env.LA_E2E_CLI_EMPTY_RUNTIME_DEPENDENCIES_ROOT_CONFIRMED,
        '1',
        'The wrapper must confirm the isolated dependency root was empty before VS Code launched'
      );
      log('Wrapper confirmed dependency root started empty before VS Code launched');
    }

    const extension = vscode.extensions.getExtension(logicAppsExtensionId);
    assert.ok(extension, `Expected ${logicAppsExtensionId} to be loaded from the extension development path`);

    await extension.activate();
    assert.strictEqual(extension.isActive, true, `${logicAppsExtensionId} should activate before dependency validation`);

    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes(validateDependenciesCommand), `Missing command ${validateDependenciesCommand}`);

    log(`Executing ${validateDependenciesCommand}`);
    await vscode.commands.executeCommand(validateDependenciesCommand);

    const config = vscode.workspace.getConfiguration('azureLogicAppsStandard');
    const configuredFuncPath = config.get<string>('funcCoreToolsBinaryPath');
    assert.ok(configuredFuncPath, 'azureLogicAppsStandard.funcCoreToolsBinaryPath must be configured');

    const expectedFuncPath = path.join(resolvedRoot, 'FuncCoreTools', process.platform === 'win32' ? 'func.exe' : 'func');
    assert.strictEqual(
      normalize(configuredFuncPath),
      normalize(expectedFuncPath),
      `Configured func path should point at the isolated dependency root. Actual: ${configuredFuncPath}`
    );

    const before = familyBootstrap ? snapshotBootstrapBinary(familyBootstrap.context, configuredFuncPath) : undefined;
    const versions = probeFuncVersions(resolvedRoot, configuredFuncPath);
    log(`Func Core Tools version probe succeeded: ${versions.join(', ')}`);
    await assertNoDialogAttempts('runtime dependency bootstrap');
    if (familyBootstrap && before) {
      writeBootstrapAttestation(familyBootstrap, before, versions, vscode.version);
    }
  });
});

function probeFuncVersions(runtimeDependenciesRoot: string, configuredFuncPath: string): string[] {
  const requiredBinaries = getRequiredFuncCoreToolsBinaryPaths(runtimeDependenciesRoot);
  const missingRequiredBinaries = requiredBinaries.filter((candidate) => !fs.existsSync(candidate.path));
  assert.deepStrictEqual(
    missingRequiredBinaries,
    [],
    `Missing required Func Core Tools executable(s): ${JSON.stringify(missingRequiredBinaries)}\n${collectRuntimeDependencyDiagnostics(
      runtimeDependenciesRoot
    )}`
  );
  assert.strictEqual(
    normalize(configuredFuncPath),
    normalize(requiredBinaries[0].path),
    `Configured func path should point at the isolated dependency root launcher. Actual: ${configuredFuncPath}`
  );

  const versions: string[] = [];
  for (const candidate of requiredBinaries) {
    if (process.platform !== 'win32') {
      fs.chmodSync(candidate.path, 0o755);
    }

    const output = execFileSync(candidate.path, ['--version'], {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();

    assert.match(output, /^\d+\.\d+\.\d+/, `Unexpected func --version output from ${candidate.name} ${candidate.path}: ${output}`);
    versions.push(`${candidate.name} ${candidate.path}=${output}`);
  }

  return versions;
}

function getRequiredFuncCoreToolsBinaryPaths(runtimeDependenciesRoot: string): { name: string; path: string }[] {
  const executableName = process.platform === 'win32' ? 'func.exe' : 'func';
  const funcToolsRoot = path.join(runtimeDependenciesRoot, 'FuncCoreTools');
  return [
    { name: 'configured launcher', path: path.join(funcToolsRoot, executableName) },
    { name: 'in-proc8 worker host', path: path.join(funcToolsRoot, 'in-proc8', executableName) },
  ];
}

function getFuncCoreToolsCandidatePaths(runtimeDependenciesRoot: string): string[] {
  const executableName = process.platform === 'win32' ? 'func.exe' : 'func';
  const funcToolsRoot = path.join(runtimeDependenciesRoot, 'FuncCoreTools');
  const candidates = [
    path.join(funcToolsRoot, executableName),
    path.join(funcToolsRoot, 'in-proc8', executableName),
    path.join(funcToolsRoot, 'in-proc6', executableName),
  ];
  const pending = [funcToolsRoot];

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || !fs.existsSync(current)) {
      continue;
    }

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(entryPath);
      } else if (entry.name === executableName) {
        candidates.push(entryPath);
      }
    }
  }

  return [...new Set(candidates)];
}

function collectRuntimeDependencyDiagnostics(runtimeDependenciesRoot: string): string {
  const candidates = getFuncCoreToolsCandidatePaths(runtimeDependenciesRoot)
    .map((candidate) => `${fs.existsSync(candidate) ? 'exists' : 'missing'} ${candidate}`)
    .join('\n');
  return `Func Core Tools candidates:\n${candidates}`;
}

function isUserAzureLogicAppsCache(directory: string): boolean {
  const home = process.env.USERPROFILE ?? process.env.HOME;
  if (!home) {
    return false;
  }

  return normalize(directory) === normalize(path.join(home, '.azurelogicapps', 'dependencies'));
}

function normalize(value: string): string {
  const normalized = path.normalize(value);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function log(message: string): void {
  const line = `[runtime-deps-bootstrap] ${message}`;
  console.log(line);
  outputChannel.appendLine(line);
}
