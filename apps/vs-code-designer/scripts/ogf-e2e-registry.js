/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global module, require */
const { SUITE_REGISTRY } = require('./e2e-cli-batch');

const OGF_E2E_SCENARIOS = Object.freeze([
  Object.freeze({
    scenarioId: 'ogf-launch-config-generated-name-standard-stateful',
    suiteId: 'createWorkspaceCoreMatrix',
    expectedPhase: 'createWorkspaceCoreMatrix:standard-stateful',
    evidenceKind: 'native-devdiv-vscode-test-cli-phase',
    source: Object.freeze({
      system: 'msazure/One',
      caseId: 31497883,
      caseRevision: 1,
      classification: 'explicit-vscode',
      workItemUrl: 'https://dev.azure.com/msazure/One/_workitems/edit/31497883',
      revisionUrl:
        'https://dev.azure.com/msazure/b32aa71e-8ed2-41b2-9d77-5bc261222004/_apis/wit/workItems/31497883/revisions/1?api-version=7.1',
      stepMappings: Object.freeze([Object.freeze({ stepId: '2', stepOrdinal: 1 })]),
    }),
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

  return OGF_E2E_SCENARIOS.filter((scenario) => scenario.expectedPhase === phaseId).map((scenario) => ({
    scenarioId: scenario.scenarioId,
    evidenceKind: scenario.evidenceKind,
    source: scenario.source,
    assertions: scenario.assertions,
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

    if (scenario.evidenceKind !== 'native-devdiv-vscode-test-cli-phase') {
      errors.push(`${scenario.scenarioId}: evidenceKind must stay native DevDiv test-cli evidence`);
    }

    if (scenario.source?.system !== 'msazure/One' || !Number.isInteger(scenario.source?.caseId)) {
      errors.push(`${scenario.scenarioId}: source must retain read-only One case identity`);
    }

    if (!Number.isInteger(scenario.source?.caseRevision)) {
      errors.push(`${scenario.scenarioId}: source case revision is required`);
    }

    const stepMappings = scenario.source?.stepMappings;
    if (!Array.isArray(stepMappings) || stepMappings.length === 0) {
      errors.push(`${scenario.scenarioId}: at least one source step mapping is required`);
    } else {
      for (const step of stepMappings) {
        if (!step.stepId || !Number.isInteger(step.stepOrdinal)) {
          errors.push(`${scenario.scenarioId}: step mappings require stepId and numeric stepOrdinal`);
        }
      }
    }

    if (!Array.isArray(scenario.assertions) || scenario.assertions.length === 0) {
      errors.push(`${scenario.scenarioId}: at least one assertion reference is required`);
    }

    const serialized = JSON.stringify(scenario);
    if (/accepted|approved|passedOriginalOne|resultWrite|baselineApproved/i.test(serialized)) {
      errors.push(`${scenario.scenarioId}: registry must not claim approval, One result writes, or original One pass status`);
    }
  }

  return errors;
}

module.exports = {
  OGF_E2E_SCENARIOS,
  getOgfScenariosForPhase,
  validateOgfRegistry,
};
