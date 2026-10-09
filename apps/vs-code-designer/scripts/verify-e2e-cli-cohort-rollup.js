#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global console, module, process, require */
const fs = require('fs');
const path = require('path');
const { SUITE_ALIASES, SUITE_REGISTRY } = require('./e2e-cli-batch');

const IDENTITY_FIELDS = [
  'producerDefinitionId',
  'producerRunId',
  'producerBuildNumber',
  'sourceSHA',
  'checkoutRef',
  'repositoryName',
  'repositoryUri',
  'artifactName',
  'artifactSHA256',
  'resolvedVSCodeBuild',
];
const MATRIX_FOOTER_SUITES = new Set(['createWorkspaceCoreMatrix', 'createWorkspacePreviewMatrix', 'createWorkspaceCodeful']);

function main(args = process.argv.slice(2)) {
  const artifactRoots = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== '--artifact' || !args[index + 1]) {
      throw new Error('Usage: verify-e2e-cli-cohort-rollup.js --artifact <cohort-artifact-root> [--artifact <root> ...]');
    }
    artifactRoots.push(args[index + 1]);
    index += 1;
  }
  verifyCohortRollup(artifactRoots);
}

function verifyCohortRollup(artifactRoots) {
  if (artifactRoots.length === 0) {
    throw new Error('At least one cohort artifact is required.');
  }
  const observedByPlatform = { linux: new Map(), windows: new Map() };
  let baselineIdentity;

  for (const artifactRoot of artifactRoots) {
    const inventoryPath = path.join(artifactRoot, 'inventory.json');
    if (!fs.existsSync(inventoryPath)) {
      throw new Error(`Missing cohort inventory: ${inventoryPath}`);
    }
    const inventory = readJson(inventoryPath);
    if (inventory.aggregateOutcome !== 'success' || inventory.containmentBreach === true) {
      throw new Error(`Cohort did not complete successfully: ${inventory.cohortId} outcome=${inventory.aggregateOutcome}`);
    }
    const platformName = inventory.platform === 'win32' ? 'windows' : 'linux';
    for (const suite of inventory.suites) {
      if (observedByPlatform[platformName].has(suite.suiteId)) {
        throw new Error(`Suite has multiple cohort owners: ${suite.rerunId}`);
      }
      if (suite.rerunId !== `${platformName}:${suite.suiteId}` || suite.evidenceStatus !== 'staged') {
        throw new Error(`Suite inventory is not stable and complete: ${suite.suiteId}`);
      }
      if (suite.classification !== 'success' || suite.finalOutcome !== 'success' || suite.cleanupVerified !== true) {
        throw new Error(`Suite did not preserve successful terminal cleanup evidence: ${suite.rerunId}`);
      }
      const suiteRoot = path.join(artifactRoot, suite.evidenceRoot);
      const resultRoot = path.join(suiteRoot, 'results');
      const resultPath = path.join(resultRoot, `${suite.suiteId}.json`);
      const junitPath = path.join(resultRoot, `${suite.suiteId}.junit.xml`);
      const summaryPath = path.join(resultRoot, `${suite.suiteId}.summary.md`);
      const terminalPath = path.join(resultRoot, `${suite.suiteId}.terminal-result.json`);
      const contextPath = path.join(resultRoot, `admission-context-${suite.suiteId}.json`);
      const logPath = path.join(suiteRoot, 'log', `${suite.suiteId}.log`);
      for (const required of [resultPath, junitPath, summaryPath, terminalPath, contextPath, logPath]) {
        if (!fs.existsSync(required)) {
          throw new Error(`Missing required cohort rollup evidence for ${suite.rerunId}: ${required}`);
        }
      }
      const result = readJson(resultPath);
      const passing = Number(result.passing);
      const failing = Number(result.failing);
      const pending = Number(result.pending);
      const total = Number(result.total);
      if (result.outcome !== 'success' || passing <= 0 || failing !== 0 || pending !== 0 || total !== passing) {
        throw new Error(`Suite result is not a successful executed run: ${suite.rerunId}`);
      }
      verifyNativeCompletions(suite.suiteId, fs.readFileSync(logPath, 'utf8'));
      const identity = readJson(contextPath);
      for (const field of IDENTITY_FIELDS) {
        if (!String(identity[field] || '')) {
          throw new Error(`Suite admitted identity is missing ${field}: ${suite.rerunId}`);
        }
      }
      if (!baselineIdentity) {
        baselineIdentity = identity;
      } else {
        for (const field of IDENTITY_FIELDS) {
          if (String(baselineIdentity[field]) !== String(identity[field])) {
            throw new Error(`Suite admitted identity mismatch for ${field}: ${suite.rerunId}`);
          }
        }
      }
      if (suite.suiteId === 'createWorkspaceCoreMatrix') {
        const traceabilityPath = path.join(artifactRoot, 'private-traceability', 'createWorkspaceCoreMatrix.json');
        if (!fs.existsSync(traceabilityPath)) {
          throw new Error(`Missing protected core-matrix traceability evidence: ${traceabilityPath}`);
        }
      }
      observedByPlatform[platformName].set(suite.suiteId, suite);
    }
  }

  for (const platformName of ['linux', 'windows']) {
    const expected = SUITE_ALIASES[platformName];
    const observed = [...observedByPlatform[platformName].keys()];
    const missing = expected.filter((suiteId) => !observed.includes(suiteId));
    const unexpected = observed.filter((suiteId) => !expected.includes(suiteId));
    if (missing.length > 0 || unexpected.length > 0) {
      throw new Error(
        `Cohort full rollup inventory mismatch for ${platformName}. missing=${missing.join(',') || '<none>'} unexpected=${
          unexpected.join(',') || '<none>'
        }`
      );
    }
  }
  console.log('Registry-driven both-OS cohort rollup verified.');
}

function verifyNativeCompletions(suiteId, logText) {
  const normalized = String(logText)
    .replace(/\r\n?/g, '\n')
    .replace(new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, 'g'), '');
  const completions = [...normalized.matchAll(/^[ \t]*(\d+) passing(?: \([^)]+\))?[ \t]*$/gm)].map((match) => Number(match[1]));
  if (MATRIX_FOOTER_SUITES.has(suiteId) && completions.length > 0) {
    const last = completions.length - 1;
    const completionLines = [...normalized.matchAll(/^[ \t]*(\d+) passing(?: \([^)]+\))?[ \t]*$/gm)];
    if (normalized.trimEnd().endsWith(completionLines[last][0].trim())) {
      completions.pop();
    }
  }
  const expected = SUITE_REGISTRY[suiteId].expectedPhases.length;
  if (completions.length < expected || completions.some((count) => count <= 0)) {
    throw new Error(
      `Suite log lacks required real Mocha completion evidence: ${suiteId} expected=${expected} actual=${completions.length}`
    );
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

module.exports = {
  _test: {
    verifyCohortRollup,
    verifyNativeCompletions,
  },
};
