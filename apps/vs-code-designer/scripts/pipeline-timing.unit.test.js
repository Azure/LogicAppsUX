#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global console, require */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { _test } = require('./pipeline-timing');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-timing-'));
try {
  const eventsPath = path.join(root, 'events.jsonl');
  _test.appendEvent(eventsPath, { event: 'start', phase: 'setup', timestamp: '2026-03-20T00:00:00.000Z' });
  _test.appendEvent(eventsPath, { event: 'finish', phase: 'setup', status: 'success', timestamp: '2026-03-20T00:00:03.250Z' });
  const summary = _test.writeSummary(eventsPath, path.join(root, 'summary.json'), {
    PNPMSTORECACHESTATE: 'exact',
    PNPMSTOREFALLBACK: 'none',
    PNPMSTOREPATH: 'C:\\store',
  });
  assert.equal(summary.totalMeasuredMs, 3250);
  assert.deepEqual(summary.cache, { state: 'exact', fallback: 'none', storePath: 'C:\\store' });
  assert.equal(summary.install.taskRetryCount, 2);
  assert.deepEqual(
    summary.phases.map(({ phase, status, durationMs }) => ({ phase, status, durationMs })),
    [{ phase: 'setup', status: 'success', durationMs: 3250 }]
  );

  const incompletePath = path.join(root, 'incomplete.jsonl');
  _test.appendEvent(incompletePath, { event: 'start', phase: 'nativeExecution', timestamp: '2026-03-20T00:00:00.000Z' });
  assert.throws(() => _test.writeSummary(incompletePath, path.join(root, 'incomplete.json')), /did not finish/);
  console.log('Pipeline timing tests passed.');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
