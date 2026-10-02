#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global module, process, require */
const fs = require('fs');
const path = require('path');
const { assertSuccessfulMsnTerminal, readMsnTerminal } = require('./e2e-cli-terminal');
const { projectPublicScenarioEvidence } = require('./ogf-e2e-registry');

if (require.main === module) {
  const options = parseArgs(process.argv.slice(2));

  if (options.aggregate) {
    writeAggregateResult(options);
  } else if (options.appendSummary) {
    appendSingleSummary(options);
  } else {
    writeSingleResult(options);
  }
}

function writeSingleResult({ label, log, outDir, outcome, diagnosticsArtifactName }) {
  requireOption(label, '--label');
  requireOption(log, '--log');
  requireOption(outDir, '--out-dir');

  const logText = stripAnsi(fs.existsSync(log) ? fs.readFileSync(log, 'utf-8') : '');
  const result = parseMochaLog(label, outcome ?? 'unknown', logText);
  let terminalError;
  let terminal;
  if (label === 'msnWeatherLifecycle') {
    const executedResult = parseMochaLog(label, 'success', logText);
    result.executedTestCounts = executedResult.executedTestCounts;
    const terminalPath = path.join(outDir, `${label}.terminal-result.json`);
    try {
      terminal = readMsnTerminal(terminalPath);
      if (result.outcome === 'success' || executedResult.failing === 0) {
        assertSuccessfulMsnTerminal(executedResult, terminal);
        if (result.outcome !== 'success') {
          throw new Error('MSN lifecycle evidence failed: unsuccessful-wrapper');
        }
      }
    } catch (error) {
      terminalError = error;
      Object.assign(result, executedResult, { outcome: 'failure' });
      result.harnessFailures = [
        ...(executedResult.harnessFailures || []),
        { name: 'MSN lifecycle evidence', kind: 'lifecycle-evidence', message: error.message },
      ];
      result.failedTests = [...executedResult.failedTests, 'MSN lifecycle evidence'];
      result.failing = result.failedTests.length;
      result.total = result.passing + result.failing + result.pending;
      result.passRate = result.total > 0 ? Number(((result.passing / result.total) * 100).toFixed(2)) : 0;
      result.failureExcerpt.push(error.message);
    }
  }
  mergeTerminalResultMetadata(result, outDir, label, label === 'msnWeatherLifecycle' ? { terminalResult: terminal } : {});
  result.diagnosticsArtifactName = diagnosticsArtifactName || undefined;
  result.failureAttachments = result.failing > 0 ? loadFailureScreenshotAttachments(outDir, label) : [];
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, `${label}.json`), `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, `${label}.junit.xml`), buildJUnitXml(result));
  fs.writeFileSync(path.join(outDir, `${label}.summary.md`), buildSingleSummary(result));
  if (terminalError) {
    throw terminalError;
  }
}

function appendSingleSummary({ json, githubSummary }) {
  requireOption(json, '--json');
  requireOption(githubSummary, '--github-summary');

  const result = JSON.parse(fs.readFileSync(json, 'utf-8'));
  fs.appendFileSync(githubSummary, buildSingleSummary(result));
}

function writeAggregateResult({ resultsDir, outDir, githubSummary, expectedSuites, diagnosticOnly }) {
  requireOption(resultsDir, '--results-dir');
  requireOption(outDir, '--out-dir');

  fs.mkdirSync(outDir, { recursive: true });
  const results = findJsonResults(resultsDir)
    .map((file) => JSON.parse(fs.readFileSync(file, 'utf-8')))
    .filter(isSingleResult)
    .map(normalizeResult)
    .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  const aggregate = buildAggregate(results, {
    expectedLabels: parseCsvOption(expectedSuites),
    diagnosticOnly: parseBooleanOption(diagnosticOnly),
  });

  fs.writeFileSync(path.join(outDir, 'vscode-e2e-cli-create-workspace-results.json'), `${JSON.stringify(aggregate, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, 'vscode-e2e-cli-create-workspace-results.junit.xml'), buildAggregateJUnitXml(aggregate));
  fs.writeFileSync(path.join(outDir, 'vscode-e2e-cli-create-workspace-trend.jsonl'), `${JSON.stringify(aggregate.trend)}\n`);
  fs.writeFileSync(path.join(outDir, 'vscode-e2e-cli-create-workspace-dashboard.md'), buildAggregateSummary(aggregate));

  if (githubSummary) {
    fs.appendFileSync(githubSummary, buildAggregateSummary(aggregate));
  }
}

