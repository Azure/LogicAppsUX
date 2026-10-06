import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as ts from 'typescript';
import * as vm from 'vm';
import {
  approvedAzureFixtureFromEnvironment,
  approvedAzureFixturePrompts,
  assertApprovedAzureFixture,
  installApprovedAzureFixture,
} from './approvedAzureFixture';
import { selectWorkbenchPromptOption } from './workbenchPromptSelection';
import { recoverStateless } from './statelessVariablesControls';
import { StatelessOwnedDebug } from './statelessVariablesDebug';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'approved-azure-fixture-unit-'));
const env: NodeJS.ProcessEnv = {
  LA_E2E_CLI_AZURE_SUBSCRIPTION_ID: '00000000-0000-4000-8000-000000000001',
  LA_E2E_CLI_AZURE_TENANT_ID: '00000000-0000-4000-8000-000000000002',
  LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME: 'approved-existing-unit-rg',
  LA_E2E_CLI_AZURE_LOCATION_NAME: 'westus2',
  LA_E2E_CLI_AZURE_ACCESS_TOKEN: 'UNIT_ONLY_TOKEN_NEVER_PERSIST',
};
const fixture = approvedAzureFixtureFromEnvironment(env);
let checks = 0;
const check = (action: () => void) => {
  action();
  checks++;
};
const settingsFiles = (app: string) => [
  path.join(app, 'local.settings.json'),
  path.join(app, 'workflow-designtime', 'local.settings.json'),
];
const read = (file: string): { Values: Record<string, unknown> } => JSON.parse(fs.readFileSync(file, 'utf8'));

/** Execute the unchanged real generator and real constant declarations in
 * memory. Only the VS Code configuration query is stubbed; no copied baseline. */
function independentDesignTimeBaseline(projectPath: string): { IsEncrypted: boolean; Values: Record<string, unknown> } {
  const appRoot = path.resolve(__dirname, '..', '..', '..');
  const repoRoot = path.resolve(appRoot, '..', '..');
  const load = (file: string, imports: Record<string, unknown>) => {
    const source = fs.readFileSync(file);
    const output = ts.transpileModule(source.toString('utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports: Record<string, unknown> = {};
    vm.runInNewContext(output, {
      exports,
      process: { env: {} },
      require: (name: string) => {
        assert.ok(Object.hasOwn(imports, name), `Unexpected immutable generator import ${name}`);
        return imports[name];
      },
    });
    assert.ok(fs.readFileSync(file).equals(source), 'Unit control must not modify the real generator or its constants');
    return exports;
  };
  const named = (file: string, name: string) => {
    const text = fs.readFileSync(file, 'utf8');
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const declaration = source.statements.find(
      (node): node is ts.VariableStatement =>
        ts.isVariableStatement(node) && node.declarationList.declarations.some((decl) => decl.name.getText(source) === name)
    );
    assert.ok(declaration);
    const exports: Record<string, unknown> = {};
    vm.runInNewContext(
      ts.transpileModule(declaration.getText(source), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      }).outputText,
      { exports }
    );
    return exports[name];
  };
  const constants = load(path.join(appRoot, 'src', 'constants.ts'), {
    './localize': { localize: (_key: string, message: string) => message },
    os,
    path,
  });
  const modelsRoot = path.join(repoRoot, 'libs', 'vscode-extension', 'src', 'lib', 'models');
  const generator = load(path.join(appRoot, 'src', 'app', 'projectConsistency', 'fileGenerators', 'localSettings.ts'), {
    '../../../constants': constants,
    '../../utils/vsCodeConfig/settings': { isManagedIdentityAuthEnabled: () => false },
    '@microsoft/vscode-extension-logic-apps': {
      ProjectType: named(path.join(modelsRoot, 'project.ts'), 'ProjectType'),
      WorkerRuntime: named(path.join(modelsRoot, 'language.ts'), 'WorkerRuntime'),
    },
  });
  const generate = generator.generateDesignTimeLocalSettingsJson as (projectPath: string) => {
    IsEncrypted: boolean;
    Values: Record<string, unknown>;
  };
  assert.strictEqual(typeof generate, 'function');
  return JSON.parse(JSON.stringify(generate(projectPath)));
}

function writeIndependentProducer(file: string, projectPath: string): Record<string, unknown> {
  const baseline = independentDesignTimeBaseline(projectPath);
  assert.strictEqual(baseline.Values.WORKFLOWS_SUBSCRIPTION_ID, undefined, 'The real generator must not be replaced by an app-root copy');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(baseline));
  return baseline.Values;
}

