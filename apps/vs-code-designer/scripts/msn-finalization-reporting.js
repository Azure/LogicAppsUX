/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global module, process, require */
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const { redactDiagnosticText } = require('./run-e2e-cli');

const reportName = 'msnWeatherLifecycle.cleanup-finalization.txt';
const failureName = 'MSN lifecycle evidence';
const note =
  'Cleanup/finalization harness failure, not an additional executed feature test. No failing UI screenshot is implied: Code may already have closed; a successful response image is not failure proof.';

function redactReportingText(text) {
  return redactDiagnosticText(String(text)).replace(/https?:\/\/[^\s"')]+/gi, (value) => {
    if (!URL.canParse(value)) {
      return '<unparseable URL omitted>';
    }
    const url = new URL(value);
    if (url.username || url.password) {
      url.username = '<redacted>';
      url.password = '<redacted>';
      return url.toString();
    }
    return value;
  });
}

function artifactReferences(artifactName) {
  if (artifactName && !/^[a-z0-9._-]+$/i.test(artifactName)) {
    throw new Error('Unsafe diagnostics artifact name');
  }
  return artifactName
    ? [
        { title: 'Exact diagnostic runner log', artifactName, relativePath: 'log/msnWeatherLifecycle.log' },
        { title: 'Sanitized cleanup/finalization evidence', artifactName, relativePath: `log/${reportName}` },
      ]
    : [];
}

function runReferences(env, artifactName) {
  const references = artifactReferences(artifactName);
  const collection = env.SYSTEM_COLLECTIONURI || env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI;
  const project = env.SYSTEM_TEAMPROJECTID || env.SYSTEM_TEAMPROJECT;
  if (!collection || !project || !/^\d+$/.test(env.BUILD_BUILDID || '')) {
    return references;
  }
  const base = new URL(collection);
  if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error('Unsafe ADO evidence-link context');
  }
  if (!base.pathname.endsWith('/')) {
    base.pathname += '/';
  }
  const run = new URL(`${encodeURIComponent(project)}/_build/results`, base);
  run.searchParams.set('buildId', env.BUILD_BUILDID);
  if (artifactName) {
    const artifacts = new URL(run);
    artifacts.searchParams.set('view', 'artifacts');
    references.push({ title: `Run diagnostics artifact: ${artifactName}`, url: artifacts.toString() });
  }
  run.searchParams.set('view', 'logs');
  const guid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  if (guid.test(env.SYSTEM_JOBID || '')) {
    run.searchParams.set('j', env.SYSTEM_JOBID);
  }
  if (guid.test(env.SYSTEM_TASKINSTANCEID || '') && run.searchParams.has('j')) {
    run.searchParams.set('t', env.SYSTEM_TASKINSTANCEID);
  }
  references.push({ title: run.searchParams.has('t') ? 'Exact producing run task log' : 'Producing run logs', url: run.toString() });
  return references;
}

function formatReference(reference) {
  return `${reference.title}: ${reference.url || `${reference.artifactName}/${reference.relativePath}`}`;
}

function createMsnFinalizationReport({ result, terminal, logText, outDir, diagnosticsArtifactName, env = process.env }) {
  const artifactName = diagnosticsArtifactName || '';
  if (artifactName && !/^[a-z0-9._-]+$/i.test(artifactName)) {
    throw new Error('Unsafe diagnostics artifact name');
  }
  const references = runReferences(env, artifactName);
  const claims = {};
  for (const key of [
    'complete',
    'cleanupVerified',
    'filesystemCleanupVerified',
    'originalProcessClosureVerified',
    'lifecycleFinalized',
    'lifecycleBodySucceeded',
    'phaseCompleteness',
    'exitCode',
  ]) {
    if (typeof terminal?.[key] === 'boolean' || typeof terminal?.[key] === 'number') {
      claims[key] = terminal[key];
    }
  }
  const failureReasons = Array.isArray(terminal?.failureReasons)
    ? terminal.failureReasons.filter((reason) => typeof reason === 'string').slice(0, 20)
    : [];
  const cleanupLines = logText
    .split(/\r?\n/)
    .map((text, index) => ({ text, line: index + 1 }))
    .filter(({ text }) =>
      /\d+ passing\b|Extension host.*exited|Exit code:|EBUSY|EPERM|EACCES|cleanup|finalization|original.process.*closure|unsuccessful.wrapper/i.test(
        text
      )
    )
    .slice(-80)
    .map(({ text, line }) => `L${line}: ${redactReportingText(text).slice(0, 2048)}`);
  const failure = result.harnessFailures.find((entry) => entry.name === failureName && entry.kind === 'lifecycle-evidence');
  const contents = redactReportingText(
    [
      failureName,
      `Reporting timestamp: ${result.generatedAt}`,
      `Reporting outcome: ${result.outcome}`,
      `Original executed Mocha counts: ${JSON.stringify(result.executedTestCounts)}`,
      note,
      `Harness verdict: ${failure.message}`,
      '',
      'Recorded terminal claims (may predate outer cleanup; not acceptance):',
      terminal ? JSON.stringify(claims, null, 2) : 'No readable terminal was supplied.',
      ...failureReasons.map((reason) => redactReportingText(reason).slice(0, 4096)),
      '',
      'Actual runner cleanup/finalization log evidence:',
      ...(cleanupLines.length ? cleanupLines : ['No matching cleanup lines were recorded; inspect the exact runner log reference below.']),
      '',
      ...references.map(formatReference),
      '',
    ].join('\n')
  );
  fs.mkdirSync(outDir, { recursive: true });
  const attachmentPath = path.resolve(outDir, reportName);
  fs.writeFileSync(attachmentPath, contents, 'utf8');
  return {
    note,
    references,
    attachment: {
      label: result.label,
      testTitle: failureName,
      evidenceKind: 'cleanup-finalization-diagnostics',
      attachmentPath,
    },
  };
}

module.exports = { createMsnFinalizationReport, formatReference, artifactReferences, redactReportingText };
