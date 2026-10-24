import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  assertRunAfterPersistenceWorkflow,
  readRunAfterPersistenceWorkflow,
  type RunAfterPersistenceIdentity,
} from './runAfterPersistenceOracle';

const identity: RunAfterPersistenceIdentity = {
  requestTriggerId: 'When_a_HTTP_request_is_received',
  firstComposeId: 'Compose',
  secondComposeId: 'Compose_2',
  firstComposeInput: 'upstream-sentinel',
  secondComposeInput: 'downstream-sentinel',
};

async function main(): Promise<void> {
  testAcceptsExactStatefulFailedOnlyWorkflow();
  testRejectsWrongKind();
  testRejectsWrongPredecessor();
  testRejectsMultipleStatuses();
  testRejectsMissingExtraAndWrongActions();
  testRejectsFalsePositiveStatusMatching();
  await testHashTracksExactSavedBytes();
  testLifecycleUsesProductWizardAndFreshHostContract();
  console.log('[runAfterPersistenceLifecycle.unit] all tests passed');
}

function workflow(): {
  kind: string;
  definition: {
    triggers: Record<string, { type: string; kind: string }>;
    actions: Record<string, { type: string; inputs: string; runAfter: Record<string, string[]> }>;
  };
} {
  return {
    kind: 'Stateful',
    definition: {
      triggers: {
        [identity.requestTriggerId]: { type: 'Request', kind: 'Http' },
      },
      actions: {
        [identity.firstComposeId]: {
          type: 'Compose',
          inputs: identity.firstComposeInput,
          runAfter: {},
        },
        [identity.secondComposeId]: {
          type: 'Compose',
          inputs: identity.secondComposeInput,
          runAfter: { [identity.firstComposeId]: ['Failed'] },
        },
      },
    },
  };
}

function testAcceptsExactStatefulFailedOnlyWorkflow(): void {
  assert.doesNotThrow(() => assertRunAfterPersistenceWorkflow(workflow(), identity));
}

function testRejectsWrongKind(): void {
  assert.throws(() => assertRunAfterPersistenceWorkflow({ ...workflow(), kind: 'Stateless' }, identity), /Stateful/);
}

function testRejectsWrongPredecessor(): void {
  const value = workflow();
  value.definition.actions[identity.secondComposeId].runAfter = { WrongCompose: ['Failed'] };
  assert.throws(() => assertRunAfterPersistenceWorkflow(value, identity), /Failed only/);
}

function testRejectsMultipleStatuses(): void {
  const value = workflow();
  value.definition.actions[identity.secondComposeId].runAfter = {
    [identity.firstComposeId]: ['Failed', 'Succeeded'],
  };
  assert.throws(() => assertRunAfterPersistenceWorkflow(value, identity), /Failed only/);
}

function testRejectsMissingExtraAndWrongActions(): void {
  const missing = workflow();
  delete missing.definition.actions[identity.firstComposeId];
  assert.throws(() => assertRunAfterPersistenceWorkflow(missing, identity), /exactly the two/);

  const extra = workflow();
  extra.definition.actions.Extra = { type: 'Compose', inputs: 'extra', runAfter: {} };
  assert.throws(() => assertRunAfterPersistenceWorkflow(extra, identity), /exactly the two/);

  const wrong = workflow();
  wrong.definition.actions[identity.firstComposeId].type = 'Http';
  assert.throws(() => assertRunAfterPersistenceWorkflow(wrong, identity), /First captured action must be Compose/);
}

function testRejectsFalsePositiveStatusMatching(): void {
  const value = workflow();
  value.definition.actions[identity.secondComposeId].runAfter = {
    [identity.firstComposeId]: ['NotFailed'],
  };
  assert.throws(() => assertRunAfterPersistenceWorkflow(value, identity), /Failed only/);
}

