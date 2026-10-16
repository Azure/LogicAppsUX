/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global module, process, require */
const { SUITE_REGISTRY } = require('./e2e-cli-batch');

const OGF_E2E_SCENARIOS = Object.freeze([
  Object.freeze({
    scenarioId: 'ogf-launch-config-generated-name-standard-stateful',
    suiteId: 'createWorkspaceCoreMatrix',
    expectedPhase: 'createWorkspaceCoreMatrix:standard-stateful',
    executedVariant: 'standard-stateful',
    evidenceKind: 'native-vscode-test-cli-phase',
    assertions: Object.freeze([
      'wizard-created-standard-stateful-workspace',
      'code-workspace-file-exists',
      'logic-app-folder-exists',
      'launch-json-has-single-debug-configuration',
      'launch-configuration-name-ends-with-created-logic-app-name',
      'launch-configuration-name-is-not-hardcoded-default',
    ]),
  }),
]);

function getOgfScenariosForPhase(phaseId, options = {}) {
  if (!phaseId || options.passed !== true) {
    return [];
  }

  return OGF_E2E_SCENARIOS.filter(
    (scenario) => scenario.expectedPhase === phaseId && scenario.executedVariant === options.executedVariant
  ).map((scenario) => ({
    scenarioId: scenario.scenarioId,
    suiteId: scenario.suiteId,
    expectedPhase: scenario.expectedPhase,
    executedPhase: phaseId,
    executedVariant: options.executedVariant || '',
    evidenceKind: scenario.evidenceKind,
    assertionIdentities: scenario.assertions,
    assertions: scenario.assertions,
    provenance: {
      platform: options.platform || process.platform,
      arch: options.arch || process.arch,
      vscodeVersion: options.vscodeVersion || '',
      sourceVersion: options.sourceVersion || '',
      buildId: options.buildId || '',
      definitionId: options.definitionId || '',
      repository: options.repository || '',
    },
  }));
}

function validateOgfRegistry(registry = OGF_E2E_SCENARIOS) {
  const errors = [];
  const scenarioIds = new Set();

  for (const scenario of registry) {
    if (!scenario.scenarioId || scenarioIds.has(scenario.scenarioId)) {
      errors.push(`Scenario id must be present and unique: ${scenario.scenarioId || '<missing>'}`);
    }
    scenarioIds.add(scenario.scenarioId);

    const suite = SUITE_REGISTRY[scenario.suiteId];
    if (!suite) {
      errors.push(`${scenario.scenarioId}: suiteId does not exist: ${scenario.suiteId}`);
    } else if (!suite.expectedPhases.includes(scenario.expectedPhase)) {
      errors.push(`${scenario.scenarioId}: expectedPhase is not registered on suite ${scenario.suiteId}: ${scenario.expectedPhase}`);
    }

    if (scenario.evidenceKind !== 'native-vscode-test-cli-phase') {
      errors.push(`${scenario.scenarioId}: evidenceKind must stay native test-cli evidence`);
    }

    if (Object.prototype.hasOwnProperty.call(scenario, 'source')) {
      errors.push('Public scenario registry must not embed private catalogue mappings');
    }

    if (!scenario.executedVariant || scenario.expectedPhase !== `${scenario.suiteId}:${scenario.executedVariant}`) {
      errors.push(`${scenario.scenarioId}: exact executable variant is required`);
    }

    if (!Array.isArray(scenario.assertions) || scenario.assertions.length === 0) {
      errors.push(`${scenario.scenarioId}: at least one assertion reference is required`);
    }

    const serialized = JSON.stringify(scenario);
    if (/accepted|approved|passedOriginal|resultWrite|baselineApproved/i.test(serialized)) {
      errors.push(`${scenario.scenarioId}: registry must not claim approval, result writes, or original catalogue pass status`);
    }
  }

  return errors;
}

function projectPublicScenarioEvidence(evidence) {
  const scenario = OGF_E2E_SCENARIOS.find((item) => item.scenarioId === evidence?.scenarioId);
  if (
    !scenario ||
    evidence.suiteId !== scenario.suiteId ||
    evidence.expectedPhase !== scenario.expectedPhase ||
    evidence.executedPhase !== scenario.expectedPhase ||
    evidence.executedVariant !== scenario.executedVariant ||
    evidence.evidenceKind !== scenario.evidenceKind ||
    !sameIdentities(evidence.assertionIdentities, scenario.assertions) ||
    !sameIdentities(evidence.assertions, scenario.assertions)
  ) {
    throw new Error('Invalid public scenario execution evidence');
  }
  const provenance = Object.fromEntries(
    ['platform', 'arch', 'vscodeVersion', 'sourceVersion', 'buildId', 'definitionId', 'repository'].map((key) => [
      key,
      typeof evidence.provenance?.[key] === 'string' ? evidence.provenance[key] : '',
    ])
  );
  const publicEvidence = getOgfScenariosForPhase(evidence.executedPhase, {
    passed: true,
    executedVariant: evidence.executedVariant,
    ...provenance,
  })[0];
  publicEvidence.provenance = provenance;
  return publicEvidence;
}

function sameIdentities(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    expected.every((identity) => actual.includes(identity))
  );
}

module.exports = {
  OGF_E2E_SCENARIOS,
  getOgfScenariosForPhase,
  validateOgfRegistry,
  projectPublicScenarioEvidence,
  sameIdentities,
};
