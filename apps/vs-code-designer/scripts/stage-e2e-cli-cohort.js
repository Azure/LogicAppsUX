#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global console, module, process, require */
const fs = require('fs');
const path = require('path');
const { assertFamilyLifecycleTerminal } = require('./family-lifecycle-terminal');

const TEXT_EXTENSIONS = new Set(['.json', '.jsonl', '.log', '.md', '.txt', '.xml']);
const DENIED_SEGMENTS = new Set([
  '.npmrc',
  'auth',
  'credentials',
  'node_modules',
  'profiles',
  'runtime-dependencies',
  'token',
  'tokens',
  'workspaces',
]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const SUPPLEMENTARY_LIFECYCLE_SUITES = new Set([
  'httpTimeoutLifecycle',
  'statelessVariablesLifecycle',
  'workspaceArtifactRegeneration',
  'workspaceMultiRoot',
]);

function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  stageCohortEvidence(options);
}

function stageCohortEvidence({ aggregatePath, outputRoot, cohortId, artifactName }) {
  requireValue(aggregatePath, '--aggregate');
  requireValue(outputRoot, '--output');
  requireValue(cohortId, '--cohort-id');

  const aggregate = readJson(aggregatePath);
  if (aggregate.schemaVersion !== 1 || !Array.isArray(aggregate.expectedSuiteIds) || !Array.isArray(aggregate.suites)) {
    throw new Error('Cohort aggregate has an unsupported schema.');
  }
  if (aggregate.expectedSuiteIds.length === 0) {
    throw new Error('Cohort aggregate selected no suites.');
  }

  const batchRoot = fs.realpathSync.native(aggregate.batchRoot);
  const platformName = aggregate.platform === 'win32' ? 'windows' : 'linux';
  const destination = path.resolve(outputRoot);
  fs.mkdirSync(destination, { recursive: true });
  const inventory = {
    schemaVersion: 1,
    cohortId,
    artifactName: artifactName || undefined,
    platform: aggregate.platform,
    expectedSuiteIds: aggregate.expectedSuiteIds,
    aggregateOutcome: aggregate.aggregateOutcome,
    containmentBreach: aggregate.containmentBreach === true,
    stoppedAfter: aggregate.stoppedAfter ?? null,
    suites: [],
  };
  const observed = new Map(aggregate.suites.map((suite) => [suite.id, suite]));
  const stagingErrors = [];

  for (const suiteId of aggregate.expectedSuiteIds) {
    const suite = observed.get(suiteId);
    if (!suite) {
      stagingErrors.push(`Missing aggregate suite result: ${suiteId}`);
      continue;
    }
    const rerunId = suite.rerunId || `${platformName}:${suiteId}`;
    if (rerunId !== `${platformName}:${suiteId}`) {
      stagingErrors.push(`Unexpected rerun identity for ${suiteId}: ${rerunId}`);
    }
    const suiteDestination = path.join(destination, 'suites', sanitizeSegment(rerunId));
    const resultDestination = path.join(suiteDestination, 'results');
    const logDestination = path.join(suiteDestination, 'log');
    fs.mkdirSync(resultDestination, { recursive: true });
    fs.mkdirSync(logDestination, { recursive: true });

    const inventoryEntry = {
      suiteId,
      rerunId,
      cohortId,
      platform: aggregate.platform,
      classification: suite.classification,
      finalOutcome: suite.finalOutcome,
      reason: redactText(suite.reason || ''),
      cleanupVerified: suite.cleanupVerified === true,
      rerun: {
        diagnosticOnly: true,
        runLinux: platformName === 'linux',
        runWindows: platformName === 'windows',
        linuxSuites: platformName === 'linux' ? suiteId : '',
        windowsSuites: platformName === 'windows' ? suiteId : '',
      },
      evidenceRoot: path.relative(destination, suiteDestination).replace(/\\/g, '/'),
    };

    if (!suite.reportsRoot) {
      writeBlockedEvidence(resultDestination, suite);
      inventoryEntry.evidenceStatus = 'blocked-before-launch';
      inventory.suites.push(inventoryEntry);
      continue;
    }

    const reportsRoot = assertContainedDirectory(batchRoot, suite.reportsRoot, `reports root for ${suiteId}`);
    const suiteErrorsBefore = stagingErrors.length;
    const requiredFiles = [
      `${suiteId}.json`,
      `${suiteId}.junit.xml`,
      `${suiteId}.summary.md`,
      `${suiteId}.terminal-result.json`,
      `admission-context-${suiteId}.json`,
    ];
    for (const fileName of requiredFiles) {
      const source = path.join(reportsRoot, fileName);
      if (!fs.existsSync(source)) {
        stagingErrors.push(`Missing required cohort evidence for ${rerunId}: ${fileName}`);
        continue;
      }
      try {
        copySanitizedFile(source, path.join(resultDestination, fileName), { required: true });
      } catch (error) {
        stagingErrors.push(error instanceof Error ? error.message : String(error));
      }
    }

    const logPath = path.join(reportsRoot, `${suiteId}.log`);
    if (fs.existsSync(logPath)) {
      try {
        copySanitizedFile(logPath, path.join(logDestination, `${suiteId}.log`), { required: true });
      } catch (error) {
        stagingErrors.push(error instanceof Error ? error.message : String(error));
      }
    } else {
      stagingErrors.push(`Missing required cohort log for ${rerunId}`);
    }

    for (const directoryName of [
      'generated-workspaces',
      'screenshots',
      'vscode-logs',
      'workspace-cancel',
      'workspace-multi-root',
      'workspace-regeneration',
    ]) {
      copySanitizedTree(path.join(reportsRoot, directoryName), path.join(suiteDestination, directoryName));
    }
    for (const requiredEvidence of requiredSuiteEvidence(suiteId)) {
      const source = path.join(reportsRoot, requiredEvidence.directory, requiredEvidence.file);
      const target = path.join(suiteDestination, requiredEvidence.directory, requiredEvidence.file);
      if (!fs.existsSync(source)) {
        stagingErrors.push(`Missing required cohort evidence for ${rerunId}: ${requiredEvidence.directory}/${requiredEvidence.file}`);
        continue;
      }
      try {
        copySanitizedFile(source, target, { required: true });
      } catch (error) {
        stagingErrors.push(error instanceof Error ? error.message : String(error));
      }
    }
    if (suite.classification === 'success' && SUPPLEMENTARY_LIFECYCLE_SUITES.has(suiteId)) {
      try {
        assertFamilyLifecycleTerminal(
          readJson(path.join(reportsRoot, `${suiteId}.json`)),
          readJson(path.join(reportsRoot, `${suiteId}.terminal-result.json`)),
          suiteId
        );
      } catch (error) {
        stagingErrors.push(
          `Supplementary lifecycle terminal validation failed for ${rerunId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    if (suite.suiteRoot) {
      const suiteRoot = assertContainedDirectory(batchRoot, suite.suiteRoot, `suite root for ${suiteId}`);
      copySanitizedTree(path.join(suiteRoot, 'lifecycle'), path.join(suiteDestination, 'native'));
    }

    inventoryEntry.evidenceStatus = stagingErrors.length === suiteErrorsBefore ? 'staged' : 'invalid';
    inventory.suites.push(inventoryEntry);
  }

  const batchDestination = path.join(destination, 'batch');
  fs.mkdirSync(batchDestination, { recursive: true });
  const publicAggregate = {
    schemaVersion: aggregate.schemaVersion,
    generatedAt: aggregate.generatedAt,
    platform: aggregate.platform,
    cohortId,
    expectedSuiteIds: aggregate.expectedSuiteIds,
    observedSuiteIds: aggregate.observedSuiteIds,
    missingSuiteIds: aggregate.missingSuiteIds,
    unexpectedSuiteIds: aggregate.unexpectedSuiteIds,
    diagnosticOnly: aggregate.diagnosticOnly,
    trustedFullExecution: aggregate.trustedFullExecution,
    complete: aggregate.complete,
    selectedRunSuccess: aggregate.selectedRunSuccess,
    containmentBreach: aggregate.containmentBreach,
    stoppedAfter: aggregate.stoppedAfter,
    aggregateOutcome: aggregate.aggregateOutcome,
    failedSuites: aggregate.failedSuites,
    blockedSuites: aggregate.blockedSuites,
    admissionContext: aggregate.admissionContext,
    suites: inventory.suites,
  };
  fs.writeFileSync(path.join(batchDestination, 'e2e-cli-batch-result.json'), `${JSON.stringify(publicAggregate, null, 2)}\n`);
  const aggregateJunit = path.join(path.dirname(aggregatePath), 'e2e-cli-batch-result.junit.xml');
  if (fs.existsSync(aggregateJunit)) {
    copySanitizedFile(aggregateJunit, path.join(batchDestination, 'e2e-cli-batch-result.junit.xml'), { required: true });
  }
  fs.writeFileSync(path.join(destination, 'inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);
  fs.writeFileSync(
    path.join(destination, 'rerun.md'),
    [
      '# Exact diagnostic reruns',
      '',
      ...inventory.suites.map(
        (suite) =>
          `- \`${suite.rerunId}\`: queue with \`diagnosticOnly=true\`, \`executionTopology=cohort\`, \`runLinux=${suite.rerun.runLinux}\`, \`runWindows=${suite.rerun.runWindows}\`, \`linuxSuites=${suite.rerun.linuxSuites || '<none>'}\`, \`windowsSuites=${suite.rerun.windowsSuites || '<none>'}\`.`
      ),
      '',
    ].join('\n')
  );

  if (stagingErrors.length > 0) {
    fs.writeFileSync(path.join(destination, 'staging-errors.txt'), `${stagingErrors.join('\n')}\n`);
    throw new Error(`Cohort evidence staging failed: ${stagingErrors.join('; ')}`);
  }
  return inventory;
}

function writeBlockedEvidence(resultDestination, suite) {
  const result = {
    schemaVersion: 1,
    suiteId: suite.id,
    rerunId: suite.rerunId,
    cohortId: suite.cohortId,
    platform: suite.platform,
    outcome: 'blocked',
    classification: suite.classification,
    reason: redactText(suite.reason || ''),
  };
  fs.writeFileSync(path.join(resultDestination, `${suite.id}.json`), `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(
    path.join(resultDestination, `${suite.id}.junit.xml`),
    `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="${escapeXml(suite.id)}" tests="1" failures="0" skipped="1"><testcase classname="@vscode/test-cli.batch" name="${escapeXml(suite.id)}"><skipped message="${escapeXml(result.reason)}" /></testcase></testsuite>\n`
  );
  fs.writeFileSync(
    path.join(resultDestination, `${suite.id}.summary.md`),
    `# ${suite.id}\n\n- Outcome: blocked\n- Reason: ${result.reason}\n`
  );
}

function copySanitizedTree(sourceRoot, destinationRoot) {
  if (!fs.existsSync(sourceRoot)) {
    return;
  }
  const source = fs.realpathSync.native(sourceRoot);
  const stack = [{ source, destination: destinationRoot }];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current.source, { withFileTypes: true })) {
      if (isDeniedEvidenceName(entry.name)) {
        continue;
      }
      const sourcePath = path.join(current.source, entry.name);
      const destinationPath = path.join(current.destination, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Cohort evidence contains a symbolic link: ${sourcePath}`);
      }
      if (entry.isDirectory()) {
        stack.push({ source: sourcePath, destination: destinationPath });
      } else if (entry.isFile()) {
        copySanitizedFile(sourcePath, destinationPath);
      }
    }
  }
}

function copySanitizedFile(source, destination, { required = false } = {}) {
  const stat = fs.statSync(source);
  if (stat.size > MAX_FILE_BYTES) {
    if (required) {
      throw new Error(`Required cohort evidence exceeds ${MAX_FILE_BYTES} bytes: ${source}`);
    }
    return false;
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const extension = path.extname(source).toLowerCase();
  if (extension === '.json') {
    fs.writeFileSync(destination, `${JSON.stringify(redactJsonValue(readJson(source)), null, 2)}\n`);
  } else if (extension === '.jsonl') {
    const lines = fs
      .readFileSync(source, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.stringify(redactJsonValue(JSON.parse(line)));
        } catch {
          return redactText(line);
        }
      });
    fs.writeFileSync(destination, `${lines.join('\n')}${lines.length > 0 ? '\n' : ''}`);
  } else if (TEXT_EXTENSIONS.has(extension)) {
    fs.writeFileSync(destination, redactText(fs.readFileSync(source, 'utf8')));
  } else {
    fs.copyFileSync(source, destination);
  }
  if (required && !fs.existsSync(destination)) {
    throw new Error(`Required cohort evidence was not staged: ${destination}`);
  }
  return true;
}

function requiredSuiteEvidence(suiteId) {
  if (suiteId === 'createWorkspaceCoreMatrix') {
    return [{ directory: 'workspace-cancel', file: 'final-result.json' }];
  }
  if (suiteId === 'workspaceArtifactRegeneration') {
    return [{ directory: 'workspace-regeneration', file: 'final-result.json' }];
  }
  if (suiteId === 'workspaceMultiRoot') {
    return [{ directory: 'workspace-multi-root', file: 'final-result.json' }];
  }
  return [];
}

function isDeniedEvidenceName(name) {
  const normalized = String(name).toLowerCase();
  return DENIED_SEGMENTS.has(normalized) || normalized.includes('cleanup-ledger') || normalized.includes('phase-results');
}

function redactJsonValue(value, key = '') {
  if (isSensitiveJsonKey(key)) {
    return '<redacted>';
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactJsonValue(entry));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redactJsonValue(entryValue, entryKey)]));
  }
  return typeof value === 'string' ? redactText(value) : value;
}

function isSensitiveJsonKey(key) {
  const normalized = String(key)
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
  return (
    normalized === 'authorization' ||
    normalized === 'authentication' ||
    normalized === 'azurewebjobsstorage' ||
    normalized === 'idtoken' ||
    normalized === 'sas' ||
    normalized === 'sig' ||
    normalized === 'serviceprincipalkey' ||
    normalized.endsWith('accesstoken') ||
    normalized.endsWith('accountkey') ||
    normalized.endsWith('apikey') ||
    normalized.endsWith('clientsecret') ||
    normalized.endsWith('connectionstring') ||
    normalized.endsWith('credential') ||
    normalized.endsWith('credentials') ||
    normalized.endsWith('password') ||
    normalized.endsWith('refreshtoken') ||
    normalized.endsWith('secret') ||
    normalized.endsWith('signature') ||
    normalized.endsWith('sastoken') ||
    normalized.endsWith('token')
  );
}

function assertContainedDirectory(root, candidate, label) {
  const resolved = fs.realpathSync.native(candidate);
  const relative = path.relative(root, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Cohort ${label} escaped the batch root.`);
  }
  return resolved;
}

