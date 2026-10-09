#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global Buffer, console, require */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { _test } = require('./stage-e2e-cli-cohort');

function main() {
  testStagesStableSuiteEvidence();
  testRejectsEscapedEvidenceRoot();
  testStructuredJsonRedaction();
  testRejectsOversizedRequiredEvidence();
  testRejectsOversizedRequiredSupplementaryEvidence();
  testRejectsIncompleteSupplementaryTerminal();
  console.log('VS Code E2E CLI cohort staging tests passed.');
}

function testStagesStableSuiteEvidence() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-e2e-cohort-stage-'));
  try {
    const batchRoot = path.join(root, 'batch');
    const reportsRoot = path.join(batchRoot, 'unitTests', 'reports');
    const suiteRoot = path.join(batchRoot, 'unitTests');
    fs.mkdirSync(path.join(suiteRoot, 'lifecycle'), { recursive: true });
    fs.mkdirSync(path.join(reportsRoot, 'screenshots'), { recursive: true });
    fs.mkdirSync(path.join(reportsRoot, 'workspace-multi-root'), { recursive: true });
    fs.writeFileSync(
      path.join(reportsRoot, 'unitTests.json'),
      '{"outcome":"success","accessToken":"secret-value","AzureWebJobsStorage":"AccountKey=storage-secret"}\n'
    );
    fs.writeFileSync(path.join(reportsRoot, 'unitTests.junit.xml'), '<testsuite tests="1" failures="0" />\n');
    fs.writeFileSync(path.join(reportsRoot, 'unitTests.summary.md'), '# Success\n');
    fs.writeFileSync(path.join(reportsRoot, 'unitTests.terminal-result.json'), '{"finalOutcome":"success"}\n');
    fs.writeFileSync(path.join(reportsRoot, 'admission-context-unitTests.json'), '{"commit":"abc"}\n');
    fs.writeFileSync(path.join(reportsRoot, 'unitTests.batch-result.json'), '{"classification":"success"}\n');
    fs.writeFileSync(path.join(reportsRoot, 'unitTests.log'), 'Authorization: Bearer top-secret\n1 passing\n');
    fs.writeFileSync(path.join(reportsRoot, 'screenshots', 'screen.png'), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    fs.writeFileSync(path.join(reportsRoot, 'workspace-multi-root', 'final-result.json'), '{"complete":true}\n');
    fs.writeFileSync(path.join(suiteRoot, 'lifecycle', 'terminal-result.json'), '{"finalOutcome":"success"}\n');
    fs.writeFileSync(path.join(suiteRoot, 'lifecycle', 'suite-cleanup-ledger.json'), '{"private":true}\n');
    const aggregatePath = path.join(batchRoot, 'e2e-cli-batch-result.json');
    fs.writeFileSync(
      aggregatePath,
      `${JSON.stringify({
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        platform: 'linux',
        batchRoot,
        expectedSuiteIds: ['unitTests', 'msnWeatherLifecycle'],
        observedSuiteIds: ['unitTests', 'msnWeatherLifecycle'],
        missingSuiteIds: [],
        unexpectedSuiteIds: [],
        diagnosticOnly: true,
        trustedFullExecution: false,
        complete: true,
        selectedRunSuccess: false,
        containmentBreach: true,
        stoppedAfter: 'unitTests',
        aggregateOutcome: 'failed',
        failedSuites: ['unitTests'],
        blockedSuites: ['msnWeatherLifecycle'],
        suites: [
          {
            id: 'unitTests',
            rerunId: 'linux:unitTests',
            cohortId: 'linux-nonAzure',
            platform: 'linux',
            suiteRoot,
            reportsRoot,
            classification: 'success',
            finalOutcome: 'success',
            cleanupVerified: true,
          },
          {
            id: 'msnWeatherLifecycle',
            rerunId: 'linux:msnWeatherLifecycle',
            cohortId: 'linux-nonAzure',
            platform: 'linux',
            reportsRoot: null,
            classification: 'blocked',
            finalOutcome: 'blocked',
            reason: 'blocked after containment breach',
            cleanupVerified: false,
          },
        ],
      })}\n`
    );

    const outputRoot = path.join(root, 'public');
    const inventory = _test.stageCohortEvidence({
      aggregatePath,
      outputRoot,
      cohortId: 'linux-nonAzure',
      artifactName: 'vscode-e2e-cli-cohort-linux-nonAzure',
    });
    assert.equal(inventory.suites.length, 2);
    assert.equal(inventory.suites[0].rerunId, 'linux:unitTests');
    assert.equal(inventory.suites[1].evidenceStatus, 'blocked-before-launch');
    const publicLog = fs.readFileSync(path.join(outputRoot, 'suites', 'linux-unitTests', 'log', 'unitTests.log'), 'utf8');
    assert.doesNotMatch(publicLog, /top-secret/);
    assert.match(publicLog, /Authorization: <redacted> <redacted>/);
    assert.ok(fs.existsSync(path.join(outputRoot, 'suites', 'linux-unitTests', 'screenshots', 'screen.png')));
    assert.ok(fs.existsSync(path.join(outputRoot, 'suites', 'linux-unitTests', 'workspace-multi-root', 'final-result.json')));
    assert.ok(!fs.existsSync(path.join(outputRoot, 'suites', 'linux-unitTests', 'native', 'suite-cleanup-ledger.json')));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(outputRoot, 'suites', 'linux-unitTests', 'results', 'unitTests.json'), 'utf8')), {
      outcome: 'success',
      accessToken: '<redacted>',
      AzureWebJobsStorage: '<redacted>',
    });
    assert.ok(fs.existsSync(path.join(outputRoot, 'suites', 'linux-msnWeatherLifecycle', 'results', 'msnWeatherLifecycle.junit.xml')));
    assert.match(fs.readFileSync(path.join(outputRoot, 'rerun.md'), 'utf8'), /linux:unitTests/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function testRejectsEscapedEvidenceRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-e2e-cohort-stage-escape-'));
  try {
    const batchRoot = path.join(root, 'batch');
    const escapedRoot = path.join(root, 'escaped');
    fs.mkdirSync(batchRoot, { recursive: true });
    fs.mkdirSync(escapedRoot, { recursive: true });
    const aggregatePath = path.join(batchRoot, 'e2e-cli-batch-result.json');
    fs.writeFileSync(
      aggregatePath,
      `${JSON.stringify({
        schemaVersion: 1,
        platform: 'linux',
        batchRoot,
        expectedSuiteIds: ['unitTests'],
        suites: [{ id: 'unitTests', reportsRoot: escapedRoot, classification: 'success', finalOutcome: 'success' }],
      })}\n`
    );
    assert.throws(
      () =>
        _test.stageCohortEvidence({
          aggregatePath,
          outputRoot: path.join(root, 'public'),
          cohortId: 'linux-nonAzure',
        }),
      /escaped the batch root/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function testStructuredJsonRedaction() {
  assert.deepEqual(
    _test.redactJsonValue({
      accessToken: 'secret-value',
      nested: {
        clientSecret: 'nested-secret',
        idToken: 'federated-secret',
        token: 'generic-secret',
        authorizationToken: 'authorization-secret',
        bearerToken: 'bearer-secret',
        signal: null,
        designer: 'workflow-designer',
        safe: 'AccountKey=embedded-secret',
      },
    }),
    {
      accessToken: '<redacted>',
      nested: {
        clientSecret: '<redacted>',
        idToken: '<redacted>',
        token: '<redacted>',
        authorizationToken: '<redacted>',
        bearerToken: '<redacted>',
        signal: null,
        designer: 'workflow-designer',
        safe: 'AccountKey=<redacted>',
      },
    }
  );

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-e2e-cohort-jsonl-redaction-'));
  try {
    const source = path.join(root, 'events.jsonl');
    const destination = path.join(root, 'public', 'events.jsonl');
    fs.writeFileSync(
      source,
      `${JSON.stringify({
        signal: null,
        designer: 'workflow-designer',
        clientSecret: 'nested-secret',
        token: 'generic-secret',
        authorizationToken: 'authorization-secret',
        bearerToken: 'bearer-secret',
      })}\n`
    );
    _test.copySanitizedFile(source, destination, { required: true });
    assert.deepEqual(JSON.parse(fs.readFileSync(destination, 'utf8').trim()), {
      signal: null,
      designer: 'workflow-designer',
      clientSecret: '<redacted>',
      token: '<redacted>',
      authorizationToken: '<redacted>',
      bearerToken: '<redacted>',
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function testRejectsOversizedRequiredEvidence() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-e2e-cohort-stage-large-'));
  try {
    const source = path.join(root, 'required.log');
    fs.writeFileSync(source, Buffer.alloc(5 * 1024 * 1024 + 1, 65));
    assert.throws(
      () => _test.copySanitizedFile(source, path.join(root, 'out.log'), { required: true }),
      /Required cohort evidence exceeds/
    );
    assert.ok(!fs.existsSync(path.join(root, 'out.log')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function testRejectsOversizedRequiredSupplementaryEvidence() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-e2e-cohort-stage-large-supplement-'));
  try {
    const batchRoot = path.join(root, 'batch');
    const suiteRoot = path.join(batchRoot, 'workspaceMultiRoot');
    const reportsRoot = path.join(suiteRoot, 'reports');
    fs.mkdirSync(path.join(reportsRoot, 'workspace-multi-root'), { recursive: true });
    fs.writeFileSync(path.join(reportsRoot, 'workspaceMultiRoot.json'), '{"outcome":"failure"}\n');
    fs.writeFileSync(path.join(reportsRoot, 'workspaceMultiRoot.junit.xml'), '<testsuite tests="1" failures="1" />\n');
    fs.writeFileSync(path.join(reportsRoot, 'workspaceMultiRoot.summary.md'), '# Failure\n');
    fs.writeFileSync(path.join(reportsRoot, 'workspaceMultiRoot.terminal-result.json'), '{"complete":false}\n');
    fs.writeFileSync(path.join(reportsRoot, 'admission-context-workspaceMultiRoot.json'), '{"sourceSHA":"abc"}\n');
    fs.writeFileSync(path.join(reportsRoot, 'workspaceMultiRoot.log'), '1 failing\n');
    fs.writeFileSync(path.join(reportsRoot, 'workspace-multi-root', 'final-result.json'), Buffer.alloc(5 * 1024 * 1024 + 1, 65));
    const aggregatePath = path.join(batchRoot, 'e2e-cli-batch-result.json');
    fs.writeFileSync(
      aggregatePath,
      `${JSON.stringify({
        schemaVersion: 1,
        platform: 'linux',
        batchRoot,
        expectedSuiteIds: ['workspaceMultiRoot'],
        observedSuiteIds: ['workspaceMultiRoot'],
        missingSuiteIds: [],
        unexpectedSuiteIds: [],
        aggregateOutcome: 'failed',
        suites: [
          {
            id: 'workspaceMultiRoot',
            rerunId: 'linux:workspaceMultiRoot',
            platform: 'linux',
            suiteRoot,
            reportsRoot,
            classification: 'ordinaryFailure',
            finalOutcome: 'failure',
            cleanupVerified: true,
          },
        ],
      })}\n`
    );
    assert.throws(
      () =>
        _test.stageCohortEvidence({
          aggregatePath,
          outputRoot: path.join(root, 'public'),
          cohortId: 'linux-nonAzure',
        }),
      /Required cohort evidence exceeds/
    );
    assert.ok(fs.existsSync(path.join(root, 'public', 'staging-errors.txt')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function testRejectsIncompleteSupplementaryTerminal() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-e2e-cohort-stage-terminal-'));
  try {
    const batchRoot = path.join(root, 'batch');
    const suiteRoot = path.join(batchRoot, 'workspaceMultiRoot');
    const reportsRoot = path.join(suiteRoot, 'reports');
    fs.mkdirSync(path.join(reportsRoot, 'workspace-multi-root'), { recursive: true });
    fs.writeFileSync(
      path.join(reportsRoot, 'workspaceMultiRoot.json'),
      '{"outcome":"success","passing":1,"failing":0,"pending":0,"total":1}\n'
    );
    fs.writeFileSync(path.join(reportsRoot, 'workspaceMultiRoot.junit.xml'), '<testsuite tests="1" failures="0" />\n');
    fs.writeFileSync(path.join(reportsRoot, 'workspaceMultiRoot.summary.md'), '# Success\n');
    fs.writeFileSync(path.join(reportsRoot, 'workspaceMultiRoot.terminal-result.json'), '{"complete":true}\n');
    fs.writeFileSync(path.join(reportsRoot, 'admission-context-workspaceMultiRoot.json'), '{"sourceSHA":"abc"}\n');
    fs.writeFileSync(path.join(reportsRoot, 'workspaceMultiRoot.log'), '1 passing\n');
    fs.writeFileSync(path.join(reportsRoot, 'workspace-multi-root', 'final-result.json'), '{"complete":true}\n');
    const aggregatePath = path.join(batchRoot, 'e2e-cli-batch-result.json');
    fs.writeFileSync(
      aggregatePath,
      `${JSON.stringify({
        schemaVersion: 1,
        platform: 'linux',
        batchRoot,
        expectedSuiteIds: ['workspaceMultiRoot'],
        observedSuiteIds: ['workspaceMultiRoot'],
        missingSuiteIds: [],
        unexpectedSuiteIds: [],
        aggregateOutcome: 'success',
        suites: [
          {
            id: 'workspaceMultiRoot',
            rerunId: 'linux:workspaceMultiRoot',
            platform: 'linux',
            suiteRoot,
            reportsRoot,
            classification: 'success',
            finalOutcome: 'success',
            cleanupVerified: true,
          },
        ],
      })}\n`
    );
    assert.throws(
      () =>
        _test.stageCohortEvidence({
          aggregatePath,
          outputRoot: path.join(root, 'public'),
          cohortId: 'linux-nonAzure',
        }),
      /Supplementary lifecycle terminal validation failed/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main();
