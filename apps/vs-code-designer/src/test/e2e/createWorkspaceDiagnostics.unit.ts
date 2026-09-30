import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import * as vm from 'vm';

const sourcePath = path.resolve(__dirname, '..', '..', '..', 'src', 'test', 'e2e', 'createWorkspace.test.ts');
const sourceText = fs.readFileSync(sourcePath, 'utf-8');
const source = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true);

const runtimeFunctionNames = new Set([
  'getVisibleCreateWorkspaceFieldContracts',
  'getCreateWorkspaceFieldContracts',
  'getFunctionNameWorkspaceFieldContract',
]);

function main(): void {
  const { exported } = loadRuntimeHarness();
  testFunctionNameCheckpointContract(exported);
  testCoreScrollPositionContractIsPreserved(exported);
  console.log('[createWorkspaceDiagnostics.unit] all tests passed');
}

function loadRuntimeHarness(): { exported: Record<string, any> } {
  const selected = source.statements.filter(
    (node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && runtimeFunctionNames.has(node.name?.text ?? '')
  );
  assert.strictEqual(selected.length, runtimeFunctionNames.size, 'Expected all create-workspace diagnostic functions to be extracted');

  const implementation = ts.transpileModule(selected.map((node) => `export ${node.getText(source)}`).join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;

  const exported: Record<string, any> = {};
  vm.runInNewContext(implementation, {
    exports: exported,
    requiredValue: (value: string | undefined) => {
      assert.ok(value, 'Expected test fixture to provide required create-workspace value');
      return value;
    },
  });

  return { exported };
}

function testFunctionNameCheckpointContract(exported: Record<string, any>): void {
  const customCode = workspaceCreationCase('customCode');
  const rulesEngine = workspaceCreationCase('rulesEngine');
  const codeful = workspaceCreationCase('codeful');

  assert.deepStrictEqual(toPlainObject(exported.getFunctionNameWorkspaceFieldContract(customCode)), {
    labels: ['Function name'],
    value: 'WeatherFunction',
  });
  assert.deepStrictEqual(toPlainObject(exported.getFunctionNameWorkspaceFieldContract(rulesEngine)), {
    labels: ['Function name'],
    value: 'WeatherFunction',
  });
  assert.strictEqual(exported.getFunctionNameWorkspaceFieldContract(codeful), undefined);
}

function testCoreScrollPositionContractIsPreserved(exported: Record<string, any>): void {
  const customCode = workspaceCreationCase('customCode');
  const fields = exported.getCreateWorkspaceFieldContracts(customCode, 'C:\\workspace-parent');

  assert.deepStrictEqual(toPlainObject(exported.getVisibleCreateWorkspaceFieldContracts(fields, 'top')), [
    { labels: ['Workspace parent folder path'], value: 'C:\\workspace-parent' },
  ]);
  assert.deepStrictEqual(toPlainObject(exported.getVisibleCreateWorkspaceFieldContracts(fields, 'middle')), [
    { labels: ['Custom code folder name', 'custom code folder', 'Code folder name', 'Folder name'], value: 'WeatherCode' },
  ]);
  assert.deepStrictEqual(toPlainObject(exported.getVisibleCreateWorkspaceFieldContracts(fields, 'bottom')), [
    { labels: ['Workflow name'], value: 'WeatherWorkflow' },
  ]);
  assert.ok(
    fields.some(
      (field: { labels: string[]; value?: string }) => field.labels.includes('Function name') && field.value === 'WeatherFunction'
    ),
    'Expected full behavior-smoke field contract to include Function name'
  );
}

function workspaceCreationCase(appType: string): Record<string, string> {
  return {
    label: `standard-${appType}`,
    appType,
    wsName: 'WeatherWorkspace',
    appName: 'WeatherApp',
    wfName: 'WeatherWorkflow',
    workflowType: 'Stateful',
    radioLabel: 'Logic app (Standard)',
    functionFolderName: 'WeatherCode',
    functionNamespace: 'Contoso.Workflow',
    functionName: 'WeatherFunction',
  };
}

function toPlainObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

main();
