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

function assertOrdered(source: string, values: string[], label: string): void {
  let cursor = 0;
  for (const value of values) {
    const index = source.indexOf(value, cursor);
    assert.ok(index >= cursor, `${label} is missing or out of order: ${value}`);
    cursor = index + value.length;
  }
}

async function main(): Promise<void> {
  testAcceptsExactStatefulFailedOnlyWorkflow();
  testRejectsWrongKind();
  testRejectsWrongPredecessor();
  testRejectsMultipleStatuses();
  testRejectsDisplayStatusCasing();
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
          runAfter: { [identity.firstComposeId]: ['FAILED'] },
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
  value.definition.actions[identity.secondComposeId].runAfter = { WrongCompose: ['FAILED'] };
  assert.throws(() => assertRunAfterPersistenceWorkflow(value, identity), /Failed only/);
}

function testRejectsMultipleStatuses(): void {
  const value = workflow();
  value.definition.actions[identity.secondComposeId].runAfter = {
    [identity.firstComposeId]: ['FAILED', 'SUCCEEDED'],
  };
  assert.throws(() => assertRunAfterPersistenceWorkflow(value, identity), /Failed only/);
}

function testRejectsDisplayStatusCasing(): void {
  const value = workflow();
  value.definition.actions[identity.secondComposeId].runAfter = {
    [identity.firstComposeId]: ['Failed'],
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
  assertOrdered(
    source,
    [
      'run-after-persistence-author-designer-ready',
      'run-after-persistence-author-request-discovery-open',
      'run-after-persistence-author-request-search-entered',
      'run-after-persistence-author-request-inserted',
      'run-after-persistence-author-first-compose-discovery-open',
      'run-after-persistence-author-first-compose-search-entered',
      'run-after-persistence-author-first-compose-inserted',
      'run-after-persistence-author-first-compose-input-configured',
      'run-after-persistence-author-second-compose-discovery-open',
      'run-after-persistence-author-second-compose-search-entered',
      'run-after-persistence-author-second-compose-inserted',
      'run-after-persistence-author-second-compose-input-configured',
      'run-after-persistence-author-canvas',
      'run-after-persistence-author-settings-open',
      'run-after-persistence-author-run-after-section-open',
      'run-after-persistence-author-predecessor-expanded',
      'run-after-persistence-author-failed-enabled',
      'run-after-persistence-author-failed-only',
      'run-after-persistence-author-saved',
      'run-after-persistence-reopen-canvas',
      'run-after-persistence-reopen-first-compose-input',
      'run-after-persistence-reopen-second-compose-input',
      'run-after-persistence-reopen-settings-open',
      'run-after-persistence-reopen-run-after-section-open',
      'run-after-persistence-reopen-predecessor-expanded',
      'run-after-persistence-reopen-failed-only',
    ],
    'Run After ordered semantic evidence'
  );
  assert.match(source, /workspaceLifecycleEvidenceHelpers as helpers/);
  assert.match(source, /normalizeRunAfterCanvas\(session, 'Request insertion', \[request\.nodeId\]\)/);
  assert.match(source, /normalizeRunAfterCanvas\(session, 'complete authoring canvas', nodeIds\)/);
  assert.match(
    source,
    /normalizeRunAfterCanvas\(session, 'fresh reopen canvas', \[\s*handoff\.identity\.requestTriggerId,\s*handoff\.identity\.firstComposeId,\s*handoff\.identity\.secondComposeId/
  );
  assert.strictEqual(
    (source.match(/normalizeRunAfterCanvas\(/g) ?? []).length,
    5,
    'Run After must normalize the canvas helper definition plus every author/reopen canvas capture'
  );
  assert.match(source, /fields: \[\{ labels: \['Inputs', 'inputs'\], value: firstComposeInput \}\]/);
  assert.match(source, /fields: \[\{ labels: \['Inputs', 'inputs'\], value: secondComposeInput \}\]/);
  assert.match(source, /setRunAfterStatus\(secondCompose\.nodeId, firstCompose\.nodeId, 'Failed', true\)/);
  assert.match(source, /setRunAfterStatus\(secondCompose\.nodeId, firstCompose\.nodeId, 'Succeeded', false\)/);
  assert.match(source, /LA_E2E_CLI_RUN_AFTER_PERSISTENCE_MODE/);
  assert.match(source, /LA_E2E_CLI_RUN_AFTER_PERSISTENCE_HANDOFF/);
  assert.match(source, /requiredNodeIds/);
  assert.match(source, /readRunAfterPersistenceWorkflow/);
  assert.match(source, /session\.actions\.saveWithExternalOracle\(\)/);
  assert.doesNotMatch(source, /session\.actions\.save\(\)/);
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
