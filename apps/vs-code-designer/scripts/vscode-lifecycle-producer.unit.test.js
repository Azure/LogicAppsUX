/* global __dirname, clearTimeout, process, require, setTimeout */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const {
  CONTENT_MANIFEST_NAME,
  CS_DEV_KIT_E2E_VERSION,
  createContentManifest,
  getTargetPlatform,
  readSourceContract,
  verify,
} = require('./prepare-e2e-extension-dependencies');
const {
  installedPayloadOwners,
  prepareLifecycleLaunch,
  resolveSubsequentStartup,
  retainedBoundaryRecords,
  produceLifecycleEvidence,
} = require('./vscode-lifecycle-producer');
const { observeProcesses, probeReleasedPort } = require('./vscode-lifecycle-observer');
const { validOriginalIdentity, sameOriginalIdentity, originalProcessReleased } = require('./vscode-lifecycle-identity');
const {
  _test: { spawnContainedProcess, sanitizeContainedProcessDiagnostics },
} = require('./run-e2e-cli');

const bootId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const identityFields = (startTimeTicks, platform = process.platform) => ({
  startTimeTicks,
  identity:
    platform === 'linux'
      ? { platform, kind: 'linux-proc-start', startTimeTicks, bootId, clockTicksPerSecond: 100 }
      : { platform, kind: 'windows-filetime', startTimeTicks },
});
const roslynName = (platform) => `Microsoft.CodeAnalysis.LanguageServer${platform === 'win32' ? '.exe' : ''}`;

function payloadFixture(platform = process.platform) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-policy-producer-'));
  const seed = path.join(root, 'seed');
  fs.mkdirSync(seed);
  for (const id of new Set([...readSourceContract().requiredDependencies, 'ms-dotnettools.vscode-dotnet-runtime'])) {
    const version = id === 'ms-dotnettools.csdevkit' ? CS_DEV_KIT_E2E_VERSION : '1.0.0';
    const location = path.join(seed, `${id}-${version}`);
    fs.mkdirSync(location);
    const [publisher, name] = id.split('.');
    fs.writeFileSync(
      path.join(location, 'package.json'),
      JSON.stringify({
        publisher,
        name,
        version,
        extensionDependencies: id === 'ms-dotnettools.csharp' ? ['ms-dotnettools.vscode-dotnet-runtime'] : [],
        __metadata: { targetPlatform: getTargetPlatform(platform, process.arch) },
      })
    );
    if (id === 'ms-dotnettools.csdevkit') {
      const native =
        platform === 'win32'
          ? path.join(location, 'dist', 'native', getTargetPlatform(platform, process.arch), 'NodeAddon.node')
          : path.join(location, 'components', 'CPS', 'platforms', getTargetPlatform(platform, process.arch), 'payload');
      fs.mkdirSync(path.dirname(native), { recursive: true });
      fs.writeFileSync(native, 'synthetic native dependency bytes');
    }
    if (id === 'ms-dotnettools.csharp') {
      const executable = path.join(location, '.roslyn', roslynName(platform));
      fs.mkdirSync(path.dirname(executable));
      fs.writeFileSync(executable, 'synthetic Roslyn bytes; not an executable/native acceptance claim');
    }
  }
  const options = { vscodeVersion: 'stable', platform, arch: process.arch };
  const manifest = createContentManifest(seed, readSourceContract(), options);
  fs.writeFileSync(path.join(seed, CONTENT_MANIFEST_NAME), JSON.stringify(manifest));
  const installed = path.join(root, 'installed');
  fs.cpSync(seed, installed, { recursive: true });
  const executable = path.join(installed, 'ms-dotnettools.csharp-1.0.0', '.roslyn', roslynName(platform));
  const launch = {
    invocation: 'synthetic-payload-control',
    env: {
      LA_E2E_CLI_PREPARED_EXTENSIONS_DIR: seed,
      LA_E2E_CLI_EXTENSIONS_DIR: installed,
    },
  };
  const closure = {
    activeContainedProcesses: [
      {
        pid: 101,
        ...identityFields('1234', platform),
        executablePath: executable,
        metadataStatus: 'captured',
        commandSummary: {
          sha256: 'a'.repeat(64),
          payloadPaths: [executable],
          ...(platform === 'linux' ? { hashEncoding: 'linux-proc-cmdline-nul-bytes' } : {}),
        },
      },
    ],
  };
  return { root, seed, installed, executable, launch, closure };
}

