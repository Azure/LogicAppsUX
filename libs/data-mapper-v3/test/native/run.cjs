const assert = require('node:assert/strict');
const { fork, spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const extensionPath = path.resolve(__dirname, '../..');
const repoPath = path.resolve(extensionPath, '../..');

function resolveExisting(name, locations) {
  try {
    return require.resolve(name, { paths: locations });
  } catch {
    throw new Error(`Missing installed dependency ${name}; this runner never installs or downloads dependencies.`);
  }
}

async function host() {
  process.on('message', () => {});
  const { runTests } = require(process.env.MAPPER_NATIVE_TEST_ELECTRON);
  try {
    await runTests({
      vscodeExecutablePath: process.env.MAPPER_NATIVE_CODE,
      extensionDevelopmentPath: extensionPath,
      extensionTestsPath: path.join(__dirname, 'suite.cjs'),
      launchArgs: [
        process.env.MAPPER_NATIVE_WORKSPACE,
        `--user-data-dir=${process.env.MAPPER_NATIVE_USER_DATA}`,
        `--extensions-dir=${process.env.MAPPER_NATIVE_EXTENSIONS}`,
        '--remote-debugging-address=127.0.0.1',
        '--remote-debugging-port=0',
        '--new-window',
        '--disable-extensions',
        '--disable-gpu',
        '--disable-telemetry',
        '--disable-updates',
        '--skip-welcome',
        '--skip-release-notes',
      ],
    });
    process.send({ ok: true });
  } catch (error) {
    process.send({ ok: false, error: error.stack || String(error) });
  }
}

async function stopOwnedChild(child) {
  if (!child) {
    return;
  }
  if (child.exitCode !== null || child.signalCode !== null) {
    throw new Error('Native launcher already exited; descendant ownership cannot be verified. Refusing to target other processes.');
  }
  let deadline;
  let killer;
  let closed;
  try {
    await new Promise((resolve, reject) => {
      let launcherClosed = false;
      let terminationSucceeded = false;
      const finish = () => {
        if (launcherClosed && terminationSucceeded) {
          resolve();
        }
      };
      closed = () => {
        launcherClosed = true;
        finish();
      };
      child.once('close', closed);
      deadline = setTimeout(() => {
        killer?.kill();
        reject(new Error('Owned process cleanup exceeded 10 seconds; descendant termination is unverified.'));
      }, 10_000);
      if (process.platform === 'win32') {
        killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true });
        killer.stdout.pipe(process.stdout);
        killer.stderr.pipe(process.stderr);
        killer.once('error', reject);
        killer.once('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Owned process cleanup exited ${code}; descendant termination is unverified.`));
          } else {
            terminationSucceeded = true;
            finish();
          }
        });
      } else {
        process.kill(-child.pid, 'SIGKILL');
        terminationSucceeded = true;
        finish();
      }
    });
  } finally {
    clearTimeout(deadline);
    if (closed) {
      child.removeListener('close', closed);
    }
  }
}

async function main() {
  const started = Date.now();
  const electron = resolveExisting('@vscode/test-electron', [path.join(repoPath, 'apps/vs-code-designer')]);
  const playwright = resolveExisting('@playwright/test', [extensionPath, repoPath]);
  const xmlParser = resolveExisting('fast-xml-parser', [extensionPath]);
  const executable = process.env.MAPPER_NATIVE_VSCODE || path.join(process.env.LOCALAPPDATA || '', 'Programs/Microsoft VS Code/Code.exe');
  await fs.access(executable);
  await fs.access(path.join(extensionPath, 'out/extension.js'));
  await fs.access(path.join(extensionPath, 'out/webview/webview.js'));
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mapper-v3-native-'));
  const workspace = path.join(root, 'workspace');
  const userData = path.join(root, 'user-data');
  const extensions = path.join(root, 'extensions');
  let child;
  let deadline;
  let interrupted;
  const onSignal = () => interrupted?.(new Error('Native test interrupted'));
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  try {
    await Promise.all([fs.mkdir(workspace), fs.mkdir(path.join(userData, 'User'), { recursive: true }), fs.mkdir(extensions)]);
    await fs.writeFile(
      path.join(userData, 'User/settings.json'),
      JSON.stringify({
        'files.autoSave': 'off',
        'workbench.startupEditor': 'none',
        'window.restoreWindows': 'none',
        'extensions.autoUpdate': false,
        'extensions.autoCheckUpdates': false,
        'telemetry.telemetryLevel': 'off',
        'security.workspace.trust.enabled': false,
      })
    );
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
      if (/^(VSCODE_|ELECTRON_|NODE_OPTIONS$|NODE_INSPECT_RESUME_ON_START$)/i.test(key)) {
        delete env[key];
      }
    }
    Object.assign(env, {
      MAPPER_NATIVE_TEST_ELECTRON: electron,
      MAPPER_NATIVE_PLAYWRIGHT: playwright,
      MAPPER_NATIVE_XML_PARSER: xmlParser,
      MAPPER_NATIVE_CODE: executable,
      MAPPER_NATIVE_WORKSPACE: workspace,
      MAPPER_NATIVE_USER_DATA: userData,
      MAPPER_NATIVE_EXTENSIONS: extensions,
      MAPPER_NATIVE_ROOT: root,
    });
    console.log(`Native executable: ${executable}\nIsolated artifacts: ${root}`);
    child = fork(__filename, ['--host'], { env, stdio: ['ignore', 'pipe', 'pipe', 'ipc'], detached: process.platform !== 'win32' });
    const output = [];
    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', (chunk) => {
        output.push(chunk.toString());
        process.stdout.write(chunk);
      });
    }
    await new Promise((resolve, reject) => {
      interrupted = reject;
      deadline = setTimeout(() => reject(new Error('Native test exceeded 120 seconds')), 120_000);
      child.once('error', reject);
      child.once('exit', (code) => reject(new Error(`Native runner exited before reporting: ${code}`)));
      child.once('message', (result) => (result.ok ? resolve() : reject(new Error(result.error))));
    }).catch(async (error) => {
      await fs.writeFile(path.join(root, 'runner.log'), output.join(''));
      throw error;
    });
    const report = JSON.parse(await fs.readFile(path.join(root, 'result.json'), 'utf8'));
    assert.equal(report.status, 'passed');
    console.log(`Native assertions: ${JSON.stringify(report)}\nRuntime: ${((Date.now() - started) / 1000).toFixed(1)}s`);
  } finally {
    clearTimeout(deadline);
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    try {
      await stopOwnedChild(child);
      await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
      console.log(`Removed isolated workspace, profiles, logs and artifacts: ${root}`);
    } catch (error) {
      console.error(`Native cleanup incomplete; isolated artifacts retained: ${root}`);
      throw error;
    }
  }
}

module.exports = { stopOwnedChild };

if (require.main === module) {
  if (process.argv.includes('--host')) {
    host().catch((error) => {
      console.error(error);
      process.exitCode = 1;
      process.disconnect();
    });
  } else {
    main().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  }
}
