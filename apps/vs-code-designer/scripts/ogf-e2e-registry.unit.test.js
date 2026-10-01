/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global console, require */
const assert = require('assert');
const { SUITE_REGISTRY } = require('./e2e-cli-batch');
const { OGF_E2E_SCENARIOS, getOgfScenariosForPhase, validateOgfRegistry } = require('./ogf-e2e-registry');

testRegistryReferencesExecutableTestCliPhases();
testRegistryDoesNotClaimExternalResultsOrApprovals();
testPassedPhaseEmitsOgfEvidence();
testFailedPhaseDoesNotEmitOgfEvidence();

console.log('[ogf-e2e-registry.unit] all tests passed');

function testRegistryReferencesExecutableTestCliPhases() {
  assert.deepStrictEqual(validateOgfRegistry(), []);
  assert.ok(OGF_E2E_SCENARIOS.length > 0, 'first OGF W1 slice must register at least one executable scenario');

  for (const scenario of OGF_E2E_SCENARIOS) {
    const suite = SUITE_REGISTRY[scenario.suiteId];
    assert.ok(suite, `${scenario.scenarioId} must reference a registered suite`);
    assert.ok(
      suite.expectedPhases.includes(scenario.expectedPhase),
      `${scenario.scenarioId} must reference a concrete expected phase on ${scenario.suiteId}`
    );
    assert.ok(
      suite.platforms.includes('linux') && suite.platforms.includes('win32'),
      `${scenario.scenarioId} must be executable on both canonical OS cohorts`
    );
  }
}

function testRegistryDoesNotClaimExternalResultsOrApprovals() {
  for (const scenario of OGF_E2E_SCENARIOS) {
    const text = JSON.stringify(scenario);
    assert.doesNotMatch(text, /accepted|approved|passedOriginal|resultWrite|baselineApproved/i);
  }
}

function testPassedPhaseEmitsOgfEvidence() {
  const evidence = getOgfScenariosForPhase('createWorkspaceCoreMatrix:standard-stateful', {
    passed: true,
    executedVariant: 'standard-stateful',
    platform: 'win32',
    sourceVersion: 'a'.repeat(40),
  });
  assert.strictEqual(evidence.length, 1);
  assert.strictEqual(evidence[0].scenarioId, 'ogf-launch-config-generated-name-standard-stateful');
  assert.strictEqual(evidence[0].suiteId, 'createWorkspaceCoreMatrix');
  assert.strictEqual(evidence[0].expectedPhase, 'createWorkspaceCoreMatrix:standard-stateful');
  assert.strictEqual(evidence[0].executedPhase, 'createWorkspaceCoreMatrix:standard-stateful');
  assert.strictEqual(evidence[0].executedVariant, 'standard-stateful');
  assert.strictEqual(evidence[0].provenance.platform, 'win32');
  assert.strictEqual(evidence[0].provenance.sourceVersion, 'a'.repeat(40));
  assert.ok(evidence[0].assertionIdentities.includes('launch-configuration-name-ends-with-created-logic-app-name'));
  assert.ok(evidence[0].assertions.includes('launch-configuration-name-ends-with-created-logic-app-name'));
}

function testFailedPhaseDoesNotEmitOgfEvidence() {
  assert.deepStrictEqual(getOgfScenariosForPhase('createWorkspaceCoreMatrix:standard-stateful', { passed: false }), []);
  assert.deepStrictEqual(getOgfScenariosForPhase('createWorkspaceCoreMatrix:custom-code-stateful', { passed: true }), []);
}
