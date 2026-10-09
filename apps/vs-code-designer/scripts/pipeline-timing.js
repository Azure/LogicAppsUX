#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global console, module, process, require */
const fs = require('fs');
const path = require('path');

function main(args = process.argv.slice(2), env = process.env) {
  const [command, file, phase, status = 'success'] = args;
  if (!command || !file) {
    throw new Error('Usage: pipeline-timing.js <start|finish|summary> <events.jsonl> [phase] [status]');
  }
  if (command === 'start' || command === 'finish') {
    if (!phase) {
      throw new Error('A timing phase is required.');
    }
    appendEvent(file, {
      schemaVersion: 1,
      event: command,
      phase,
      status: command === 'finish' ? status : undefined,
      timestamp: new Date().toISOString(),
      identity: {
        buildId: env.BUILD_BUILDID || 'local',
        jobId: env.SYSTEM_JOBID || 'local',
        jobName: env.SYSTEM_JOBDISPLAYNAME || env.AGENT_JOBNAME || 'local',
        os: env.AGENT_OS || process.platform,
      },
    });
    return;
  }
  if (command === 'summary') {
    writeSummary(file, phase, env);
    return;
  }
  throw new Error(`Unknown pipeline timing command: ${command}`);
}

function appendEvent(file, event) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(event)}\n`);
}

function writeSummary(eventsPath, outputPath, env = process.env) {
  if (!outputPath) {
    throw new Error('Summary output path is required.');
  }
  const events = fs
    .readFileSync(eventsPath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const starts = new Map();
  const phases = [];
  for (const event of events) {
    if (event.event === 'start') {
      starts.set(event.phase, event);
      continue;
    }
    if (event.event !== 'finish') {
      continue;
    }
    const start = starts.get(event.phase);
    if (!start) {
      throw new Error(`Timing phase finished without a start event: ${event.phase}`);
    }
    const durationMs = Date.parse(event.timestamp) - Date.parse(start.timestamp);
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      throw new Error(`Timing phase has an invalid duration: ${event.phase}`);
    }
    phases.push({
      phase: event.phase,
      status: event.status,
      startedAt: start.timestamp,
      finishedAt: event.timestamp,
      durationMs,
      identity: event.identity,
    });
    starts.delete(event.phase);
  }
  if (starts.size > 0) {
    throw new Error(`Timing phases did not finish: ${[...starts.keys()].join(', ')}`);
  }
  const summary = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    totalMeasuredMs: phases.reduce((total, item) => total + item.durationMs, 0),
    cache: {
      state: env.PNPMSTORECACHESTATE || env.pnpmStoreCacheState || 'unknown',
      fallback: env.PNPMSTOREFALLBACK || env.pnpmStoreFallback || 'unknown',
      storePath: env.PNPMSTOREPATH || env.pnpmStorePath || undefined,
    },
    install: {
      command: 'pnpm install --frozen-lockfile --strict-peer-dependencies --recursive',
      fetchTimeoutMs: 300000,
      taskRetryCount: 2,
    },
    phases,
  };
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
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
    appendEvent,
    writeSummary,
  },
};