async function main(): Promise<void> {
  try {
    for (const key of Object.keys(env)) {
      check(() => {
        const missing = { ...env };
        delete missing[key];
        assert.throws(() => approvedAzureFixtureFromEnvironment(missing), new RegExp(key));
      });
    }
    check(() =>
      assert.throws(() => approvedAzureFixtureFromEnvironment({ ...env, WORKFLOWS_RESOURCE_GROUP_NAME: 'foreign' }), /Conflicting approved/)
    );
    check(() =>
      assert.throws(() => approvedAzureFixtureFromEnvironment({ ...env, FC_SERVICE_CONNECTION_TENANT_ID: 'foreign' }), /WIF tenant/)
    );
    check(() =>
      assert.throws(() => approvedAzureFixtureFromEnvironment({ ...env, LA_E2E_CLI_AZURE_SUBSCRIPTION_ID: 'not-guid' }), /GUIDs/)
    );
    check(() => {
      const prompts = approvedAzureFixturePrompts(fixture);
      const selected = selectWorkbenchPromptOption(prompts, [
        {
          kind: 'quickInput',
          text: 'Select a resource group for new resources.',
          buttons: [],
          rows: [
            { text: 'Create new resource group', label: 'Create new resource group', point: { x: 1, y: 1 } },
            { text: `${fixture.resourceGroupName}-other westus2`, label: `${fixture.resourceGroupName}-other`, point: { x: 2, y: 2 } },
            { text: `${fixture.resourceGroupName} westus2`, label: fixture.resourceGroupName, point: { x: 3, y: 3 } },
          ],
        },
      ]);
      assert.deepStrictEqual(selected.point, { x: 3, y: 3 }, 'Only exact approved existing RG label may be selected');
    });
    check(() => {
      const selected = selectWorkbenchPromptOption(approvedAzureFixturePrompts(fixture), [
        {
          kind: 'quickInput',
          text: 'Select a resource group',
          buttons: [],
          rows: [{ text: 'Create new resource group', label: 'Create new resource group', point: { x: 1, y: 1 } }],
        },
      ]);
      assert.strictEqual(selected.point, undefined, 'Missing approved group cannot choose create or a negative fallback');
    });
    check(() => {
      const selected = selectWorkbenchPromptOption(approvedAzureFixturePrompts(fixture), [
        {
          kind: 'quickInput',
          text: 'Select a subscription',
          buttons: [],
          rows: [
            { text: 'Other subscription 00000000-0000-4000-8000-000000000009', point: { x: 1, y: 1 } },
            { text: `Approved subscription ${fixture.subscriptionId}`, point: { x: 2, y: 2 } },
          ],
        },
      ]);
      assert.deepStrictEqual(selected.point, { x: 2, y: 2 });
    });
    check(() => {
      const app = path.join(root, 'restore');
      fs.mkdirSync(app);
      const [appFile, designFile] = settingsFiles(app);
      fs.writeFileSync(appFile, '{"Values":{"WORKFLOWS_SUBSCRIPTION_ID":"","unrelated":"before"}}');
      const lease = installApprovedAzureFixture(app, fixture);
      assertApprovedAzureFixture(appFile, fixture);
      assert.ok(!fs.readFileSync(appFile, 'utf8').includes(env.LA_E2E_CLI_AZURE_ACCESS_TOKEN as string));
      const generatedBaseline = writeIndependentProducer(designFile, app);
      assert.throws(() => assertApprovedAzureFixture(designFile, fixture), /WORKFLOWS_SUBSCRIPTION_ID must exist/);
      lease.bindGeneratedDesignTime();
      lease.assertBound();
      for (const file of [appFile, designFile]) {
        const value = read(file);
        value.Values.unrelated = 'foreign-unrelated-update';
        value.Values.productWorkerPath = '/unit/product-added-path';
        fs.writeFileSync(file, JSON.stringify(value));
      }
      lease.restore();
      for (const file of [appFile, designFile]) {
        const value = read(file);
        assert.strictEqual(
          value.Values.WORKFLOWS_SUBSCRIPTION_ID,
          file === appFile ? '' : undefined,
          'Each file must restore its own baseline, not the app snapshot'
        );
        assert.strictEqual(value.Values.WORKFLOWS_RESOURCE_GROUP_NAME, undefined);
        assert.strictEqual(value.Values.unrelated, 'foreign-unrelated-update');
        assert.strictEqual(value.Values.productWorkerPath, '/unit/product-added-path');
        if (file === designFile) {
          for (const [key, expected] of Object.entries(generatedBaseline)) {
            assert.strictEqual(value.Values[key], expected, 'Preserve every independent generator value');
          }
        }
      }
    });
    for (const index of [0, 1]) {
      check(() => {
        const app = path.join(root, `target-conflict-${index}`);
        fs.mkdirSync(app);
        const files = settingsFiles(app);
        fs.writeFileSync(files[0], '{"Values":{}}');
        const lease = installApprovedAzureFixture(app, fixture);
        writeIndependentProducer(files[1], app);
        lease.bindGeneratedDesignTime();
        const foreign = read(files[index]);
        foreign.Values.WORKFLOWS_RESOURCE_GROUP_NAME = 'foreign-target';
        fs.writeFileSync(files[index], JSON.stringify(foreign));
        const before = files.map((file) => fs.readFileSync(file));
        assert.throws(() => lease.restore(), /changed/);
        files.forEach((file, i) =>
          assert.ok(fs.readFileSync(file).equals(before[i]), 'No target may be partly restored after a foreign edit')
        );
      });
    }
    check(() => {
      const app = path.join(root, 'wrong-preexisting');
      fs.mkdirSync(app);
      const file = settingsFiles(app)[0];
      fs.writeFileSync(file, '{"Values":{"WORKFLOWS_SUBSCRIPTION_ID":"foreign-subscription"}}');
      const before = fs.readFileSync(file);
      assert.throws(() => installApprovedAzureFixture(app, fixture), /foreign/);
      assert.ok(fs.readFileSync(file).equals(before));
    });
    check(() => {
      const app = path.join(root, 'independent-foreign-target');
      fs.mkdirSync(app);
      const [appFile, designFile] = settingsFiles(app);
      fs.writeFileSync(appFile, '{"Values":{}}');
      const lease = installApprovedAzureFixture(app, fixture);
      writeIndependentProducer(designFile, app);
      const foreign = read(designFile);
      foreign.Values.WORKFLOWS_RESOURCE_GROUP_NAME = 'foreign-produced-target';
      fs.writeFileSync(designFile, JSON.stringify(foreign));
      const before = [appFile, designFile].map((file) => fs.readFileSync(file));
      assert.throws(() => lease.bindGeneratedDesignTime(), /foreign/);
      [appFile, designFile].forEach((file, i) => assert.ok(fs.readFileSync(file).equals(before[i])));
      assert.throws(() => lease.restore(), /refusing partial restoration/);
      [appFile, designFile].forEach((file, i) => assert.ok(fs.readFileSync(file).equals(before[i])));
    });
    await testCallbackIndependentFixtureRestore();
    console.log(
      `[approvedAzureFixture.unit] ${checks} approved-context, exact-existing-selection and foreign-edit-safe restoration controls passed; no Azure/native calls`
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function testCallbackIndependentFixtureRestore(): Promise<void> {
  for (const mode of ['verification-failed', 'quiescence-failed', 'foreign-target']) {
    const app = path.join(root, mode);
    fs.mkdirSync(app);
    const files = settingsFiles(app);
    fs.writeFileSync(files[0], '{"Values":{"WORKFLOWS_SUBSCRIPTION_ID":""}}');
    const lease = installApprovedAzureFixture(app, fixture);
    writeIndependentProducer(files[1], app);
    lease.bindGeneratedDesignTime();
    const failure = new Error('original callback verification failed');
    let quiescent = false;
    let quiescenceReports = 0;
    const manager: StatelessOwnedDebug = new StatelessOwnedDebug(app, 'func: host start', async (tag) => {
      manager.taskStarted({ id: 'task', workspacePath: app, name: 'func: host start', terminate: () => manager.taskEnded('task') });
      manager.sessionStarted({
        id: 'session',
        workspacePath: app,
        ownerTag: tag,
        stop: async () => {
          if (mode === 'quiescence-failed') {
            throw new Error('actual owned stop failed');
          }
          manager.sessionEnded('session');
        },
      });
      return true;
    });
    const errors: unknown[] = [];
    try {
      await recoverStateless(
        {
          quiesce: (deadline) => manager.quiesce(deadline),
          stop: (deadline) => manager.quiesce(deadline),
          restore: () => lease.assertBound(),
          restart: (_deadline, signal) => manager.start(signal),
          verify: async () => {
            if (mode === 'foreign-target') {
              const changed = read(files[1]);
              changed.Values.WORKFLOWS_RESOURCE_GROUP_NAME = 'foreign-after-callback';
              fs.writeFileSync(files[1], JSON.stringify(changed));
            }
            throw failure;
          },
          onQuiescenceVerified: () => {
            quiescenceReports++;
            quiescent = true;
          },
        },
        1000
      );
    } catch (error) {
      errors.push(error);
    }
    const original = errors[0] as AggregateError;
    assert.strictEqual(
      quiescenceReports,
      mode === 'quiescence-failed' ? 0 : 1,
      'Only one outcome may be reported after all cleanup observations succeed'
    );
    assert.ok(original.errors.includes(failure), 'The original callback failure must survive verified cleanup and fixture restoration');
    const beforeRestore = files.map((file) => fs.readFileSync(file));
    if (quiescent) {
      try {
        lease.restore();
      } catch (error) {
        errors.push(error);
      }
    }
    if (mode === 'verification-failed') {
      assert.strictEqual(quiescent, true, 'Callback failure must not suppress independently verified quiescence');
      assert.strictEqual(read(files[0]).Values.WORKFLOWS_SUBSCRIPTION_ID, '');
      assert.strictEqual(read(files[1]).Values.WORKFLOWS_SUBSCRIPTION_ID, undefined);
      assert.strictEqual(errors.length, 1, 'Restoration must not turn verification failure into success');
    } else {
      assert.strictEqual(quiescent, mode === 'foreign-target');
      files.forEach((file, i) =>
        assert.ok(fs.readFileSync(file).equals(beforeRestore[i]), 'Failed quiescence/foreign target must refuse all restoration')
      );
      if (mode === 'foreign-target') {
        assert.strictEqual(errors.length, 2, 'Keep original callback and foreign-restoration failures');
      }
    }
    checks++;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