test('added Roslyn composition cache does not change exact validated executable ownership; the immutable seed still uses full verify', () => {
  const fixture = payloadFixture();
  try {
    const owner = installedPayloadOwners(fixture.closure, fixture.launch)[0];
    assert.equal(owner.source, 'validated-installed-payload');
    assert.equal(owner.processClass, 'csharp-roslyn-language-server');
    assert.match(owner.installationSHA256, /^[a-f0-9]{64}$/);
    assert.match(owner.payloadSHA256, /^[a-f0-9]{64}$/);
    const cache = path.join(path.dirname(fixture.executable), 'cache', 'c#-languageserver.fresh.mef-composition');
    fs.mkdirSync(path.dirname(cache));
    fs.writeFileSync(cache, 'synthetic generated cache; not a native provenance claim');
    assert.deepEqual(installedPayloadOwners(fixture.closure, fixture.launch)[0], owner);
    assert.throws(
      () => verify({ extensionsDir: fixture.installed, vscodeVersion: 'stable', platform: process.platform, arch: process.arch }),
      /does not match/,
      'Installed executable ownership must not weaken full immutable seed verification'
    );
    for (const id of ['ms-azuretools.vscode-azurelogicapps', 'la-e2e.lifecycle-recorder']) {
      const overlay = path.join(fixture.installed, `${id}-1.0.0`);
      fs.mkdirSync(overlay);
      const [publisher, name] = id.split('.');
      fs.writeFileSync(path.join(overlay, 'package.json'), JSON.stringify({ publisher, name, version: '1.0.0' }));
    }
    assert.deepEqual(installedPayloadOwners(fixture.closure, fixture.launch)[0], owner);
    fs.appendFileSync(fixture.executable, 'foreign executable bytes');
    assert.throws(() => installedPayloadOwners(fixture.closure, fixture.launch), /executable hash differs/);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('unknown/Func identity, command mismatch, changed seed and symlink cannot become independent ownership', () => {
  const fixture = payloadFixture();
  try {
    const processRecord = fixture.closure.activeContainedProcesses[0];
    for (const change of [
      { executablePath: path.join(fixture.installed, 'func.exe') },
      { executablePath: path.join(fixture.seed, 'ms-dotnettools.csharp-1.0.0', '.roslyn', roslynName(process.platform)) },
      { executablePath: path.join(fixture.root, '.roslyn', roslynName(process.platform)) },
      { startTimeTicks: '' },
      { commandSummary: { sha256: 'a'.repeat(64), payloadPaths: [path.join(fixture.installed, 'other.exe')] } },
      { metadataStatus: 'inspection-failed' },
    ]) {
      assert.throws(() => installedPayloadOwners({ activeContainedProcesses: [{ ...processRecord, ...change }] }, fixture.launch));
    }
    fs.symlinkSync(fixture.seed, path.join(fixture.root, 'linked-seed'), process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(
      () =>
        installedPayloadOwners(fixture.closure, {
          ...fixture.launch,
          env: { ...fixture.launch.env, LA_E2E_CLI_PREPARED_EXTENSIONS_DIR: path.join(fixture.root, 'linked-seed') },
        }),
      /real directory/
    );
    fs.appendFileSync(path.join(fixture.seed, 'ms-dotnettools.csharp-1.0.0', 'package.json'), ' ');
    assert.throws(() => installedPayloadOwners(fixture.closure, fixture.launch), /manifest/);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('installed root and executable-parent junctions/links cannot become independent ownership', () => {
  for (const target of ['installed', 'csharp', 'roslyn']) {
    const fixture = payloadFixture();
    try {
      const linked =
        target === 'installed'
          ? fixture.installed
          : target === 'csharp'
            ? path.dirname(path.dirname(fixture.executable))
            : path.dirname(fixture.executable);
      const displaced = path.join(fixture.root, 'displaced');
      fs.renameSync(linked, displaced);
      fs.symlinkSync(displaced, linked, process.platform === 'win32' ? 'junction' : 'dir');
      assert.throws(() => installedPayloadOwners(fixture.closure, fixture.launch), /link/);
    } finally {
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  }
});

test('a symlink executable cannot qualify even with identical bytes', (t) => {
  const fixture = payloadFixture();
  try {
    const displaced = path.join(fixture.root, roslynName(process.platform));
    fs.renameSync(fixture.executable, displaced);
    try {
      fs.symlinkSync(displaced, fixture.executable, 'file');
    } catch (error) {
      if (process.platform === 'win32' && error.code === 'EPERM') {
        t.skip('This Windows account cannot create file symlinks; directory junction controls remain active');
        return;
      }
      throw error;
    }
    assert.throws(() => installedPayloadOwners(fixture.closure, fixture.launch), /link/);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('replacement and in-place mutation races during executable hashing fail closed', () => {
  for (const replacement of [false, true]) {
    const fixture = payloadFixture();
    const readFileSync = fs.readFileSync;
    let raced = false;
    try {
      fs.readFileSync = (file, ...args) => {
        const bytes = readFileSync(file, ...args);
        if (typeof file === 'number' && !raced) {
          raced = true;
          if (replacement) {
            fs.renameSync(fixture.executable, `${fixture.executable}.original`);
            fs.writeFileSync(fixture.executable, bytes);
          } else {
            fs.appendFileSync(fixture.executable, 'race mutation');
          }
        }
        return bytes;
      };
      assert.throws(() => installedPayloadOwners(fixture.closure, fixture.launch), /changed during hashing/);
      assert.equal(raced, true);
    } finally {
      fs.readFileSync = readFileSync;
      fs.rmSync(fixture.root, { recursive: true, force: true });
    }
  }
});

test('next startup is a separate owner-bound observation, never a fabricated success flag', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-policy-startup-'));
  try {
    const original = prepareLifecycleLaunch(root, {});
    original.closed = true;
    original.requiresStartup = true;
    const next = prepareLifecycleLaunch(root, {});
    fs.writeFileSync(path.join(next.directory, 'binding.json'), JSON.stringify({ invocation: next.invocation, rootPid: 200 }));
    const evidence = {
      invocation: original.invocation,
      nextStartupLink: original.nextStartupLink,
      requiredStartupDomain: 'extension-host',
    };
    assert.equal(resolveSubsequentStartup(evidence).startup, undefined);
    const record = {
      schemaVersion: 1,
      invocation: next.invocation,
      rootPid: 200,
      kind: 'startup',
      source: 'logicapps-subsequent-startup',
      domain: 'extension-host',
      verified: true,
      extensionHostPid: 201,
      observedAt: 100,
    };
    const file = path.join(next.directory, 'control.observer.jsonl');
    fs.writeFileSync(file, `${JSON.stringify(record)}\n`);
    assert.match(resolveSubsequentStartup(evidence).startupResolutionError, /native extension-host identity/);
    const native = {
      observedAtUtc: new Date(90).toISOString(),
      processes: [
        {
          pid: 201,
          ...identityFields('777'),
          metadataStatus: 'captured',
          commandSummary: {
            sha256: 'a'.repeat(64),
            ...(process.platform === 'linux' ? { hashEncoding: 'linux-proc-cmdline-nul-bytes' } : {}),
          },
        },
      ],
    };
    const receipt = path.join(next.directory, 'control.response');
    fs.writeFileSync(receipt, JSON.stringify(native));
    record.nativeIdentity = { ...native, receipt };
    fs.writeFileSync(file, `${JSON.stringify(record)}\n`);
    const resolved = resolveSubsequentStartup(evidence);
    assert.equal(resolved.startup.actualInvocation, next.invocation);
    assert.notEqual(resolved.startup.actualInvocation, evidence.invocation);
    native.processes[0].metadataStatus = 'not-in-job';
    fs.writeFileSync(receipt, JSON.stringify(native));
    assert.match(resolveSubsequentStartup(evidence).startupResolutionError, /differs/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('nested boundary correlation requires the original host and root in both native Jobs, without rebinding child receipts', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-policy-nested-control-'));
  try {
    const outer = prepareLifecycleLaunch(root, {});
    const binding = { invocation: outer.invocation, rootPid: 501 };
    fs.writeFileSync(path.join(outer.directory, 'binding.json'), JSON.stringify(binding));
    const inner = prepareLifecycleLaunch(root, { LA_E2E_LIFECYCLE_DIR: outer.directory, LA_E2E_LIFECYCLE_INVOCATION: outer.invocation });
    const childBinding = { invocation: inner.invocation, rootPid: 502 };
    fs.writeFileSync(path.join(inner.directory, 'binding.json'), JSON.stringify(childBinding));
    const original = { pid: 503, ...identityFields('123'), metadataStatus: 'captured', commandSummary: { sha256: 'a'.repeat(64) } };
    const native = { processes: [original, { ...original, pid: 502 }] };
    const receipt = path.join(outer.directory, 'synthetic-membership.response');
    fs.writeFileSync(receipt, JSON.stringify(native));
    const record = {
      schemaVersion: 1,
      ...childBinding,
      kind: 'startup',
      extensionHostPid: 503,
      nativeIdentity: { processes: [original] },
      parentIdentity: { ...native, binding, receipt },
    };
    fs.writeFileSync(path.join(inner.directory, 'synthetic.observer.jsonl'), `${JSON.stringify(record)}\n`);
    const records = retainedBoundaryRecords(outer.directory, binding);
    assert.equal(records[0].invocation, inner.invocation);
    assert.equal(records[0].nativeOwnerDirectory, inner.directory);
    native.processes[0].startTimeTicks = 'reused-pid';
    fs.writeFileSync(receipt, JSON.stringify(native));
    assert.throws(() => retainedBoundaryRecords(outer.directory, binding), /differs/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('product producer correlates capture/release before recovery and does not accept an unobserved or reused host', () => {
  const fixture = payloadFixture();
  try {
    const directory = path.join(fixture.root, 'native-owner');
    fs.mkdirSync(directory);
    fixture.launch.directory = directory;
    fixture.launch.nextStartupLink = path.join(directory, 'next-startup.json');
    const binding = { invocation: fixture.launch.invocation, rootPid: 900 };
    fs.writeFileSync(path.join(directory, 'binding.json'), JSON.stringify(binding));
    const original = {
      pid: 901,
      ...identityFields('333'),
      metadataStatus: 'captured',
      commandSha256: 'e'.repeat(64),
      commandSummary: { sha256: 'e'.repeat(64) },
    };
    const before = path.join(directory, 'before.response');
    const after = path.join(directory, 'after.response');
    fs.writeFileSync(before, JSON.stringify({ observedAtUtc: new Date(10).toISOString(), processes: [original] }));
    fs.writeFileSync(
      after,
      JSON.stringify({ observedAtUtc: new Date(25).toISOString(), processes: [{ pid: 901, metadataStatus: 'exited-before-inspection' }] })
    );
    const host = { processes: [{ pid: 902, ...identityFields('444') }] };
    const startup = { schemaVersion: 1, ...binding, kind: 'startup', extensionHostPid: 902, nativeIdentity: host };
    const shutdown = {
      schemaVersion: 1,
      ...binding,
      kind: 'shutdown',
      extensionHostPid: 902,
      nativeIdentity: host,
      shutdown: {
        source: 'logicapps-owned-shutdown',
        invocation: binding.invocation,
        verified: true,
        observedAt: 20,
        receipt: 'synthetic-shutdown',
        ownedProcesses: [original],
        processCaptureReceipt: before,
      },
      resources: {
        source: 'logicapps-resource-probe',
        invocation: binding.invocation,
        verified: true,
        observedAt: 30,
        receipt: after,
        ports: [1234],
        portProbes: [{ port: 1234, observedAt: 26 }],
        checked: ['runtime', 'design-time', 'ports', 'locks'],
      },
    };
    const file = path.join(directory, 'synthetic.observer.jsonl');
    const write = () => fs.writeFileSync(file, `${JSON.stringify(startup)}\n${JSON.stringify(shutdown)}\n`);
    write();
    const closure = { ...fixture.closure, rootPid: 900, metadataCapturedAtUtc: new Date(50).toISOString() };
    assert.equal(produceLifecycleEvidence(closure, fixture.launch).requiredStartupDomain, 'design-time');
    startup.nativeIdentity = { processes: [{ pid: 902, startTimeTicks: 'reused-host' }] };
    write();
    assert.equal(produceLifecycleEvidence(closure, fixture.launch), undefined);
    assert.match(closure.lifecycleProducerError, /host lacks shutdown proof/);
    startup.nativeIdentity = host;
    shutdown.resources.portProbes = [];
    write();
    assert.equal(produceLifecycleEvidence(closure, fixture.launch), undefined);
    assert.match(closure.lifecycleProducerError, /port lacks a real/);
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test(
  'real Windows Job observer captures only a retained owned PID and rejects the known outside parent',
  {
    skip: process.platform !== 'win32',
    timeout: 30_000,
  },
  async () => {
    const launch = spawnContainedProcess(
      process.execPath,
      [
        '-e',
        'console.log(JSON.stringify({pid:process.pid,directory:process.env.LA_E2E_LIFECYCLE_DIR})); process.stdin.once("data",()=>process.exit(0)); process.stdin.resume();',
      ],
      { env: { ...process.env } }
    );
    const closed = new Promise((resolve) => launch.child.once('close', (code, signal) => resolve({ code, signal })));
    try {
      const line = await new Promise((resolve, reject) => {
        let output = '';
        const timer = setTimeout(() => reject(new Error('Native observer control did not start')), 15_000);
        launch.child.stdout.on('data', (chunk) => {
          output += chunk;
          if (output.includes('\n')) {
            clearTimeout(timer);
            resolve(JSON.parse(output.split('\n')[0]));
          }
        });
      });
      const observation = await observeProcesses(line.directory, [line.pid, process.pid]);
      const owned = observation.processes.find((record) => record.pid === line.pid);
      assert.equal(owned.metadataStatus, 'captured');
      assert.ok(owned.startTimeTicks);
      assert.match(owned.commandSummary.sha256, /^[a-f0-9]{64}$/);
      assert.equal(observation.processes.find((record) => record.pid === process.pid).metadataStatus, 'not-in-job');
    } finally {
      launch.child.stdin.end('close');
      const { code, signal } = await closed;
      assert.equal(launch.readClosure(code, signal).verified, true);
    }
  }
);

test('real exclusive loopback resource probe releases its acquired socket', async () => {
  await probeReleasedPort(0);
  await probeReleasedPort(0);
});

test('Linux exact verified Roslyn inventory binds the extensionless executable, never a Windows or shared Func payload', () => {
  const fixture = payloadFixture('linux');
  try {
    const owner = installedPayloadOwners(fixture.closure, fixture.launch, 'linux')[0];
    assert.equal(owner.identity.platform, 'linux');
    assert.equal(owner.identity.bootId, bootId);
    assert.equal(path.basename(owner.executable), 'Microsoft.CodeAnalysis.LanguageServer');
    for (const change of [
      { identity: undefined },
      { identity: { ...owner.identity, bootId: '' } },
      { identity: { ...owner.identity, platform: 'win32' } },
      { executablePath: `${fixture.executable}.exe` },
      { executablePath: path.join(path.dirname(fixture.executable), 'func') },
      { commandSummary: { sha256: 'a'.repeat(64), payloadPaths: [] } },
      {
        commandSummary: {
          sha256: 'a'.repeat(64),
          hashEncoding: 'linux-proc-cmdline-nul-bytes',
          payloadPaths: [fixture.executable.replace('LanguageServer', 'LANGUAGESERVER')],
        },
      },
    ]) {
      assert.throws(() =>
        installedPayloadOwners(
          { activeContainedProcesses: [{ ...fixture.closure.activeContainedProcesses[0], ...change }] },
          fixture.launch,
          'linux'
        )
      );
    }
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('shared runner Linux protocol retains native discriminants and refuses incomplete or cross-platform capture', () => {
  const executable = path.join(__dirname, 'fixtures', 'ms-dotnettools.csharp-1.0.0', '.roslyn', roslynName('linux'));
  const scope = { LA_E2E_CLI_EXTENSIONS_DIR: path.join(__dirname, 'fixtures') };
  const record = {
    pid: 123,
    ...identityFields('456', 'linux'),
    metadataStatus: 'captured',
    executablePath: executable,
    commandSummary: {
      sha256: 'a'.repeat(64),
      hashEncoding: 'linux-proc-cmdline-nul-bytes',
      argumentCount: 2,
      safeMarkers: [],
      scriptOrModuleBasenames: [],
      payloadPaths: [executable],
    },
  };
  const sanitized = sanitizeContainedProcessDiagnostics([record], scope, 'linux');
  assert.equal(sanitized.valid, true);
  assert.deepEqual(sanitized.processes[0].identity, record.identity);
  assert.equal(sanitized.processes[0].executablePath, executable);
  for (const change of [
    { identity: undefined },
    { identity: { ...record.identity, bootId: '' } },
    { identity: { ...record.identity, clockTicksPerSecond: 0 } },
    { identity: { ...record.identity, kind: 'windows-filetime' } },
    { commandSummary: { ...record.commandSummary, hashEncoding: undefined } },
    { commandSummary: { ...record.commandSummary, sha256: '' } },
  ]) {
    assert.equal(sanitizeContainedProcessDiagnostics([{ ...record, ...change }], scope, 'linux').valid, false);
  }
  const windowsPayload = sanitizeContainedProcessDiagnostics([{ ...record, executablePath: `${executable}.exe` }], scope, 'linux');
  assert.equal(windowsPayload.processes[0].executablePath, undefined);
  assert.equal(
    sanitizeContainedProcessDiagnostics([{ pid: process.pid, metadataStatus: 'not-in-containment' }], scope, 'linux').valid,
    true,
    'Outside ownership is an explicit refusal, never a captured identity'
  );
});

test('Linux original release requires actual exit or a complete different boot/start identity, not inaccessible metadata', () => {
  const original = { pid: 123, ...identityFields('456', 'linux') };
  assert.equal(validOriginalIdentity(original, 'linux'), true);
  assert.equal(sameOriginalIdentity(original, { ...original }), true);
  for (const metadataStatus of ['inspection-failed', 'not-in-containment', 'membership-query-failed']) {
    assert.equal(originalProcessReleased(original, { pid: 123, metadataStatus, startTimeTicks: '999' }), false);
  }
  assert.equal(originalProcessReleased(original, { pid: 123, metadataStatus: 'exited-before-inspection' }), true);
  assert.equal(originalProcessReleased(original, { ...original, metadataStatus: 'captured' }), false);
  assert.equal(originalProcessReleased(original, { pid: 123, ...identityFields('999', 'linux'), metadataStatus: 'captured' }), true);
  assert.equal(originalProcessReleased(original, { pid: 123, startTimeTicks: '999', metadataStatus: 'captured' }), false);
});

test(
  'Linux native owner retains original descendant identity across parent exit and rejects an outside PID without command data',
  { skip: process.platform !== 'linux', timeout: 30_000 },
  async () => {
    const launch = spawnContainedProcess(
      process.execPath,
      [
        '-e',
        [
          "const {spawn}=require('node:child_process');",
          "const child=spawn(process.execPath,['-e','console.log(\"ready\");setInterval(()=>{},1000)'],{detached:true,stdio:['ignore','pipe','ignore']});",
          'child.unref();',
          'child.stdout.once("data",()=>console.log(JSON.stringify({pid:process.pid,childPid:child.pid,directory:process.env.LA_E2E_LIFECYCLE_DIR})));',
          'process.stdin.once("data",()=>process.exit(0));process.stdin.resume();',
        ].join(''),
      ],
      { env: { ...process.env } }
    );
    const closed = new Promise((resolve) => launch.child.once('close', (code, signal) => resolve({ code, signal })));
    try {
      const line = await new Promise((resolve, reject) => {
        let output = '';
        const timer = setTimeout(() => reject(new Error('Linux native control startup unavailable')), 10_000);
        launch.child.stdout.on('data', (chunk) => {
          output += chunk;
          if (output.includes('\n')) {
            clearTimeout(timer);
            resolve(JSON.parse(output.split('\n')[0]));
          }
        });
      });
      const before = await observeProcesses(line.directory, [line.childPid, process.pid]);
      const original = before.processes.find((record) => record.pid === line.childPid);
      assert.equal(original.metadataStatus, 'captured');
      assert.equal(validOriginalIdentity(original, 'linux'), true);
      assert.match(original.commandSummary.sha256, /^[a-f0-9]{64}$/);
      assert.equal(
        original.commandSummary.sha256,
        crypto
          .createHash('sha256')
          .update(fs.readFileSync(`/proc/${line.childPid}/cmdline`))
          .digest('hex'),
        'Kernel SHA-256 must cover every raw cmdline byte, including NUL delimiters'
      );
      const outside = before.processes.find((record) => record.pid === process.pid);
      assert.deepEqual(outside, { pid: process.pid, metadataStatus: 'not-in-containment' });
      launch.child.stdin.end('exit-parent');
      const deadline = Date.now() + 10_000;
      while (fs.existsSync(`/proc/${line.pid}`)) {
        assert.ok(Date.now() < deadline, 'Control parent did not exit');
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      const adopted = await observeProcesses(line.directory, [line.childPid]);
      assert.equal(sameOriginalIdentity(original, adopted.processes[0], 'linux'), true);
      const { code, signal } = await closed;
      const closure = launch.readClosure(code, signal);
      assert.equal(code, 125);
      assert.equal(closure.forcedTerminationSucceeded, true);
      assert.deepEqual(closure.escapedDescendants, []);
      const captured = closure.activeContainedProcesses.find((record) => record.pid === line.childPid);
      assert.equal(sameOriginalIdentity(original, captured, 'linux'), true);
      assert.equal(captured.commandSummary.sha256, original.commandSummary.sha256);
      assert.equal(closure.verified, false);
      assert.ok(Number.isFinite(Date.parse(closure.metadataCapturedAtUtc)));
    } finally {
      if (launch.child.exitCode === null && launch.child.signalCode === null) launch.child.kill('SIGTERM');
      await closed;
    }
  }
);

test('scoped observer refuses missing timestamps, omitted PIDs and incomplete ancestry from protocol replies', async () => {
  for (const response of [
    { processes: [], observedAtUtc: new Date().toISOString(), ownershipComplete: true },
    { processes: [{ pid: 123, metadataStatus: 'inspection-failed' }], ownershipComplete: true },
    { processes: [{ pid: 123, metadataStatus: 'inspection-failed' }], observedAtUtc: new Date().toISOString(), ownershipComplete: false },
    { processes: [{ pid: 999, metadataStatus: 'captured' }], observedAtUtc: new Date().toISOString(), ownershipComplete: true },
  ]) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'la-native-protocol-negative-'));
    try {
      const observed = observeProcesses(directory, [123]);
      // observeProcesses publishes the entire request before its first await.
      const request = fs.readdirSync(directory).find((entry) => entry.endsWith('.request'));
      assert.ok(request);
      assert.equal(fs.readFileSync(path.join(directory, request), 'utf8'), '123');
      fs.writeFileSync(path.join(directory, `${request}.response`), JSON.stringify(response));
      await assert.rejects(observed);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }
});
