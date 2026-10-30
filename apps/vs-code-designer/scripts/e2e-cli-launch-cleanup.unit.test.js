/* global __dirname, process, require, setTimeout */
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const {
  _test: { resolveOwnedWorkspacePath, runVscodeTest, readContainmentReceipt, cleanupDeferredWorkspaceAfterCancel, spawnContainedProcess },
} = require('./run-e2e-cli');

const controlsRoot = path.join(__dirname, '..', '.vscode-test', 'launch-cleanup-controls');
fs.mkdirSync(controlsRoot, { recursive: true });

test('owned paths reject links and sibling escapes, including already-removed workspaces', () => {
  const root = fs.mkdtempSync(path.join(controlsRoot, 'paths-'));
  try {
    const workspaceRoot = path.join(root, 'owned');
    const parent = path.join(workspaceRoot, 'original');
    fs.mkdirSync(parent, { recursive: true });
    assert.equal(resolveOwnedWorkspacePath(workspaceRoot, parent), fs.realpathSync.native(parent));
    fs.rmdirSync(parent);
    assert.equal(resolveOwnedWorkspacePath(workspaceRoot, parent), path.join(fs.realpathSync.native(workspaceRoot), 'original'));
    assert.throws(() => resolveOwnedWorkspacePath(workspaceRoot, workspaceRoot), /escaped/);
    assert.throws(() => resolveOwnedWorkspacePath(workspaceRoot, `${workspaceRoot}-foreign`), /escaped/);
    const link = path.join(workspaceRoot, 'link');
    fs.symlinkSync(root, link, process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => resolveOwnedWorkspacePath(workspaceRoot, path.join(link, 'foreign')), /symlink/);
    const dangling = path.join(workspaceRoot, 'dangling');
    fs.symlinkSync(path.join(root, 'absent-target'), dangling, process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => resolveOwnedWorkspacePath(workspaceRoot, dangling), /symlink/);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test('Windows aliases resolve both sides without weakening physical containment', { skip: process.platform !== 'win32' }, () => {
  const root = fs.mkdtempSync(path.join(controlsRoot, 'long-workspace-alias-'));
  const realpath = fs.realpathSync.native;
  try {
    const workspaceRoot = path.join(root, 'owned');
    const parent = path.join(workspaceRoot, 'original');
    fs.mkdirSync(parent, { recursive: true });
    const physicalRoot = realpath(root);
    assert.equal(resolveOwnedWorkspacePath(path.join(root.toUpperCase(), 'owned'), parent), realpath(parent));
    // Exercise actual 8.3 names when enabled on this checkout's volume.
    const short = execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `for %I in ("${physicalRoot}") do @echo %~sI`], {
      encoding: 'utf8',
      windowsVerbatimArguments: true,
    }).trim();
    assert.equal(resolveOwnedWorkspacePath(path.join(short, 'owned'), parent), realpath(parent));
    assert.equal(resolveOwnedWorkspacePath(workspaceRoot, path.join(short, 'owned', 'original')), realpath(parent));
    // Deterministically reproduce the asymmetric physical spelling even when
    // 8.3 naming is disabled. No ownership observer/receipt is substituted.
    fs.realpathSync.native = (candidate) => realpath(candidate).toUpperCase();
    assert.equal(resolveOwnedWorkspacePath(workspaceRoot, parent).toLowerCase(), parent.toLowerCase());
  } finally {
    fs.realpathSync.native = realpath;
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test(
  'actual phase finalization waits for original descendants before deleting; forced recovery cannot pass',
  { timeout: 30_000 },
  async () => {
    const root = fs.mkdtempSync(path.join(controlsRoot, 'phase-finalization-'));
    const previousEnv = { ...process.env };
    try {
      process.env.LA_E2E_CLI_LIFECYCLE_ARTIFACT_ROOT = root;
      process.env.LA_E2E_CLI_GENERATED_WORKSPACE_ARTIFACT_DIR = path.join(root, 'generated');
      const fixture = path.join(root, 'original-lifetime.js');
      fs.writeFileSync(
        fixture,
        [
          "const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');",
          'const root=process.argv[2],workspace=process.argv[3],mode=process.argv[4];',
          "if(process.argv[5]==='descendant'){",
          "fs.writeFileSync(path.join(root,mode+'.pid'),String(process.pid));",
          "setTimeout(()=>{},mode==='natural'?800:60000);",
          '}else{',
          "const child=spawn(process.execPath,[__filename,root,workspace,mode,'descendant'],{detached:true,stdio:'ignore',cwd:workspace});",
          'child.unref();',
          'const timer=setInterval(()=>{',
          "if(fs.existsSync(path.join(root,mode+'.pid'))){clearInterval(timer);process.exit(0);}",
          '},20);',
          '}',
        ].join('\n')
      );

      for (const mode of ['natural', 'lingering']) {
        const workspace = path.join(root, mode);
        const profile = path.join(root, `${mode}-profile`);
        fs.mkdirSync(workspace);
        fs.mkdirSync(path.join(profile, 'logs'), { recursive: true });
        fs.writeFileSync(path.join(profile, 'logs', 'original.log'), 'unit fixture original logs\n');
        const phases = path.join(root, `${mode}-phases.jsonl`);
        // Only replace the VS Code executable with a bounded Node command fixture.
        // Native ownership, diagnostics, deletion, and phase finalization are real.
        const remove = fs.rmSync;
        let removalAttempts = 0;
        fs.rmSync = (candidate, options) => {
          if (path.resolve(candidate) === workspace) {
            removalAttempts += 1;
            const pid = Number(fs.readFileSync(path.join(root, `${mode}.pid`), 'utf8'));
            assert.throws(() => process.kill(pid, 0), 'No removal attempt is permitted while an original descendant is alive');
            const receipts = fs.readdirSync(path.join(root, 'process-closure', 'launches'));
            assert.equal(receipts.length, 1, 'The actual native closure receipt must precede the first removal attempt');
          }
          return remove(candidate, options);
        };
        try {
          const execution = runVscodeTest(
            ['--label', 'unitTests'],
            {
              workspaceParent: workspace,
              extraEnv: {
                LA_E2E_CLI_USER_DATA_DIR: profile,
                LA_E2E_CLI_VSCODE_LOG_DIR: path.join(root, 'profile-artifacts'),
                LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH: phases,
              },
            },
            {
              commandForArgs: () => ({ command: process.execPath, commandArgs: [fixture, root, workspace, mode] }),
            }
          );
          if (mode === 'natural') {
            assert.equal(await execution, 0);
          } else {
            await assert.rejects(execution, /Required original workspace\/profile diagnostics failed/);
          }
        } finally {
          fs.rmSync = remove;
        }
        assert.equal(removalAttempts, mode === 'natural' ? 1 : 0);
        const pid = Number(fs.readFileSync(path.join(root, `${mode}.pid`), 'utf8'));
        assert.throws(() => process.kill(pid, 0), 'Original descendants must really exit before cleanup');
        assert.equal(fs.existsSync(workspace), mode !== 'natural', 'Failed ordinary closure retains its workspace diagnostics');
        const phase = JSON.parse(fs.readFileSync(phases, 'utf8').trim());
        assert.equal(phase.complete, mode === 'natural');
        assert.equal(phase.cleanupVerified, mode === 'natural');
        assert.equal(phase.processCleanup.rootExitCode, 0, 'Both original launcher roots exit zero');
        assert.equal(phase.processCleanup.verified, mode === 'natural');
        if (mode === 'lingering' && process.platform === 'win32') {
          assert.equal(phase.processCleanup.forcedTerminationAttempted, true);
          assert.equal(phase.processCleanup.postTerminationActiveProcessCount, 0);
          assert.ok(phase.processCleanup.activeContainedProcesses.some((entry) => entry.pid === pid));
        }
      }
      assert.equal(fs.readdirSync(path.join(root, 'process-closure', 'launches')).length, 2, 'Sanitized closure diagnostics persist');
      const receipt = path.join(root, 'contradictory-recovery.json');
      fs.writeFileSync(
        receipt,
        JSON.stringify({
          schemaVersion: 1,
          mechanism: process.platform === 'win32' ? 'windows-job-object' : 'linux-subreaper',
          containmentEstablished: true,
          rootPid: 123,
          rootExitCode: 0,
          rootSignal: null,
          containmentEmpty: true,
          retainedOriginalIdentitiesVerified: true,
          forcedTerminationAttempted: true,
          forcedTerminationSucceeded: true,
          postTerminationActiveProcessCount: 0,
          escapedDescendants: [],
        })
      );
      assert.equal(readContainmentReceipt(receipt, 0, null).verified, false, 'Contradictory green-shaped recovery receipts fail closed');
    } finally {
      process.env = previousEnv;
      fs.rmSync(root, { force: true, recursive: true });
    }
  }
);

test('regular Cancel launcher exit alone cannot authorize workspace deletion', async () => {
  const root = fs.mkdtempSync(path.join(controlsRoot, 'regular-code-'));
  try {
    const result = {
      scenario: 'workspace-prompt-cancel',
      originalCodeClose: { code: 0, signal: null },
      processCleanup: { verified: false, forcedTerminationSucceeded: true, postTerminationActiveProcessCount: 0 },
      errors: [],
    };
    const cleanup = await cleanupDeferredWorkspaceAfterCancel(root, {}, result);
    assert.equal(cleanup.verified, false);
    assert.equal(fs.existsSync(root), true);
    assert.match(result.errors[0], /closure was not confirmed/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

for (const timing of ['during-root', 'during-grace']) {
  for (const signal of ['SIGTERM', 'SIGINT']) {
    test(
      `Linux ${signal} ${timing}: zero root exit plus recovered live child cannot become natural closure`,
      {
        skip: process.platform !== 'linux',
        timeout: 30_000,
      },
      async () => {
        const root = fs.mkdtempSync(path.join(controlsRoot, 'signalled-recovery-'));
        const previousArtifacts = process.env.LA_E2E_CLI_LIFECYCLE_ARTIFACT_ROOT;
        let launch;
        let completion;
        const waitFor = async (predicate) => {
          const deadline = Date.now() + 10_000;
          while (!predicate()) {
            assert.ok(Date.now() < deadline, 'Original test root/child did not reach the required signal boundary');
            await new Promise((resolve) => setTimeout(resolve, 20));
          }
        };
        try {
          process.env.LA_E2E_CLI_LIFECYCLE_ARTIFACT_ROOT = root;
          const fixture = path.join(root, 'signalled-original-lifetime.js');
          fs.writeFileSync(
            fixture,
            [
              "const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');",
              'const root=process.argv[2],timing=process.argv[3];',
              "if(process.argv[4]==='descendant'){",
              "fs.writeFileSync(path.join(root,'child.pid'),String(process.pid));",
              'setTimeout(()=>{},60000);',
              '}else{',
              "process.on('SIGTERM',()=>process.exit(0));",
              "process.on('SIGINT',()=>process.exit(0));",
              "const child=spawn(process.execPath,[__filename,root,timing,'descendant'],{detached:true,stdio:'ignore'});",
              'child.unref();',
              'const timer=setInterval(()=>{',
              "if(fs.existsSync(path.join(root,'child.pid'))){",
              "if(!fs.existsSync(path.join(root,'root.pid')))fs.writeFileSync(path.join(root,'root.pid'),String(process.pid));",
              "if(timing==='during-grace'){clearInterval(timer);process.exit(0);}",
              '}',
              '},20);',
              '}',
            ].join('\n')
          );
          launch = spawnContainedProcess(process.execPath, [fixture, root, timing], { env: process.env });
          launch.child.stdout.resume();
          launch.child.stderr.resume();
          completion = new Promise((resolve, reject) => {
            launch.child.once('error', reject);
            launch.child.once('close', (code, hostSignal) =>
              resolve({
                code,
                signal: hostSignal,
                closure: launch.readClosure(code, hostSignal),
              })
            );
          });
          completion.catch(() => {});
          await waitFor(() =>
            ['root.pid', 'child.pid'].every(
              (name) => fs.existsSync(path.join(root, name)) && /^[1-9]\d*$/.test(fs.readFileSync(path.join(root, name), 'utf8'))
            )
          );
          const rootPid = Number(fs.readFileSync(path.join(root, 'root.pid'), 'utf8'));
          const childPid = Number(fs.readFileSync(path.join(root, 'child.pid'), 'utf8'));
          if (timing === 'during-grace') {
            await waitFor(() => !fs.existsSync(path.join('/proc', String(rootPid))));
          } else {
            process.kill(rootPid, 0);
          }
          process.kill(childPid, 0);
          assert.equal(launch.child.kill(signal), true, 'Signal only this control-owned containment host');
          const { code, signal: hostSignal, closure } = await completion;
          assert.equal(code, 125);
          assert.equal(hostSignal, null);
          assert.equal(closure.rootExitCode, 0);
          assert.equal(closure.rootSignal, null);
          assert.equal(closure.forcedTerminationAttempted, true);
          assert.equal(closure.forcedTerminationSucceeded, true);
          assert.equal(closure.postTerminationActiveProcessCount, 0);
          assert.ok(closure.activeContainedProcessCount > 0);
          assert.ok(closure.escapedDescendants.includes(childPid), 'Pre-recovery identities must survive successful force');
          assert.ok(closure.activeContainedProcesses.some((entry) => entry.pid === childPid && entry.startTimeTicks));
          assert.equal(closure.verified, false);
          assert.equal(closure.retainedOriginalIdentitiesVerified, false);
          assert.throws(() => process.kill(childPid, 0));
        } finally {
          if (launch?.child.exitCode === null && launch.child.signalCode === null) {
            launch.child.kill('SIGTERM');
          }
          if (completion) {
            await completion.catch(() => {});
          }
          if (previousArtifacts === undefined) {
            delete process.env.LA_E2E_CLI_LIFECYCLE_ARTIFACT_ROOT;
          } else {
            process.env.LA_E2E_CLI_LIFECYCLE_ARTIFACT_ROOT = previousArtifacts;
          }
          fs.rmSync(root, { force: true, recursive: true });
        }
      }
    );
  }
}
