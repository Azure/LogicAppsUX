import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import * as vm from 'vm';

const sourcePath = path.resolve(__dirname, '..', '..', '..', 'src', 'test', 'e2e', 'extensionStartupReadiness.ts');
const sourceText = fs.readFileSync(sourcePath, 'utf-8');
const source = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true);
const classifierFunctionNames = new Set([
  'classifyExtensionStartupReadiness',
  'getLatestLogBundleState',
  'isBundlePending',
  'isBundleReady',
]);

type ClassifierInput = {
  extensionActive: boolean;
  registeredCommands: string[];
  requiredCommands: string[];
  workbenchText: string;
  logText: string;
};

type ClassifierResult = {
  ready: boolean;
  reasons: string[];
};

function main(): void {
  const classify = loadClassifier();
  testReadyWhenActiveCommandsRegisteredAndNoBundleDownload(classify);
  testWaitsForInactiveExtension(classify);
  testWaitsForMissingCommands(classify);
  testWaitsForBundleDownloadFromWorkbenchText(classify);
  testWaitsForBundleDownloadFromLogicAppsLog(classify);
  testAcceptsBundleReadyAfterEarlierLogDownload(classify);
  testReportsActivationErrors(classify);
  console.log('[extensionStartupReadiness.unit] all tests passed');
}

function loadClassifier(): (input: ClassifierInput) => ClassifierResult {
  const selected = source.statements.filter(
    (node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && classifierFunctionNames.has(node.name?.text ?? '')
  );
  assert.strictEqual(selected.length, classifierFunctionNames.size, 'Expected classifier and helper functions to be extracted');

  const implementation = ts.transpileModule(
    selected
      .map((node) => (node.name?.text === 'classifyExtensionStartupReadiness' ? `export ${node.getText(source)}` : node.getText(source)))
      .join('\n'),
    {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }
  ).outputText;
  const exported: { classifyExtensionStartupReadiness?: (input: ClassifierInput) => ClassifierResult } = {};
  vm.runInNewContext(implementation, { exports: exported });
  assert.ok(exported.classifyExtensionStartupReadiness, 'Expected classifier export to load');
  return exported.classifyExtensionStartupReadiness;
}

function testReadyWhenActiveCommandsRegisteredAndNoBundleDownload(classify: (input: ClassifierInput) => ClassifierResult): void {
  const result = classify({
    extensionActive: true,
    registeredCommands: ['azureLogicAppsStandard.createWorkspace'],
    requiredCommands: ['azureLogicAppsStandard.createWorkspace'],
    workbenchText: 'Create workspace',
    logText: 'Azure Logic Apps (Standard) extension ready',
  });

  assert.strictEqual(result.ready, true);
  assert.deepStrictEqual([...result.reasons], []);
}

function testWaitsForInactiveExtension(classify: (input: ClassifierInput) => ClassifierResult): void {
  const result = classify({
    extensionActive: false,
    registeredCommands: ['azureLogicAppsStandard.createWorkspace'],
    requiredCommands: ['azureLogicAppsStandard.createWorkspace'],
    workbenchText: '',
    logText: '',
  });

  assert.strictEqual(result.ready, false);
  assert.ok(result.reasons.includes('extension-inactive'));
}

function testWaitsForMissingCommands(classify: (input: ClassifierInput) => ClassifierResult): void {
  const result = classify({
    extensionActive: true,
    registeredCommands: [],
    requiredCommands: ['azureLogicAppsStandard.createWorkspace', 'azureLogicAppsStandard.openDesigner'],
    workbenchText: '',
    logText: '',
  });

  assert.strictEqual(result.ready, false);
  assert.ok(result.reasons.includes('commands-missing:azureLogicAppsStandard.createWorkspace,azureLogicAppsStandard.openDesigner'));
}

function testWaitsForBundleDownloadFromWorkbenchText(classify: (input: ClassifierInput) => ClassifierResult): void {
  const result = classify({
    extensionActive: true,
    registeredCommands: ['azureLogicAppsStandard.createWorkspace'],
    requiredCommands: ['azureLogicAppsStandard.createWorkspace'],
    workbenchText: 'Downloading extension bundle for Azure Logic Apps',
    logText: '',
  });

  assert.strictEqual(result.ready, false);
  assert.ok(result.reasons.includes('extension-bundle-downloading'));
}

function testWaitsForBundleDownloadFromLogicAppsLog(classify: (input: ClassifierInput) => ClassifierResult): void {
  const result = classify({
    extensionActive: true,
    registeredCommands: ['azureLogicAppsStandard.createWorkspace'],
    requiredCommands: ['azureLogicAppsStandard.createWorkspace'],
    workbenchText: '',
    logText: '[Azure Logic Apps (Standard)] Extension bundle is installing',
  });

  assert.strictEqual(result.ready, false);
  assert.ok(result.reasons.includes('extension-bundle-downloading'));
}

function testAcceptsBundleReadyAfterEarlierLogDownload(classify: (input: ClassifierInput) => ClassifierResult): void {
  const result = classify({
    extensionActive: true,
    registeredCommands: ['azureLogicAppsStandard.createWorkspace'],
    requiredCommands: ['azureLogicAppsStandard.createWorkspace'],
    workbenchText: '',
    logText: [
      '[Azure Logic Apps (Standard)] Extension bundle is installing',
      '[Azure Logic Apps (Standard)] Extension bundle installed',
      '[Azure Logic Apps (Standard)] bundle healthy',
    ].join('\n'),
  });

  assert.strictEqual(result.ready, true);
  assert.deepStrictEqual([...result.reasons], []);
}

function testReportsActivationErrors(classify: (input: ClassifierInput) => ClassifierResult): void {
  const result = classify({
    extensionActive: true,
    registeredCommands: ['azureLogicAppsStandard.createWorkspace'],
    requiredCommands: ['azureLogicAppsStandard.createWorkspace'],
    workbenchText: '',
    logText: 'ms-azuretools.vscode-azurelogicapps activation failed',
  });

  assert.strictEqual(result.ready, false);
  assert.ok(result.reasons.includes('extension-activation-error'));
}

main();
