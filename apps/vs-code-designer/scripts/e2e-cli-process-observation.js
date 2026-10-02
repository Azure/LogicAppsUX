/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global module, process, require */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const { OwnedProcessEvidenceError } = require('./e2e-cli-owned-processes');

function fail(reason) {
  throw new OwnedProcessEvidenceError(reason);
}

function timeout(budget) {
  if (!Number.isFinite(budget) || Math.floor(budget) <= 0) {
    fail('observation-budget-exhausted');
  }
  return Math.floor(budget);
}

function powershell(script, budget, input) {
  try {
    return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      input,
      encoding: 'utf8',
      timeout: timeout(budget),
      maxBuffer: 4 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error) {
    if (error instanceof OwnedProcessEvidenceError) {
      throw error;
    }
    fail('native-process-operation-failed');
  }
}

function readLinuxProcess(pid, bootIdentity) {
  const text = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
  const fields = text
    .slice(text.lastIndexOf(') ') + 2)
    .trim()
    .split(/\s+/);
  if (fields.length < 20 || !/^\d+$/.test(fields[19]) || !/^\d+$/.test(fields[1])) {
    fail('invalid-native-process-identity');
  }
  let executable = '';
  try {
    executable = fs.readlinkSync(`/proc/${pid}/exe`);
  } catch (error) {
    if (!['ENOENT', 'EACCES', 'EPERM'].includes(error.code)) {
      throw error;
    }
  }
  return { pid, parentPid: Number(fields[1]), creationIdentity: `${bootIdentity}:${fields[19]}`, executable };
}

function createProcessObservationProvider(platform = process.platform, execute = powershell) {
  if (!['linux', 'win32'].includes(platform)) {
    fail('unsupported-process-observation-platform');
  }
  return Object.freeze({
    snapshot: async (budget) => {
      timeout(budget);
      if (platform === 'win32') {
        const output = execute(
          "$ErrorActionPreference='Stop'; @(Get-CimInstance Win32_Process | Where-Object {$_.ProcessId -gt 0} | ForEach-Object { [ordered]@{ pid=[long]$_.ProcessId; parentPid=[long]$_.ParentProcessId; creationIdentity=$(if($_.CreationDate){$_.CreationDate.ToUniversalTime().Ticks.ToString()}else{''}); executable=[string]$_.ExecutablePath } }) | ConvertTo-Json -Compress",
          budget
        );
        try {
          const value = JSON.parse(output.replace(/^\uFEFF/, ''));
          if (!Array.isArray(value)) {
            fail('invalid-native-process-observation');
          }
          return value;
        } catch (error) {
          if (error instanceof OwnedProcessEvidenceError) {
            throw error;
          }
          fail('invalid-native-process-observation');
        }
      }
      const started = Date.now();
      const bootIdentity = fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
      const records = [];
      for (const name of fs.readdirSync('/proc')) {
        if (!/^[1-9]\d*$/.test(name)) {
          continue;
        }
        timeout(budget - (Date.now() - started));
        try {
          records.push(readLinuxProcess(Number(name), bootIdentity));
        } catch (error) {
          if (error.code !== 'ENOENT') {
            fail('native-process-observation-failed');
          }
        }
      }
      return records;
    },
    ...(platform === 'win32'
      ? {
          terminateExact: async (record, budget) => {
            if (!Number.isSafeInteger(record.pid) || record.pid <= 0 || !/^\d+$/.test(record.creationIdentity)) {
              fail('invalid-exact-process-identity');
            }
            execute(
              "$ErrorActionPreference='Stop'; $expected=[Console]::In.ReadToEnd()|ConvertFrom-Json; $clock=[Diagnostics.Stopwatch]::StartNew(); $held=$null; try { $held=[Diagnostics.Process]::GetProcessById([int]$expected.pid); $null=$held.Handle; $current=Get-CimInstance Win32_Process -Filter ('ProcessId = '+[int]$expected.pid); if(!$current -or $current.CreationDate.ToUniversalTime().Ticks.ToString() -cne [string]$expected.creationIdentity -or [IO.Path]::GetFullPath([string]$current.ExecutablePath).ToLowerInvariant() -cne [string]$expected.executable){throw 'Exact process identity changed'}; $remaining=[int]$expected.budget-$clock.ElapsedMilliseconds; if($remaining -le 0){throw 'Process cleanup budget expired'}; Stop-Process -Id ([int]$expected.pid) -ErrorAction Stop; if(!$held.WaitForExit([int]$remaining)){throw 'Exact process exit not observed'} } finally {if($held){$held.Dispose()}}",
              budget,
              JSON.stringify({
                pid: record.pid,
                creationIdentity: record.creationIdentity,
                executable: record.executable.toLowerCase(),
                budget: timeout(budget),
              })
            );
          },
        }
      : {}),
  });
}

module.exports = { createProcessObservationProvider };
