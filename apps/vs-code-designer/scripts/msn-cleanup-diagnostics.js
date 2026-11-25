/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global module, process, require */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createProcessObservationProvider } = require('./e2e-cli-process-observation');

function processIdentity(record) {
  return {
    pid: record.pid,
    parentPid: record.parentPid,
    creationIdentity: record.creationIdentity,
    executable: record.executable,
  };
}

function observedAncestry(record, records) {
  const chain = [];
  const visited = new Set([record.pid]);
  let parent = record.parentPid;
  while (parent > 0 && chain.length < 20 && !visited.has(parent)) {
    visited.add(parent);
    const matches = records.filter((candidate) => candidate.pid === parent);
    if (matches.length !== 1) {
      break;
    }
    chain.push(processIdentity(matches[0]));
    parent = matches[0].parentPid;
  }
  // A bounded contemporaneous diagnostic, NOT ancestry/creation-order admission.
  return chain;
}

function recordMsnBodyAssertions({ outputDir, invocation }) {
  if (!path.isAbsolute(outputDir) || !invocation) {
    throw new Error('Missing MSN body diagnostic context');
  }
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, 'body-assertions.json'),
    `${JSON.stringify({ invocation, bodyAssertionsPassed: true, observedAt: new Date().toISOString() }, null, 2)}\n`,
    { flag: 'wx' }
  );
}

function readMsnBodyAssertions({ outputDir, invocation }) {
  const file = path.join(outputDir, 'body-assertions.json');
  if (!fs.existsSync(file)) {
    return false; // No positive assertion evidence, not a successful fallback.
  }
  const receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (receipt?.invocation !== invocation || receipt?.bodyAssertionsPassed !== true) {
    throw new Error('MSN body diagnostic invocation or assertion verdict changed');
  }
  return true; // Body only. NEVER process closure, filesystem cleanup or acceptance.
}

// Read-only Windows Restart Manager query for the precise dependency file that
// can remain mapped after Code exits. No shutdown/restart API or PID admission.
const lockQuery = `
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class MsnFileLocks {
  [StructLayout(LayoutKind.Sequential)]
  public struct UniqueProcess { public int pid; public System.Runtime.InteropServices.ComTypes.FILETIME start; }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct Info {
    public UniqueProcess process;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst=256)] public string app;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst=64)] public string service;
    public uint type, status, session;
    [MarshalAs(UnmanagedType.Bool)] public bool restartable;
  }
  public struct Identity { public int pid; public string creationIdentity; }
  [DllImport("rstrtmgr.dll", CharSet=CharSet.Unicode)]
  static extern int RmStartSession(out uint session, uint flags, string key);
  [DllImport("rstrtmgr.dll", CharSet=CharSet.Unicode)]
  static extern int RmRegisterResources(uint session, uint files, string[] names, uint apps, UniqueProcess[] processes, uint services, string[] serviceNames);
  [DllImport("rstrtmgr.dll")]
  static extern int RmGetList(uint session, out uint needed, ref uint count, [In, Out] Info[] records, ref uint reasons);
  [DllImport("rstrtmgr.dll")]
  static extern int RmEndSession(uint session);
  static void Check(int code) { if(code != 0) throw new System.ComponentModel.Win32Exception(code); }
  public static Identity[] Read(string file) {
    uint session;
    Check(RmStartSession(out session, 0, Guid.NewGuid().ToString("N")));
    Exception failure=null;
    try {
      Check(RmRegisterResources(session, 1, new string[] { file }, 0, null, 0, null));
      uint needed, count=0, reasons=0;
      int code=RmGetList(session, out needed, ref count, null, ref reasons);
      if(code == 0) return new Identity[0];
      if(code != 234 || needed > 64) throw new InvalidOperationException("Bounded lock-holder observation unavailable");
      Info[] records=new Info[needed];
      count=needed;
      // One bounded acquisition only. A changing list is evidence failure, not
      // permission to retry until an empty/success-shaped reply is obtained.
      Check(RmGetList(session, out needed, ref count, records, ref reasons));
      Identity[] result=new Identity[count];
      for(int i=0; i<count; i++) {
        long fileTime=((long)(uint)records[i].process.start.dwHighDateTime << 32) | (uint)records[i].process.start.dwLowDateTime;
        result[i]=new Identity { pid=records[i].process.pid, creationIdentity=DateTime.FromFileTimeUtc(fileTime).Ticks.ToString() };
      }
      return result;
    } catch(Exception error) { failure=error; throw; }
    finally {
      int end=RmEndSession(session);
      if(end != 0) {
        Exception endError=new System.ComponentModel.Win32Exception(end);
        if(failure != null) throw new AggregateException(failure, endError);
        throw endError;
      }
    }
  }
}
'@
$file=[Console]::In.ReadToEnd() | ConvertFrom-Json
ConvertTo-Json -InputObject @([MsnFileLocks]::Read([string]$file)) -Compress
`;

