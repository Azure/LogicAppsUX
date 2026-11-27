import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createReport, renderSummary, summarizePlaywright } from './report.mjs';

const inventory = JSON.parse(readFileSync(new URL('../../accessibility-pilot/journey-inventory.json', import.meta.url), 'utf8'));
const successfulProcess = { status: 0, signal: null };
const keyboardAttachment = (evidence) => ({
  name: 'synthetic-keyboard',
  contentType: 'application/json',
  body: Buffer.from(JSON.stringify(evidence)).toString('base64'),
});
const withAttachments = (attachments) => ({ results: [{ status: 'passed', attachments }] });
const passingTest = withAttachments([
  keyboardAttachment({ browserVersion: '131.0', steps: [{ key: 'Escape', focus: 'open' }], returnedToOpener: true }),
]);
const rawReport = (counts = {}) => ({
  suites: [{ suites: [{ specs: [{ tests: [passingTest] }] }] }],
  errors: [],
  stats: { expected: 1, unexpected: 0, flaky: 0, skipped: 0, ...counts },
});

test('synthetic success does not credit any of the five Designer journeys', () => {
  const report = createReport(inventory, summarizePlaywright(successfulProcess, rawReport()));
  assert.equal(report.synthetic.status, 'passed');
  assert.equal(report.product.journeys.length, 5);
  assert.ok(report.product.journeys.every((journey) => journey.status === 'not_run' && journey.fixture && journey.expectedEvidence));
  assert.match(renderSummary(report), /No product evidence collected/);
});

test('missing, malformed, empty and skipped-only results stay incomplete even after exit zero', () => {
  assert.equal(summarizePlaywright(successfulProcess, null).status, 'incomplete');
  assert.equal(summarizePlaywright(successfulProcess, { suites: [{}], stats: {} }).status, 'incomplete');
  assert.equal(summarizePlaywright(successfulProcess, rawReport({ expected: 0 })).status, 'incomplete');
  assert.equal(summarizePlaywright(successfulProcess, rawReport({ expected: 0, skipped: 4 })).status, 'incomplete');
  assert.equal(summarizePlaywright(successfulProcess, rawReport({ expected: 3, skipped: 1 })).status, 'incomplete');
});

test('a passing exit and counters without browser evidence do not pass', () => {
  for (const attachments of [[], [keyboardAttachment({})], [{ ...keyboardAttachment({}), body: 'not-json' }]]) {
    const report = { ...rawReport(), suites: [{ specs: [{ tests: [withAttachments(attachments)] }] }] };
    const result = summarizePlaywright(successfulProcess, report);
    assert.equal(result.status, 'incomplete');
    assert.match(result.errors[0], /lack browser evidence/);
  }
});

test('startup errors and failed runner exits remain visible regardless of the test counts', () => {
  const error = { message: 'browser startup failed' };
  const failed = summarizePlaywright({ status: 2, signal: null }, { ...rawReport(), errors: [error] });
  assert.equal(failed.status, 'failed');
  assert.equal(failed.exitCode, 2);
  assert.deepEqual(failed.errors, [error]);
  assert.equal(summarizePlaywright({ status: null, error: new Error('could not spawn') }, null).status, 'failed');
  assert.equal(summarizePlaywright({ status: null, signal: 'SIGTERM' }, null).signal, 'SIGTERM');
  assert.equal(summarizePlaywright(successfulProcess, rawReport({ unexpected: 1 })).status, 'failed');
});
