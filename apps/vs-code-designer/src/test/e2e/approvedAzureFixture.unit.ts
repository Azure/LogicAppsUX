import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  approvedAzureFixtureFromEnvironment,
  approvedAzureFixturePrompts,
  assertApprovedAzureFixture,
  installApprovedAzureFixture,
} from './approvedAzureFixture';
import { selectWorkbenchPromptOption } from './workbenchPromptSelection';

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
  check(() => assert.throws(() => approvedAzureFixtureFromEnvironment({ ...env, LA_E2E_CLI_AZURE_SUBSCRIPTION_ID: 'not-guid' }), /GUIDs/));
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
    // Model the real producer's inherited settings, not a native workflow seed.
    fs.mkdirSync(path.dirname(designFile));
    fs.copyFileSync(appFile, designFile);
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
      assert.strictEqual(value.Values.WORKFLOWS_SUBSCRIPTION_ID, '');
      assert.strictEqual(value.Values.WORKFLOWS_RESOURCE_GROUP_NAME, undefined);
      assert.strictEqual(value.Values.unrelated, 'foreign-unrelated-update');
      assert.strictEqual(value.Values.productWorkerPath, '/unit/product-added-path');
    }
  });
  for (const index of [0, 1]) {
    check(() => {
      const app = path.join(root, `target-conflict-${index}`);
      fs.mkdirSync(app);
      const files = settingsFiles(app);
      fs.writeFileSync(files[0], '{"Values":{}}');
      const lease = installApprovedAzureFixture(app, fixture);
      fs.mkdirSync(path.dirname(files[1]));
      fs.copyFileSync(files[0], files[1]);
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
  console.log(
    `[approvedAzureFixture.unit] ${checks} approved-context, exact-existing-selection and foreign-edit-safe restoration controls passed; no Azure/native calls`
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