function parseMochaLog(label, outcome, logText) {
  const passing = lastNumberMatch(logText, /^[ \t]*(\d+) passing\b/gm);
  const failing = lastNumberMatch(logText, /^[ \t]*(\d+) failing\b/gm);
  const pending = lastNumberMatch(logText, /^[ \t]*(\d+) pending\b/gm);
  const duration = lastTextMatch(logText, /^[ \t]*\d+ passing \(([^)]+)\)/gm);
  const passedTests = passing > 0 ? collectMatches(logText, /^[ \t]+(?:√|✔)\s+(.+?)(?:\s+\(\d+ms\))?[ \t]*$/gm).slice(-passing) : [];
  const failures = parseMochaFailures(logText, failing);
  const failedTests = failures.map((failure) => failure.name);
  const hookFailures = failures.filter((failure) => failure.hook);
  const failureExcerpt = buildFailureExcerpt(logText);
  const normalizedFailing = outcome === 'success' ? failing : Math.max(failing, failedTests.length, 1);
  const total = passing + normalizedFailing + pending;
  const executedFailing = failures.filter((failure) => failure.identified && !failure.hook).length;
  const unclassifiedMochaFailureCount = failures.filter((failure) => !failure.identified).length;

  return {
    label,
    outcome,
    total,
    passing,
    failing: normalizedFailing,
    pending,
    passRate: total > 0 ? Number(((passing / total) * 100).toFixed(2)) : 0,
    duration,
    passedTests,
    failedTests,
    executedTestCounts: { total: passing + executedFailing + pending, passing, failing: executedFailing, pending },
    ...(unclassifiedMochaFailureCount ? { unclassifiedMochaFailureCount } : {}),
    ...(hookFailures.length
      ? {
          harnessFailures: hookFailures.map((failure) => ({
            name: failure.name,
            kind: 'mocha-hook',
            message: 'Mocha hook failure; not an additional executed feature test.',
          })),
        }
      : {}),
    failureExcerpt,
    generatedAt: new Date().toISOString(),
  };
}

function parseMochaFailures(logText, failing) {
  const footer = /^([ \t]*)\d+ failing\b/gm;
  let footerEnd = -1;
  let footerIndent;
  let footerMatch;
  while ((footerMatch = footer.exec(logText)) !== null) {
    footerEnd = footer.lastIndex;
    footerIndent = footerMatch[1];
  }
  const section = footerEnd < 0 ? logText : logText.slice(footerEnd);
  const header = /^([ \t]*)(\d+)\)\s+(.+?)[ \t]*$/gm;
  const records = new Map();
  let match;
  while ((match = header.exec(section)) !== null) {
    const ordinal = Number(match[2]);
    if (match[1] !== footerIndent || ordinal < 1 || ordinal > failing || records.has(ordinal)) {
      continue;
    }
    const parts = [match[3].trim().replace(/:$/, '')];
    let identified = match[3].trim().endsWith(':');
    if (!identified) {
      for (const line of section.slice(header.lastIndex).split(/\r?\n/).slice(1)) {
        const text = line.trim();
        if (!text || /^\w*Error\b|^at\b/.test(text) || line.search(/\S/) <= match[1].length) {
          break;
        }
        parts.push(text.replace(/:$/, ''));
        if (text.endsWith(':')) {
          identified = true;
          break;
        }
      }
    }
    const name = parts.join(': ');
    records.set(ordinal, {
      name,
      identified,
      hook: identified && /^"(?:before all|after all|before each|after each)" hook(?: for .+| in .+|: .+)?$/.test(parts[parts.length - 1]),
    });
  }
  return Array.from(
    { length: failing },
    (_, index) => records.get(index + 1) || { name: `Failure ${index + 1}`, identified: false, hook: false }
  );
}

