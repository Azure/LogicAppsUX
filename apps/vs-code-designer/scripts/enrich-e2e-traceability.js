#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global console, module, process, require */
const fs = require('fs');
const path = require('path');
const { SUITE_REGISTRY } = require('./e2e-cli-batch');
const { OGF_E2E_SCENARIOS, projectPublicScenarioEvidence, sameIdentities } = require('./ogf-e2e-registry');
const { assertCancelResult } = require('./workspace-prompt-cancel');

class TraceabilityError extends Error {}

function requireTraceability(condition, reason) {
  if (!condition) {
    throw new TraceabilityError(`Private traceability requirement failed: ${reason}`);
  }
}

function validateCrosswalk(crosswalk) {
  requireTraceability(crosswalk?.schemaVersion === 1 && Array.isArray(crosswalk.scenarios), 'invalid-schema');
  requireTraceability(crosswalk.scenarios.length === OGF_E2E_SCENARIOS.length, 'incomplete-crosswalk');
  const observed = new Set();
  for (const mapping of crosswalk.scenarios) {
    const scenario = OGF_E2E_SCENARIOS.find((item) => item.scenarioId === mapping?.scenarioId);
    requireTraceability(scenario && !observed.has(mapping.scenarioId), 'unknown-or-duplicate-scenario');
    observed.add(mapping.scenarioId);
    requireTraceability(
      mapping.suiteId === scenario.suiteId &&
        mapping.expectedPhase === scenario.expectedPhase &&
        mapping.executedVariant === scenario.executedVariant &&
        sameIdentities(mapping.assertionIdentities, scenario.assertions),
      'scenario-binding-mismatch'
    );
    const source = mapping.source;
    requireTraceability(
      source &&
        Object.keys(source).every((key) =>
          ['system', 'caseId', 'caseRevision', 'classification', 'workItemUrl', 'revisionUrl', 'stepMappings'].includes(key)
        ),
      'unexpected-private-source-field'
    );
    requireTraceability(
      typeof source?.system === 'string' &&
        source.system.length > 0 &&
        Number.isInteger(source.caseId) &&
        source.caseId > 0 &&
        Number.isInteger(source.caseRevision) &&
        source.caseRevision > 0,
      'invalid-private-source'
    );
    requireTraceability(Array.isArray(source.stepMappings) && source.stepMappings.length > 0, 'missing-private-steps');
    const stepIds = new Set();
    const ordinals = new Set();
    for (const step of source.stepMappings) {
      requireTraceability(
        typeof step?.stepId === 'string' &&
          step.stepId.length > 0 &&
          Number.isInteger(step.stepOrdinal) &&
          step.stepOrdinal > 0 &&
          !stepIds.has(step.stepId) &&
          !ordinals.has(step.stepOrdinal),
        'invalid-private-step'
      );
      stepIds.add(step.stepId);
      ordinals.add(step.stepOrdinal);
    }
  }
  return crosswalk;
}

function joinPrivateTraceability(result, crosswalk, expected, terminalResult) {
  validateCrosswalk(crosswalk);
  const suite = SUITE_REGISTRY[result?.label];
  requireTraceability(
    suite &&
      result.outcome === 'success' &&
      Number(result.passing) === suite.expectedPhases.length &&
      Number(result.failing) === 0 &&
      Number(result.pending) === 0,
    'execution-not-successful'
  );
  const phases = terminalResult?.phaseResults;
  requireTraceability(
    terminalResult?.complete === true &&
      terminalResult.cleanupVerified === true &&
      terminalResult.exitCode === 0 &&
      !terminalResult.signal &&
      !terminalResult.diagnosticsError &&
      Array.isArray(phases) &&
      phases.length === suite.expectedPhases.length &&
      sameIdentities(
        phases.map((phase) => phase.phaseId),
        suite.expectedPhases
      ) &&
      phases.every(
        (phase) =>
          phase.complete === true && phase.exitCode === 0 && phase.cleanupVerified === true && !phase.diagnosticsError && !phase.signal
      ),
    'incomplete-or-unclean-execution'
  );
  requireTraceability(
    /^[a-f0-9]{40}$/i.test(expected?.sourceVersion || '') &&
      /^\d+$/.test(expected?.buildId || '') &&
      ['linux', 'win32', 'windows'].includes(expected?.platform) &&
      /^\d+\.\d+\.\d+$/.test(expected?.vscodeVersion || ''),
    'missing-source-build-binding'
  );
  const required = OGF_E2E_SCENARIOS.filter((scenario) => scenario.suiteId === result.label);
  requireTraceability(required.length > 0, 'no-applicable-scenario');
  requireTraceability(Array.isArray(result.ogfScenarios) && result.ogfScenarios.length === required.length, 'missing-executed-scenario');
  requireTraceability(
    Array.isArray(terminalResult.ogfScenarios) && terminalResult.ogfScenarios.length === result.ogfScenarios.length,
    'missing-terminal-scenario'
  );
  const observed = new Set();
  const expectedPlatform = expected.platform === 'windows' ? 'win32' : expected.platform;
  const scenarios = result.ogfScenarios.map((rawEvidence) => {
    const evidence = projectPublicScenarioEvidence(rawEvidence);
    requireTraceability(
      evidence.suiteId === result.label && !observed.has(evidence.scenarioId) && !Object.hasOwn(rawEvidence, 'source'),
      'invalid-public-execution-binding'
    );
    observed.add(evidence.scenarioId);
    requireTraceability(
      evidence.provenance.sourceVersion === expected.sourceVersion &&
        evidence.provenance.buildId === expected.buildId &&
        evidence.provenance.platform === expectedPlatform &&
        evidence.provenance.vscodeVersion === expected.vscodeVersion,
      'execution-provenance-mismatch'
    );
    const terminalEvidence = terminalResult.ogfScenarios.find((item) => item?.scenarioId === evidence.scenarioId);
    requireTraceability(
      terminalEvidence &&
        !Object.hasOwn(terminalEvidence, 'source') &&
        JSON.stringify(projectPublicScenarioEvidence(terminalEvidence)) === JSON.stringify(evidence),
      'terminal-scenario-mismatch'
    );
    const mapping = crosswalk.scenarios.find((item) => item.scenarioId === evidence.scenarioId);
    return { ...evidence, source: mapping.source };
  });
  return {
    schemaVersion: 1,
    evidenceKind: 'private-crosswalk-join',
    nativeExecutionOnly: true,
    approvalStatus: 'not-assessed',
    externalResultsWritten: false,
    scenarios,
  };
}