function redactText(value) {
  return String(value)
    .replace(/(Authorization\s*[:=]\s*Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1<redacted>')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1<redacted>')
    .replace(
      /((?:access[_-]?token|account[_-]?key|api[_-]?key|authorization|authentication|azurewebjobsstorage|client[_-]?secret|connection[_-]?string|credential|password|sas|secret|sig|signature|token)\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s,;]+)/gi,
      '$1<redacted>'
    )
    .replace(
      /([?&](?:code|sig|signature|se|sp|spr|sr|st|sv|skoid|sktid|skt|ske|sks|skv|access_token|refresh_token|id_token)=)[^&\s"'<>]+/gi,
      '$1<redacted>'
    );
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    const value = args[index + 1];
    if (!key.startsWith('--') || value === undefined) {
      throw new Error(`Invalid cohort staging argument: ${key}`);
    }
    index += 1;
    if (key === '--aggregate') {
      options.aggregatePath = value;
    } else if (key === '--output') {
      options.outputRoot = value;
    } else if (key === '--cohort-id') {
      options.cohortId = value;
    } else if (key === '--artifact-name') {
      options.artifactName = value;
    } else {
      throw new Error(`Unknown cohort staging argument: ${key}`);
    }
  }
  return options;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function requireValue(value, option) {
  if (!value) {
    throw new Error(`${option} is required.`);
  }
}

function sanitizeSegment(value) {
  return String(value).replace(/[^a-z0-9_-]+/gi, '-');
}

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
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
    copySanitizedFile,
    redactJsonValue,
    redactText,
    stageCohortEvidence,
  },
};