function buildAggregate(results, options = {}) {
  const expectedLabels = Array.isArray(options.expectedLabels) ? options.expectedLabels : [];
  const observedLabels = results.map((result) => result.label);
  const missingLabels = expectedLabels.filter((label) => !observedLabels.includes(label));
  const unexpectedLabels = expectedLabels.length > 0 ? observedLabels.filter((label) => !expectedLabels.includes(label)) : [];
  const complete = expectedLabels.length === 0 || (missingLabels.length === 0 && unexpectedLabels.length === 0);
  const diagnosticOnly = Boolean(options.diagnosticOnly);
  const fullRollup = complete && !diagnosticOnly;
  const rawTotal = results.reduce((sum, result) => sum + result.total, 0);
  const passing = results.reduce((sum, result) => sum + result.passing, 0);
  const rawFailing = results.reduce((sum, result) => sum + result.failing, 0);
  const pending = results.reduce((sum, result) => sum + result.pending, 0);
  const syntheticFailures = missingLabels.length + unexpectedLabels.length + (diagnosticOnly ? 1 : 0);
  const total = rawTotal + syntheticFailures;
  const failing = rawFailing + syntheticFailures;
  const failedLabels = [
    ...results.filter((result) => result.outcome !== 'success' || result.failing > 0).map((result) => result.label),
    ...missingLabels.map((label) => `${label} (missing)`),
    ...unexpectedLabels.map((label) => `${label} (unexpected)`),
    ...(diagnosticOnly ? ['diagnosticOnly (not a full rollup)'] : []),
  ];
  const passRate = total > 0 ? Number(((passing / total) * 100).toFixed(2)) : 0;
  const generatedAt = new Date().toISOString();

  return {
    generatedAt,
    schemaVersion: 2,
    expectedLabels,
    observedLabels,
    missingLabels,
    unexpectedLabels,
    complete,
    diagnosticOnly,
    fullRollup,
    total,
    passing,
    failing,
    pending,
    passRate,
    failedLabels,
    labels: results,
    trend: {
      generatedAt,
      workflow: process.env.GITHUB_WORKFLOW ?? '',
      runId: process.env.GITHUB_RUN_ID ?? '',
      runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? '',
      repository: process.env.GITHUB_REPOSITORY ?? '',
      ref: process.env.GITHUB_REF ?? '',
      sha: process.env.GITHUB_SHA ?? '',
      total,
      passing,
      failing,
      pending,
      passRate,
      failedLabels,
      expectedLabels,
      observedLabels,
      missingLabels,
      unexpectedLabels,
      complete,
      diagnosticOnly,
      fullRollup,
    },
  };
}

function buildSingleSummary(result) {
  const diagnosticsArtifactName = result.diagnosticsArtifactName || '';
  const artifactColumns = diagnosticsArtifactName
    ? {
        header: '| Label | Outcome | Passing | Failing | Pending | Pass rate | Diagnostics |',
        separator: '|---|---:|---:|---:|---:|---:|---|',
        row: `| \`${result.label}\` | \`${result.outcome}\` | ${result.passing} | ${result.failing} | ${result.pending} | ${result.passRate}% | \`${diagnosticsArtifactName}\` |`,
        description:
          'The diagnostics artifact contains structured results under `results/`, the raw runner log and VS Code profile logs under `log/`, screenshots under `screenshots/`, and generated workspace snapshots under `generated-workspaces/`.',
      }
    : {
        header: '| Label | Outcome | Passing | Failing | Pending | Pass rate | JUnit | Logs | Screenshots |',
        separator: '|---|---:|---:|---:|---:|---:|---|---|---|',
        row: `| \`${result.label}\` | \`${result.outcome}\` | ${result.passing} | ${result.failing} | ${result.pending} | ${result.passRate}% | \`vscode-e2e-cli-test-results-${result.label}\` | \`vscode-e2e-cli-log-${result.label}\` | \`vscode-e2e-cli-screenshots-${result.label}\` |`,
        description:
          'The log artifact contains the raw runner log and VS Code profile logs under `vscode-logs/`, including extension host and output-channel logs when VS Code produced them.',
      };
  const lines = [
    `### @vscode/test-cli: \`${result.label}\``,
    '',
    artifactColumns.header,
    artifactColumns.separator,
    artifactColumns.row,
    '',
    artifactColumns.description,
    '',
  ];

  if (result.harnessFailures?.length) {
    lines.push(
      `**Harness evidence failure:** ${result.harnessFailures.map((failure) => failure.message).join('; ')}.`,
      `Executed Mocha tests: ${result.executedTestCounts.passing} passing, ${result.executedTestCounts.failing} failing, ${result.executedTestCounts.pending} pending. Normalized reporting includes harness failures; they are not additional executed feature tests.`,
      ''
    );
  }

  if (result.failing > 0 && result.failureExcerpt.length > 0) {
    lines.push('<details><summary>Failure excerpt</summary>', '', '```text', ...result.failureExcerpt, '```', '</details>', '');
  }

  return `${lines.join('\n')}\n`;
}