function joinSupplementaryCancel(result, crosswalk, root, expected) {
  const mapping = crosswalk.workspacePromptCancel;
  requireTraceability(mapping?.scenarioId === 'workspace-prompt-cancel', 'missing-private-supplementary-mapping');
  const source = mapping.source;
  requireTraceability(
    typeof source?.system === 'string' &&
      Number.isInteger(source.caseId) &&
      source.caseId > 0 &&
      Number.isInteger(source.caseRevision) &&
      source.caseRevision > 0 &&
      source.stepMappings?.length === 1 &&
      typeof source.stepMappings[0].stepId === 'string' &&
      Number.isInteger(source.stepMappings[0].stepOrdinal) &&
      source.stepMappings[0].stepOrdinal > 0,
    'invalid-private-supplementary-source'
  );
  assertCancelResult(result, root);
  requireTraceability(
    result.identity.source === expected.sourceVersion &&
      result.identity.run === expected.buildId &&
      result.identity.platform === (expected.platform === 'windows' ? 'win32' : expected.platform) &&
      result.code.version === expected.vscodeVersion,
    'supplementary-execution-provenance-mismatch'
  );
  return {
    scenarioId: 'workspace-prompt-cancel',
    evidenceKind: 'real-workbench-supplementary',
    source,
    provenance: { ...result.identity, vscodeVersion: result.code.version, codeSha256: result.code.sha256 },
    assertionIdentities: [
      'real-file-open-folder',
      'real-workspace-prompt-cancel',
      'unchanged-app-files-and-workbench',
      'ordinary-close-window',
    ],
    fullCaseCredit: false,
    certifiedCount: 0,
    canonicalMochaCount: 0,
  };
}

function runCli(args, env = process.env) {
  const options = Object.fromEntries(
    args.reduce((pairs, argument, index) => {
      if (index % 2 === 0) {
        requireTraceability(argument.startsWith('--') && args[index + 1], 'invalid-command-options');
        pairs.push([argument.slice(2), args[index + 1]]);
      }
      return pairs;
    }, [])
  );
  if (options.prepare) {
    fs.rmSync(options.prepare, { force: true });
    const raw = env.E2E_TRACEABILITY_CROSSWALK_JSON;
    requireTraceability(raw && raw.length <= 65536 && !raw.startsWith('$('), 'missing-private-crosswalk-input');
    let crosswalk;
    try {
      crosswalk = JSON.parse(raw);
    } catch {
      throw new TraceabilityError('Private traceability requirement failed: malformed-private-crosswalk');
    }
    validateCrosswalk(crosswalk);
    fs.mkdirSync(path.dirname(options.prepare), { recursive: true, mode: 0o700 });
    fs.writeFileSync(options.prepare, `${JSON.stringify(crosswalk)}\n`, { mode: 0o600 });
    console.log('Private traceability crosswalk validated; no catalogue values logged.');
    return;
  }
  requireTraceability(
    options.crosswalk && options.input && options.output && options['terminal-result'],
    'missing-private-crosswalk-options'
  );
  requireTraceability(
    [options.input, options.crosswalk, options['terminal-result']].every((input) => path.resolve(input) !== path.resolve(options.output)),
    'inputs-must-not-be-overwritten'
  );
  fs.rmSync(options.output, { force: true });
  const result = JSON.parse(fs.readFileSync(options.input, 'utf-8'));
  const crosswalk = JSON.parse(fs.readFileSync(options.crosswalk, 'utf-8'));
  const terminalResult = JSON.parse(fs.readFileSync(options['terminal-result'], 'utf-8'));
  const joined = joinPrivateTraceability(
    result,
    crosswalk,
    {
      sourceVersion: options['source-version'],
      buildId: options['build-id'],
      platform: options.platform,
      vscodeVersion: options['vscode-version'],
    },
    terminalResult
  );
  if (options['supplementary-input']) {
    const supplementaryPath = options['supplementary-input'];
    joined.supplementary = [
      joinSupplementaryCancel(JSON.parse(fs.readFileSync(supplementaryPath, 'utf8')), crosswalk, path.dirname(supplementaryPath), {
        sourceVersion: options['source-version'],
        buildId: options['build-id'],
        platform: options.platform,
        vscodeVersion: options['vscode-version'],
      }),
    ];
  }
  fs.mkdirSync(path.dirname(options.output), { recursive: true, mode: 0o700 });
  fs.writeFileSync(options.output, `${JSON.stringify(joined, null, 2)}\n`, { mode: 0o600 });
  console.log('Private traceability execution join written to restricted diagnostics; no catalogue values logged.');
}

if (require.main === module) {
  try {
    runCli(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof TraceabilityError ? error.message : 'Private traceability requirement failed: invalid-input-or-io');
    process.exitCode = 1;
  }
}

module.exports = { joinPrivateTraceability, joinSupplementaryCancel, runCli, validateCrosswalk };