function queryWindowsFileLocks(file, execute = execFileSync) {
  const output = execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', lockQuery], {
    input: JSON.stringify(file),
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: 256 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const records = JSON.parse(output.replace(/^\uFEFF/, ''));
  if (
    !Array.isArray(records) ||
    records.length > 64 ||
    records.some((record) => !Number.isSafeInteger(record?.pid) || record.pid <= 0 || !/^\d+$/.test(record.creationIdentity))
  ) {
    throw new Error('Invalid Windows file-lock observation');
  }
  return records;
}

async function observeMsnCleanupDiagnostics(
  { dependencyRoot, outputDir, stage },
  { platform = process.platform, snapshot = createProcessObservationProvider(platform).snapshot, queryLocks = queryWindowsFileLocks } = {}
) {
  if (!['before-task-teardown', 'after-task-teardown', 'after-cli-close'].includes(stage)) {
    throw new Error('Invalid MSN cleanup observation stage');
  }
  const stat = fs.lstatSync(dependencyRoot);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !path.isAbsolute(outputDir)) {
    throw new Error('Unsafe MSN cleanup diagnostic location');
  }
  const root = fs.realpathSync(dependencyRoot);
  const resource = path.join(root, 'FuncCoreTools', 'in-proc8', 'AccentedCommandLineParser.dll');
  const errors = [];
  let locks;
  let records = [];
  if (platform === 'win32' && fs.existsSync(resource)) {
    try {
      const relative = path.relative(root, fs.realpathSync(resource));
      if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) || !fs.statSync(resource).isFile()) {
        throw new Error('MSN lock diagnostic resource escapes the owned dependency root');
      }
      locks = queryLocks(resource);
    } catch (error) {
      errors.push(error);
    }
  }
  let processObservationAvailable = false;
  try {
    records = await snapshot(10_000);
    if (!Array.isArray(records)) {
      throw new Error('Invalid MSN cleanup process observation');
    }
    processObservationAvailable = true;
  } catch (error) {
    records = [];
    errors.push(error);
  }
  const scoped = records.filter((record) => {
    if (!record.executable || !path.isAbsolute(record.executable)) {
      return false;
    }
    const relative = path.relative(
      platform === 'win32' ? root.toLowerCase() : root,
      platform === 'win32' ? record.executable.toLowerCase() : record.executable
    );
    return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  });
  const observation = {
    schemaVersion: 1,
    stage,
    observedAt: new Date().toISOString(),
    observerPid: process.pid,
    observerIdentities: records.filter((record) => record.pid === process.pid).map(processIdentity),
    dependencyRoot: root,
    resource,
    originalProcessClosureVerified: false,
    processClosureProof: 'original-identities-unverified',
    // Candidates and actual file-lock observations are NOT authority to kill.
    dependencyExecutableCandidates: scoped.map(processIdentity),
    dependencyCandidateAncestry: scoped.map((record) => ({
      ...processIdentity(record),
      observedAncestry: observedAncestry(record, records),
    })),
    processObservationAvailable,
    fileLockObservationAvailable: locks !== undefined,
    fileLockHolders: (locks || []).map((lock) => {
      const matching = records.filter((record) => record.pid === lock.pid && record.creationIdentity === lock.creationIdentity);
      return {
        ...lock,
        identityMatched: matching.length === 1,
        ...(matching.length === 1
          ? { process: processIdentity(matching[0]), observedAncestry: observedAncestry(matching[0], records) }
          : {}),
      };
    }),
    observationErrors: errors.map((error) => ({ name: error.name, code: error.code || '', message: error.message })),
  };
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, `${stage}.json`), `${JSON.stringify(observation, null, 2)}\n`, { flag: 'wx' });
  if (errors.length > 0) {
    throw new AggregateError(errors, 'MSN cleanup instrumentation failed; partial observations retained');
  }
  return observation;
}

function sameProcessIdentity(left, right) {
  return left.pid === right.pid && left.creationIdentity === right.creationIdentity;
}

function readCleanupObservation(outputDir, stage) {
  const file = path.join(outputDir, `${stage}.json`);
  const observation = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (
    observation?.schemaVersion !== 1 ||
    observation.stage !== stage ||
    observation.processObservationAvailable !== true ||
    !Array.isArray(observation.observerIdentities) ||
    !Array.isArray(observation.dependencyCandidateAncestry)
  ) {
    throw new Error(`Invalid MSN ${stage} process observation`);
  }
  return observation;
}