function buildAggregateSummary(aggregate) {
  const lines = [
    '### @vscode/test-cli Create Workspace aggregate',
    '',
    `**Pass rate:** ${aggregate.passRate}% (${aggregate.passing}/${aggregate.total})`,
    `**Completeness:** ${aggregate.complete ? 'complete' : 'incomplete'} (${aggregate.observedLabels.length}/${aggregate.expectedLabels.length || aggregate.observedLabels.length} observed)`,
    `**Full rollup:** ${aggregate.fullRollup ? 'yes' : 'no'}${aggregate.diagnosticOnly ? ' — diagnostic selected rerun' : ''}`,
    '',
    '| Label | Outcome | Passing | Failing | Pending | Pass rate | Results | Screenshots |',
    '|---|---:|---:|---:|---:|---:|---|---|',
  ];

  for (const result of aggregate.labels) {
    lines.push(
      `| \`${result.label}\` | \`${result.outcome}\` | ${result.passing} | ${result.failing} | ${result.pending} | ${result.passRate}% | \`vscode-e2e-cli-test-results-${result.label}\` | \`vscode-e2e-cli-screenshots-${result.label}\` |`
    );
  }

  lines.push(
    '',
    `Missing expected labels: ${
      aggregate.missingLabels.length ? aggregate.missingLabels.map((label) => `\`${label}\``).join(', ') : 'None'
    }`,
    `Unexpected labels: ${
      aggregate.unexpectedLabels.length ? aggregate.unexpectedLabels.map((label) => `\`${label}\``).join(', ') : 'None'
    }`,
    `Failed labels: ${aggregate.failedLabels.length ? aggregate.failedLabels.map((label) => `\`${label}\``).join(', ') : 'None'}`,
    '',
    'Structured artifacts: `vscode-e2e-cli-test-results-summary` contains aggregate JSON, aggregate JUnit XML, a Markdown dashboard, and JSONL trend data for pass-rate ingestion across workflow runs.',
    ''
  );

  return `${lines.join('\n')}\n`;
}

function buildJUnitXml(result, options = {}) {
  const failedTests = Array.isArray(result.failedTests) ? result.failedTests : [];
  const passedTests = Array.isArray(result.passedTests) ? result.passedTests : [];
  const failureExcerpt = Array.isArray(result.failureExcerpt) ? result.failureExcerpt : [];
  const failureAttachments =
    options.includeAttachments === false || !Array.isArray(result.failureAttachments) ? [] : result.failureAttachments;
  const failures = failedTests.length > 0 ? failedTests : Array.from({ length: result.failing }, (_, index) => `Failure ${index + 1}`);
  const passed = passedTests.length > 0 ? passedTests : Array.from({ length: result.passing }, (_, index) => `Passing test ${index + 1}`);
  const testCases = [
    ...passed.map((name) => `    <testcase classname="${escapeXml(result.label)}" name="${escapeXml(name)}" />`),
    ...failures.map((name) => {
      const testcaseAttachments = failureAttachments.filter((attachment) => attachmentMatchesTest(attachment, name));
      const attachmentOutput =
        testcaseAttachments.length > 0
          ? [
              '      <system-out>',
              escapeXml(
                testcaseAttachments.map((attachment) => `[[ATTACHMENT|${formatAttachmentPath(attachment.screenshotPath)}]]`).join('\n')
              ),
              '      </system-out>',
            ].join('\n')
          : '';
      return [
        `    <testcase classname="${escapeXml(result.label)}" name="${escapeXml(name)}">`,
        `      <failure message="${escapeXml(name)}">${escapeXml(failureExcerpt.join('\n'))}</failure>`,
        attachmentOutput,
        '    </testcase>',
      ]
        .filter(Boolean)
        .join('\n');
    }),
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuite name="${escapeXml(result.label)}" tests="${result.total}" failures="${result.failing}" skipped="${result.pending}">`,
    ...testCases,
    '</testsuite>',
    '',
  ].join('\n');
}