async function testHashTracksExactSavedBytes(): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'run-after-oracle-unit-'));
  const workflowPath = path.join(root, 'workflow.json');
  try {
    fs.writeFileSync(workflowPath, `${JSON.stringify(workflow(), null, 2)}\n`);
    const first = await readRunAfterPersistenceWorkflow(workflowPath, identity);
    const second = await readRunAfterPersistenceWorkflow(workflowPath, identity);
    assert.strictEqual(first.sha256, second.sha256);
    fs.appendFileSync(workflowPath, ' ');
    const changed = await readRunAfterPersistenceWorkflow(workflowPath, identity);
    assert.notStrictEqual(changed.sha256, first.sha256, 'Byte-level mutation must change the saved workflow hash');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function testLifecycleUsesProductWizardAndFreshHostContract(): void {
  const lifecyclePath = path.resolve(__dirname, '..', '..', '..', 'src', 'test', 'e2e', 'runAfterPersistenceLifecycle.test.ts');
  const source = fs.readFileSync(lifecyclePath, 'utf8');
  assert.match(source, /helpers\.createWorkspaceThroughWebview/);
  assert.match(source, /wfType: 'Stateful'/);
  assert.strictEqual((source.match(/operationName: 'Compose',\s*variants: \['compose'\]/g) ?? []).length, 2);
  assert.doesNotMatch(source, /operationId:/, 'Run After insertion must not depend on internal operation automation IDs');
  assert.doesNotMatch(source, /afterNodeId:/, 'Run After insertion must reuse the shared append-action flow');
  assert.match(source, /setRunAfterStatuses\(secondCompose\.nodeId, firstCompose\.nodeId, \['Failed'\]\)/);
  assert.match(source, /LA_E2E_CLI_RUN_AFTER_PERSISTENCE_MODE/);
  assert.match(source, /LA_E2E_CLI_RUN_AFTER_PERSISTENCE_HANDOFF/);
  assert.match(source, /requiredNodeIds/);
  assert.match(source, /readRunAfterPersistenceWorkflow/);
  assert.match(source, /readApprovedAzureConnectorFixture/);
  assert.match(source, /readApprovedExistingResourceGroup/);
  assert.match(source, /installApprovedAzureFixture/);
  assert.match(source, /assertApprovedAzureFixture/);
  assert.match(source, /handleAffirmativeConnectorWorkbenchPrompt/);
  assert.match(source, /selectApprovedAzureConnectorFixturePrompt/);
  assert.match(source, /readApprovedAzureSubscriptionName/);
  assert.match(source, /workflow-designtime', 'local\.settings\.json/);
  assert.match(source, /approvedTarget: azureFixture/);
  assert.match(source, /must never persist the access token/);
  assert.match(source, /allTextIncludes: \['Save'\]/, 'Designer frame selection must use the proven stable Save marker');
  assert.match(
    source,
    /designerCdp = await connectToVsCodeCdp\(\{ targetName \}\)/,
    'Designer frame selection must use the common activated Logic Apps CDP target path'
  );
  assert.match(
    source,
    /contextId = await waitForWebviewFrameContext\(designerCdp,\s*\{\s*allTextIncludes: \['Save'\]/,
    'Designer frame selection must use the common shared webview frame binding'
  );
  assert.match(
    source,
    /beforePoll: async \(\) => \{\s*await handlePrompt\(\);\s*if \(commandError\) \{\s*throw commandError;/,
    'Designer frame binding must continue servicing delayed affirmative connector prompts and command rejection'
  );
  const openDesignerBody = source.slice(
    source.indexOf('async function openExactDesignerV2'),
    source.indexOf('async function prepareApprovedAzureTarget')
  );
  assert.doesNotMatch(
    openDesignerBody,
    /document\.visibilityState|document\.hidden/,
    'Designer binding must not use target-local Page Visibility state before the candidate is accepted and activated'
  );
  assert.doesNotMatch(openDesignerBody, /connectToVsCodeCdpByText|acceptCandidate/);
  assert.match(openDesignerBody, /openingTabs\[0\]\.isActive && openingTabs\[0\]\.label\.includes\(entry\.wfName\)/);
  assert.match(openDesignerBody, /actions\.waitForDesignerReady\(existingNodeTitles\)/);
  assert.match(source, /Fresh-host UI verification must not save or mutate workflow\.json/);
  assert.doesNotMatch(source, /Skip for now|optionText: 'No'|optionText: 'Cancel'/);
  const reopenBody = source.slice(source.indexOf('async function reopenAndVerify'), source.indexOf('async function openExactDesignerV2'));
  assert.doesNotMatch(reopenBody, /\.save\(/, 'Fresh reopen verification must never save');
  assert.doesNotMatch(source, /writeFileSync\(entry\.workflowJsonPath/, 'Lifecycle must never synthesize workflow.json');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