async function closeOwnedMsnProcesses(
  { dependencyRoot, outputDir },
  {
    snapshot = createProcessObservationProvider(process.platform).snapshot,
    terminate = async (pid) => process.kill(pid, 'SIGTERM'),
    wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    timeoutMs = 15_000,
  } = {}
) {
  const root = fs.realpathSync(dependencyRoot);
  const before = readCleanupObservation(outputDir, 'before-task-teardown');
  const afterTask = readCleanupObservation(outputDir, 'after-task-teardown');
  const afterClose = readCleanupObservation(outputDir, 'after-cli-close');
  if (before.dependencyRoot !== root || afterTask.dependencyRoot !== root || afterClose.dependencyRoot !== root) {
    throw new Error('MSN cleanup observations do not belong to the exact owned dependency root');
  }
  if (before.observerIdentities.length !== 1) {
    throw new Error('MSN cleanup requires one exact original Code observer identity');
  }
  const owner = before.observerIdentities[0];
  const ownerDescendants = before.dependencyCandidateAncestry.filter((candidate) =>
    candidate.observedAncestry.some((ancestor) => sameProcessIdentity(ancestor, owner))
  );
  if (ownerDescendants.length === 0) {
    throw new Error('MSN cleanup has no dependency process identities proven as descendants of the original Code host');
  }
  const ownedByIdentity = new Map();
  for (const observation of [before, afterTask, afterClose]) {
    for (const { pid, parentPid, creationIdentity, executable, observedAncestry } of observation.dependencyCandidateAncestry) {
      const identity = { pid, parentPid, creationIdentity, executable, depth: observedAncestry.length };
      const key = `${pid}:${creationIdentity}`;
      const existing = ownedByIdentity.get(key);
      if (!existing || identity.depth > existing.depth) {
        ownedByIdentity.set(key, identity);
      }
    }
  }
  const owned = [...ownedByIdentity.values()];
  const identityKeys = new Set(owned.map((identity) => `${identity.pid}:${identity.creationIdentity}`));
  const scopedSnapshot = async () => {
    const records = await snapshot(10_000);
    if (!Array.isArray(records)) {
      throw new Error('Invalid MSN cleanup process observation');
    }
    const scoped = records.filter((record) => {
      if (!record.executable || !path.isAbsolute(record.executable)) {
        return false;
      }
      const relative = path.relative(
        process.platform === 'win32' ? root.toLowerCase() : root,
        process.platform === 'win32' ? record.executable.toLowerCase() : record.executable
      );
      return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
    });
    if (scoped.some((record) => !identityKeys.has(`${record.pid}:${record.creationIdentity}`))) {
      throw new Error('MSN cleanup observed an unadmitted process identity under the invocation-owned dependency root');
    }
    return scoped;
  };
  const terminated = [];
  for (const record of (await scopedSnapshot()).sort(
    (left, right) =>
      (owned.find((identity) => sameProcessIdentity(identity, right))?.depth ?? 0) -
      (owned.find((identity) => sameProcessIdentity(identity, left))?.depth ?? 0)
  )) {
    const relative = path.relative(
      process.platform === 'win32' ? root.toLowerCase() : root,
      process.platform === 'win32' ? String(record.executable).toLowerCase() : String(record.executable)
    );
    if (!record.executable || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error('MSN cleanup refused an original identity outside the owned dependency root');
    }
    try {
      await terminate(record.pid);
      terminated.push(processIdentity(record));
    } catch (error) {
      if (error?.code !== 'ESRCH') {
        throw error;
      }
    }
  }
  const deadline = Date.now() + timeoutMs;
  let alive = await scopedSnapshot();
  while (alive.length > 0 && Date.now() < deadline) {
    await wait(Math.min(250, deadline - Date.now()));
    alive = await scopedSnapshot();
  }
  const proof = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    dependencyRoot: root,
    originalProcessClosureVerified: alive.length === 0,
    processClosureProof: alive.length === 0 ? 'exact-root-owned-identities-absent' : 'exact-root-owned-identities-still-alive',
    originalIdentities: ownerDescendants.map(processIdentity),
    rootOwnedIdentities: owned.map(({ depth: _depth, ...identity }) => identity),
    terminatedIdentities: terminated,
    aliveIdentities: alive.map(processIdentity),
  };
  fs.writeFileSync(path.join(outputDir, 'after-owned-process-close.json'), `${JSON.stringify(proof, null, 2)}\n`, { flag: 'wx' });
  if (!proof.originalProcessClosureVerified) {
    throw new Error('MSN cleanup could not close every exact invocation-root dependency process identity');
  }
  return {
    verified: true,
    originalProcessClosureVerified: true,
    processClosureProof: proof.processClosureProof,
    originalIdentities: proof.originalIdentities,
    rootOwnedIdentities: proof.rootOwnedIdentities,
    terminatedIdentities: proof.terminatedIdentities,
  };
}

module.exports = {
  closeOwnedMsnProcesses,
  observeMsnCleanupDiagnostics,
  queryWindowsFileLocks,
  recordMsnBodyAssertions,
  readMsnBodyAssertions,
};