function buildAggregateJUnitXml(aggregate) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuites name="vscode-e2e-cli-create-workspace" tests="${aggregate.total}" failures="${aggregate.failing}" skipped="${aggregate.pending}">`,
    ...aggregate.labels.map((result) => buildJUnitXml(result, { includeAttachments: false }).split('\n').slice(1, -1).join('\n')),
    '</testsuites>',
    '',
  ].join('\n');
}

function findJsonResults(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return findJsonResults(entryPath);
    }

    return entry.name.endsWith('.json') && !entry.name.includes('summary') && !entry.name.includes('aggregate') ? [entryPath] : [];
  });
}

function isSingleResult(result) {
  return typeof result?.label === 'string' && typeof result.outcome === 'string';
}

function normalizeResult(result) {
  return {
    ...result,
    total: Number(result.total) || 0,
    passing: Number(result.passing) || 0,
    failing: Number(result.failing) || 0,
    pending: Number(result.pending) || 0,
    passRate: Number(result.passRate) || 0,
    passedTests: Array.isArray(result.passedTests) ? result.passedTests : [],
    failedTests: Array.isArray(result.failedTests) ? result.failedTests : [],
    failureExcerpt: Array.isArray(result.failureExcerpt) ? result.failureExcerpt : [],
    failureAttachments: Array.isArray(result.failureAttachments) ? result.failureAttachments : [],
  };
}

function mergeTerminalResultMetadata(result, outDir, label, options = {}) {
  const terminalResultPath = path.join(outDir, `${label}.terminal-result.json`);
  if (!fs.existsSync(terminalResultPath)) {
    return result;
  }

  const terminalResult = Object.prototype.hasOwnProperty.call(options, 'terminalResult')
    ? options.terminalResult
    : JSON.parse(fs.readFileSync(terminalResultPath, 'utf-8'));
  if (!terminalResult || typeof terminalResult !== 'object') {
    return result;
  }
  if (terminalResult.complete !== true || result.outcome !== 'success' || Number(result.passing) <= 0 || Number(result.failing) > 0) {
    stripTerminalOgfMetadata(terminalResultPath, terminalResult);
    return result;
  }

  const ogfScenarios = Array.isArray(terminalResult.ogfScenarios) ? terminalResult.ogfScenarios.map(projectPublicScenarioEvidence) : [];
  if (ogfScenarios.length > 0) {
    result.ogfScenarios = ogfScenarios;
    terminalResult.ogfScenarios = ogfScenarios;
    terminalResult.phaseResults = (terminalResult.phaseResults || []).map((phase) => {
      const publicPhase = { ...phase };
      delete publicPhase.ogfScenarios;
      return publicPhase;
    });
    fs.writeFileSync(terminalResultPath, `${JSON.stringify(terminalResult, null, 2)}\n`);
  }
  if (terminalResult.phaseId) {
    result.terminalPhaseId = terminalResult.phaseId;
  }
  if (Number.isFinite(Number(terminalResult.mochaPassingCount))) {
    result.terminalMochaPassingCount = Number(terminalResult.mochaPassingCount);
  }
  return result;
}

function stripTerminalOgfMetadata(terminalResultPath, terminalResult) {
  const hasTopLevelOgf = Object.prototype.hasOwnProperty.call(terminalResult, 'ogfScenarios');
  const phaseResults = Array.isArray(terminalResult.phaseResults) ? terminalResult.phaseResults : [];
  const hasPhaseOgf = phaseResults.some((phase) => Object.prototype.hasOwnProperty.call(phase, 'ogfScenarios'));
  if (!hasTopLevelOgf && !hasPhaseOgf) {
    return;
  }
  const sanitized = { ...terminalResult };
  delete sanitized.ogfScenarios;
  if (hasPhaseOgf) {
    sanitized.phaseResults = phaseResults.map((phase) => {
      const sanitizedPhase = { ...phase };
      delete sanitizedPhase.ogfScenarios;
      return sanitizedPhase;
    });
  }
  fs.writeFileSync(terminalResultPath, `${JSON.stringify(sanitized, null, 2)}\n`);
}

function loadFailureScreenshotAttachments(outDir, label) {
  const manifestPath = path.resolve(outDir, '..', 'screenshots', 'cli', 'failure-attachments.json');
  if (!fs.existsSync(manifestPath)) {
    return [];
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    if (!Array.isArray(manifest)) {
      return [];
    }

    return manifest
      .filter((entry) => entry?.label === label && typeof entry.testTitle === 'string' && typeof entry.screenshotPath === 'string')
      .filter((entry) => fs.existsSync(entry.screenshotPath));
  } catch {
    return [];
  }
}

function attachmentMatchesTest(attachment, testName) {
  const normalizedTitle = normalizeTestName(attachment.testTitle);
  const normalizedTestName = normalizeTestName(testName);
  return (
    normalizedTitle === normalizedTestName || normalizedTitle.includes(normalizedTestName) || normalizedTestName.includes(normalizedTitle)
  );
}

function normalizeTestName(value) {
  return String(value).replace(/\s+/g, ' ').trim().toLowerCase();
}

function formatAttachmentPath(value) {
  return String(value).replace(/\\/g, '/');
}

function buildFailureExcerpt(logText) {
  return logText
    .split(/\r?\n/)
    .filter((line) => /^[ \t]*\d+\)|AssertionError|Error:|Timed out|failed|failing/i.test(line))
    .slice(-80);
}

function lastNumberMatch(text, pattern) {
  let match;
  let value = 0;
  while ((match = pattern.exec(text)) !== null) {
    value = Number(match[1]);
  }

  return value;
}

function lastTextMatch(text, pattern) {
  let match;
  let value = '';
  while ((match = pattern.exec(text)) !== null) {
    value = match[1];
  }

  return value;
}

function collectMatches(text, pattern) {
  const values = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const value = match[1].trim();
    if (value) {
      values.push(value);
    }
  }

  return values;
}

function escapeXml(value) {
  return removeInvalidXmlChars(stripAnsi(value))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripAnsi(value) {
  const ansiPattern = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, 'g');
  return String(value).replace(ansiPattern, '');
}

function removeInvalidXmlChars(value) {
  let result = '';
  for (const character of String(value)) {
    const codePoint = character.codePointAt(0);
    if (
      codePoint === 0x09 ||
      codePoint === 0x0a ||
      codePoint === 0x0d ||
      (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
      (codePoint >= 0xe000 && codePoint <= 0xfffd)
    ) {
      result += character;
    }
  }

  return result;
}

function requireOption(value, name) {
  if (!value) {
    throw new Error(`Missing required ${name}`);
  }
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--aggregate') {
      parsed.aggregate = true;
    } else if (arg === '--append-summary') {
      parsed.appendSummary = true;
    } else if (arg.startsWith('--')) {
      parsed[toCamelCase(arg.slice(2))] = args[index + 1];
      index++;
    }
  }

  return parsed;
}

function parseCsvOption(value) {
  return String(value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseBooleanOption(value) {
  return /^(1|true|yes)$/i.test(String(value ?? ''));
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

module.exports = {
  _test: {
    buildAggregate,
    buildSingleSummary,
    mergeTerminalResultMetadata,
    normalizeResult,
    parseCsvOption,
    parseMochaLog,
    writeSingleResult,
  },
};
