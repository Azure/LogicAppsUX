/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global module, require */
const fs = require('node:fs');
const path = require('node:path');

class OwnedProcessEvidenceError extends Error {
  constructor(reason) {
    super(`Owned process cleanup failed: ${reason}`);
    this.reason = reason;
  }
}

function fail(reason) {
  throw new OwnedProcessEvidenceError(reason);
}

function attempt(operation, reason) {
  try {
    return operation();
  } catch (error) {
    if (error instanceof OwnedProcessEvidenceError) {
      throw error;
    }
    fail(reason);
  }
}

function physicalPath(value) {
  return attempt(() => fs.realpathSync(value), 'canonical-path-unavailable');
}

function canonical(value, platform) {
  const resolved = physicalPath(value);
  return platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function identity(value) {
  if (
    !value ||
    !Number.isSafeInteger(value.pid) ||
    value.pid <= 0 ||
    !Number.isSafeInteger(value.parentPid) ||
    value.parentPid < 0 ||
    typeof value.creationIdentity !== 'string' ||
    !value.creationIdentity ||
    typeof value.executable !== 'string' ||
    !path.isAbsolute(value.executable)
  ) {
    fail('missing-process-identity');
  }
  return value;
}

function sameProcess(left, right, platform) {
  return (
    left.pid === right.pid &&
    left.creationIdentity === right.creationIdentity &&
    canonical(left.executable, platform) === canonical(right.executable, platform)
  );
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function assertParentCreation(parent, child, platform) {
  const pattern = platform === 'win32' ? /^(\d+)$/ : /^([a-f0-9-]{36}):(\d+)$/;
  const parentMatch = pattern.exec(parent.creationIdentity);
  const childMatch = pattern.exec(child.creationIdentity);
  if (!parentMatch || !childMatch || (platform === 'linux' && parentMatch[1] !== childMatch[1])) {
    fail('unproven-process-creation-order');
  }
  if (BigInt(parentMatch.at(-1)) > BigInt(childMatch.at(-1))) {
    fail('reused-process-ancestor');
  }
}

function createOwnedProcessCleanup({
  invocationId,
  platform,
  owner,
  roots,
  snapshot,
  terminateExact,
  now,
  deadline,
  maxObservations = 20,
}) {
  if (
    typeof invocationId !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(invocationId) ||
    !['linux', 'win32'].includes(platform) ||
    !Array.isArray(roots) ||
    roots.length !== 2 ||
    new Set(roots.map((root) => root?.kind)).size !== 2 ||
    !roots.some((root) => root?.kind === 'workspace') ||
    !roots.some((root) => root?.kind === 'dependencies') ||
    typeof snapshot !== 'function' ||
    typeof now !== 'function' ||
    !Number.isFinite(deadline) ||
    !Number.isInteger(maxObservations) ||
    maxObservations < 1 ||
    maxObservations > 20 ||
    (terminateExact !== undefined && typeof terminateExact !== 'function')
  ) {
    fail('invalid-ownership-contract');
  }
  const ownerIdentity = { ...identity(owner), executable: physicalPath(owner.executable) };
  const ownedRoots = roots.map((root) => {
    const stat = attempt(() => fs.lstatSync(root.directory), 'owned-root-unavailable');
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      fail('unsafe-owned-root');
    }
    return {
      kind: root.kind,
      directory: physicalPath(root.directory),
      comparisonIdentity: canonical(root.directory, platform),
      dev: stat.dev,
      ino: stat.ino,
    };
  });
  if (ownedRoots[0].comparisonIdentity === ownedRoots[1].comparisonIdentity) {
    fail('ambiguous-owned-roots');
  }
  let captured;
  let captureStarted = false;
  let observations = 0;
  let previousTime = now();
  let finalized = false;
  const actions = [];

  function remaining() {
    const current = now();
    if (!Number.isFinite(current) || current < previousTime) {
      fail('invalid-observation-clock');
    }
    previousTime = current;
    if (current >= deadline) {
      fail('observation-budget-exhausted');
    }
    return deadline - current;
  }

  async function read() {
    const budget = remaining();
    if (observations >= maxObservations) {
      fail('observation-budget-exhausted');
    }
    observations++;
    let records;
    try {
      records = await snapshot(budget);
    } catch (error) {
      if (error instanceof OwnedProcessEvidenceError) {
        throw error;
      }
      fail('process-observation-failed');
    }
    remaining();
    if (!Array.isArray(records)) {
      fail('invalid-process-observation');
    }
    const table = new Map();
    for (const record of records) {
      if (!Number.isSafeInteger(record?.pid) || record.pid <= 0 || table.has(record.pid)) {
        fail('ambiguous-process-observation');
      }
      table.set(record.pid, record);
    }
    const currentOwner = table.get(ownerIdentity.pid);
    if (!currentOwner || !sameProcess(identity(currentOwner), ownerIdentity, platform)) {
      fail('owner-process-identity-changed');
    }
    for (const record of table.values()) {
      if (record.pid === ownerIdentity.pid) {
        continue;
      }
      const visited = new Set([record.pid]);
      let parent = record.parentPid;
      while (table.has(parent) && !visited.has(parent)) {
        if (parent === ownerIdentity.pid) {
          identity(record);
          break;
        }
        visited.add(parent);
        parent = table.get(parent).parentPid;
      }
    }
    if (captured) {
      for (const record of scopedProcesses(table)) {
        if (!captured.some((original) => original.pid === record.pid)) {
          fail('uncaptured-owned-scope-process');
        }
      }
    }
    return table;
  }

  function assertRoots() {
    for (const root of ownedRoots) {
      const stat = attempt(() => fs.lstatSync(root.directory), 'owned-root-unavailable');
      if (
        !stat.isDirectory() ||
        stat.isSymbolicLink() ||
        stat.dev !== root.dev ||
        stat.ino !== root.ino ||
        canonical(root.directory, platform) !== root.comparisonIdentity
      ) {
        fail('owned-root-identity-changed');
      }
    }
  }

  function ancestry(record, table) {
    const chain = [];
    const visited = new Set([record.pid]);
    let parent = record.parentPid;
    let child = record;
    while (parent !== ownerIdentity.pid) {
      if (visited.has(parent)) {
        fail('ambiguous-process-ancestry');
      }
      visited.add(parent);
      const ancestor = table.get(parent);
      if (!ancestor) {
        fail('unproven-process-ancestry');
      }
      chain.push({ ...identity(ancestor) });
      assertParentCreation(ancestor, child, platform);
      child = ancestor;
      parent = ancestor.parentPid;
    }
    assertParentCreation(ownerIdentity, child, platform);
    return chain;
  }

  function scopedProcesses(table) {
    const dependencies = ownedRoots.find((root) => root.kind === 'dependencies');
    const candidates = [];
    for (const record of table.values()) {
      if (record.pid === ownerIdentity.pid || typeof record.executable !== 'string' || !path.isAbsolute(record.executable)) {
        continue;
      }
      const lexical = platform === 'win32' ? path.resolve(record.executable).toLowerCase() : path.resolve(record.executable);
      if (!inside(dependencies.comparisonIdentity, lexical)) {
        continue;
      }
      const executable = physicalPath(record.executable);
      if (!inside(dependencies.comparisonIdentity, canonical(executable, platform))) {
        fail('foreign-executable-scope');
      }
      candidates.push({ ...identity(record), executable });
    }
    return candidates;
  }

  async function capture() {
    if (captureStarted || finalized) {
      fail('duplicate-process-capture');
    }
    captureStarted = true;
    assertRoots();
    const table = await read();
    const candidates = [];
    for (const record of scopedProcesses(table)) {
      candidates.push({ ...record, ancestry: ancestry(record, table) });
    }
    if (!candidates.length) {
      fail('missing-live-owned-process-observation');
    }
    captured = candidates;
    return evidence(false);
  }

  function evidence(verified) {
    return {
      schemaVersion: 1,
      recordDomain: 'vscode-test-cli-owned-process-cleanup',
      invocationId,
      platform,
      owner: { ...ownerIdentity },
      observedProcesses: (captured || []).map((record) => ({ ...record, ancestry: record.ancestry.map((ancestor) => ({ ...ancestor })) })),
      actions: actions.map((action) => ({ ...action })),
      observations,
      processExitVerified: verified === true,
      filesystemCleanupVerified: false,
    };
  }

  async function finalize() {
    if (finalized) {
      fail('duplicate-process-finalization');
    }
    finalized = true;
    if (!captured) {
      fail('missing-live-owned-process-observation');
    }
    for (const record of [...captured].sort((left, right) => right.ancestry.length - left.ancestry.length)) {
      assertRoots();
      const table = await read();
      const current = table.get(record.pid);
      if (!current) {
        continue;
      }
      if (!sameProcess(identity(current), record, platform)) {
        fail('captured-process-identity-changed');
      }
      // Reparenting is admissible only for this same identity captured before teardown.
      if (typeof terminateExact !== 'function') {
        fail('owned-process-still-alive-observation-only');
      }
      const budget = remaining();
      actions.push({ pid: record.pid, creationIdentity: record.creationIdentity, requested: true });
      try {
        await terminateExact({ ...record, ancestry: record.ancestry.map((ancestor) => ({ ...ancestor })) }, budget);
      } catch (error) {
        if (error instanceof OwnedProcessEvidenceError) {
          throw error;
        }
        fail('exact-process-termination-failed');
      }
      remaining();
    }
    const finalTable = await read();
    for (const record of captured) {
      const current = finalTable.get(record.pid);
      if (current) {
        if (!sameProcess(identity(current), record, platform)) {
          fail('captured-process-identity-changed');
        }
        fail('owned-process-exit-not-observed');
      }
    }
    return evidence(true);
  }

  return Object.freeze({ capture, finalize, evidence: () => evidence(false) });
}

module.exports = { createOwnedProcessCleanup, OwnedProcessEvidenceError };
