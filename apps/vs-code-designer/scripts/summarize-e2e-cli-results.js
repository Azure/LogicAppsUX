#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global process, require */
const fs = require('fs');
const path = require('path');

const options = parseArgs(process.argv.slice(2));

if (options.aggregate) {
  writeAggregateResult(options);
} else if (options.appendSummary) {
  appendSingleSummary(options);
} else {
  writeSingleResult(options);
}

function writeSingleResult({ label, log, outDir, outcome }) {
  requireOption(label, '--label');
  requireOption(log, '--log');
  requireOption(outDir, '--out-dir');

  const logText = fs.existsSync(log) ? fs.readFileSync(log, 'utf-8') : '';
  const result = parseMochaLog(label, outcome ?? 'unknown', logText);
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, `${label}.json`), `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, `${label}.junit.xml`), buildJUnitXml(result));
  fs.writeFileSync(path.join(outDir, `${label}.summary.md`), buildSingleSummary(result));
}

function appendSingleSummary({ json, githubSummary }) {
  requireOption(json, '--json');
  requireOption(githubSummary, '--github-summary');

  const result = JSON.parse(fs.readFileSync(json, 'utf-8'));
  fs.appendFileSync(githubSummary, buildSingleSummary(result));
}

function writeAggregateResult({ resultsDir, outDir, githubSummary }) {
  requireOption(resultsDir, '--results-dir');
  requireOption(outDir, '--out-dir');

  fs.mkdirSync(outDir, { recursive: true });
  const results = findJsonResults(resultsDir)
    .map((file) => JSON.parse(fs.readFileSync(file, 'utf-8')))
    .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  const aggregate = buildAggregate(results);

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
  const passedTests = uniqueMatches(logText, /^[ \t]+(?:√|✔)\s+(.+?)(?:\s+\(\d+ms\))?[ \t]*$/gm).slice(-passing);
  const failedTests = uniqueMatches(logText, /^[ \t]*\d+\)\s+(.+?)[ \t]*$/gm);
  const failureExcerpt = buildFailureExcerpt(logText);
  const normalizedFailing = outcome === 'success' ? failing : Math.max(failing, failedTests.length, 1);
  const total = passing + normalizedFailing + pending;

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
    failureExcerpt,
    generatedAt: new Date().toISOString(),
  };
}

function buildAggregate(results) {
  const total = results.reduce((sum, result) => sum + result.total, 0);
  const passing = results.reduce((sum, result) => sum + result.passing, 0);
  const failing = results.reduce((sum, result) => sum + result.failing, 0);
  const pending = results.reduce((sum, result) => sum + result.pending, 0);
  const failedLabels = results.filter((result) => result.outcome !== 'success' || result.failing > 0).map((result) => result.label);
  const passRate = total > 0 ? Number(((passing / total) * 100).toFixed(2)) : 0;
  const generatedAt = new Date().toISOString();

  return {
    generatedAt,
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
    },
  };
}

function buildSingleSummary(result) {
  const lines = [
    `### @vscode/test-cli Create Workspace: \`${result.label}\``,
    '',
    '| Label | Outcome | Passing | Failing | Pending | Pass rate | JUnit | Logs | Screenshots |',
    '|---|---:|---:|---:|---:|---:|---|---|---|',
    `| \`${result.label}\` | \`${result.outcome}\` | ${result.passing} | ${result.failing} | ${result.pending} | ${result.passRate}% | \`vscode-e2e-cli-test-results-${result.label}\` | \`vscode-e2e-cli-log-${result.label}\` | \`vscode-e2e-cli-screenshots-${result.label}\` |`,
    '',
  ];

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
    `Failed labels: ${aggregate.failedLabels.length ? aggregate.failedLabels.map((label) => `\`${label}\``).join(', ') : 'None'}`,
    '',
    'Structured artifacts: `vscode-e2e-cli-test-results-summary` contains aggregate JSON, aggregate JUnit XML, a Markdown dashboard, and JSONL trend data for pass-rate ingestion across workflow runs.',
    ''
  );

  return `${lines.join('\n')}\n`;
}

function buildJUnitXml(result) {
  const failures =
    result.failedTests.length > 0 ? result.failedTests : Array.from({ length: result.failing }, (_, index) => `Failure ${index + 1}`);
  const passed =
    result.passedTests.length > 0 ? result.passedTests : Array.from({ length: result.passing }, (_, index) => `Passing test ${index + 1}`);
  const testCases = [
    ...passed.map((name) => `    <testcase classname="${escapeXml(result.label)}" name="${escapeXml(name)}" />`),
    ...failures.map((name) =>
      [
        `    <testcase classname="${escapeXml(result.label)}" name="${escapeXml(name)}">`,
        `      <failure message="${escapeXml(name)}">${escapeXml(result.failureExcerpt.join('\n'))}</failure>`,
        '    </testcase>',
      ].join('\n')
    ),
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
    ...aggregate.labels.map((result) => buildJUnitXml(result).split('\n').slice(1, -1).join('\n')),
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

function uniqueMatches(text, pattern) {
  const values = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const value = match[1].trim();
    if (value && !values.includes(value)) {
      values.push(value);
    }
  }

  return values;
}

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
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

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
