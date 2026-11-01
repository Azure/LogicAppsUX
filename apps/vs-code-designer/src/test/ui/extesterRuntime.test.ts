import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vm from 'vm';
import { getExTesterCliEnvironment, resolveCachedExTesterRuntime } from './extesterRuntime';

describe('ExTester cached runtime controls (no downloads or native launch)', () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-extester-runtime-controls-'));
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  function write(relative: string): string {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '');
    return file;
  }

  for (const arch of ['x64', 'arm64']) {
    it(`resolves the owned Windows ${arch} cache and legacy CLI`, () => {
      const folder = `VSCode-win32-${arch}-archive`;
      const executable = write(`${folder}/Code.exe`);
      const cli = write(`${folder}/resources/app/out/cli.js`);
      const runtime = resolveCachedExTesterRuntime(root, 'win32', arch);
      assert.strictEqual(runtime.codeFolder, path.join(root, folder));
      assert.strictEqual(runtime.executablePath, executable);
      assert.strictEqual(runtime.cliPath, cli);
      assert.strictEqual(runtime.cliBase, `set "ELECTRON_RUN_AS_NODE=1" && "${executable}" "${cli}"`);
    });
  }

  it('resolves one nested Windows archive CLI', () => {
    write('VSCode-win32-x64-archive/Code.exe');
    const cli = write('VSCode-win32-x64-archive/0123456789/resources/app/out/cli.js');
    assert.strictEqual(resolveCachedExTesterRuntime(root, 'win32', 'x64').cliPath, cli);
  });

  it('rejects ambiguous nested Windows CLIs instead of choosing a random runtime', () => {
    write('VSCode-win32-x64-archive/Code.exe');
    write('VSCode-win32-x64-archive/0123456789/resources/app/out/cli.js');
    write('VSCode-win32-x64-archive/abcdef0123/resources/app/out/cli.js');
    assert.throws(() => resolveCachedExTesterRuntime(root, 'win32', 'x64'), /ambiguous.*2 nested candidates/);
  });

  it('prefers the legacy Windows CLI when a nested cache is also present', () => {
    write('VSCode-win32-x64-archive/Code.exe');
    const cli = write('VSCode-win32-x64-archive/resources/app/out/cli.js');
    write('VSCode-win32-x64-archive/0123456789/resources/app/out/cli.js');
    assert.strictEqual(resolveCachedExTesterRuntime(root, 'win32', 'x64').cliPath, cli);
  });

  for (const arch of ['x64', 'arm64']) {
    it(`resolves the owned Linux ${arch} cache`, () => {
      const executable = write(`VSCode-linux-${arch}/code`);
      const cli = write(`VSCode-linux-${arch}/resources/app/out/cli.js`);
      const runtime = resolveCachedExTesterRuntime(root, 'linux', arch);
      assert.strictEqual(runtime.executablePath, executable);
      assert.strictEqual(runtime.cliPath, cli);
      assert.strictEqual(runtime.cliBase, `ELECTRON_RUN_AS_NODE=1 "${executable}" "${cli}"`);
    });
  }

  it('resolves the universal macOS cache independently of host architecture', () => {
    const executable = write('Visual Studio Code.app/Contents/MacOS/Electron');
    const cli = write('Visual Studio Code.app/Contents/Resources/app/out/cli.js');
    const runtime = resolveCachedExTesterRuntime(root, 'darwin', 'arm64');
    assert.strictEqual(runtime.executablePath, executable);
    assert.strictEqual(runtime.cliPath, cli);
  });

  it('rejects a missing executable without invoking a downloader', () => {
    assert.throws(() => resolveCachedExTesterRuntime(root, 'linux', 'x64'), /executable not found/);
  });

  it('rejects a missing CLI without substituting another cache', () => {
    write('VSCode-linux-x64/code');
    assert.throws(() => resolveCachedExTesterRuntime(root, 'linux', 'x64'), /CLI not found/);
  });

  it('rejects a missing nested Windows CLI', () => {
    write('VSCode-win32-x64-archive/Code.exe');
    assert.throws(() => resolveCachedExTesterRuntime(root, 'win32', 'x64'), /0 nested candidates/);
  });

  it('rejects unsupported platforms and Windows architectures', () => {
    assert.throws(() => resolveCachedExTesterRuntime(root, 'freebsd', 'x64'), /Unsupported ExTester platform/);
    assert.throws(() => resolveCachedExTesterRuntime(root, 'win32', 'ia32'), /Unsupported ExTester Windows architecture/);
  });

  it('sanitizes the CLI environment without mutating the owner environment', () => {
    const env = { NODE_OPTIONS: '--inspect', NODE_EXTRA_CA_CERTS: 'private-ca', PATH: 'owned-path', HTTPS_PROXY: 'proxy' };
    assert.deepStrictEqual(getExTesterCliEnvironment(env), { PATH: 'owned-path', HTTPS_PROXY: 'proxy' });
    assert.strictEqual(env.NODE_OPTIONS, '--inspect');
  });

  it('seeded consumers retain normal Code and ChromeDriver asset setup without cache preparation', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../src/test/ui/run-e2e.ts'), 'utf8');
    const assetStep = source.slice(source.indexOf('// Step 1: Download'), source.indexOf('// Step 2: Install'));
    assert.ok(assetStep.includes('await downloadExTesterAssets();'));
    assert.ok(!assetStep.includes('if (explicitPreparedSeed)'), 'A supplied seed must not skip ChromeDriver setup');
    const assetSetup = source.slice(
      source.indexOf('async function downloadExTesterAssets'),
      source.indexOf('function rebuildExtensionsJson')
    );
    assert.ok(assetSetup.includes('downloadTester.downloadCode(VSCODE_VERSION)'));
    assert.ok(assetSetup.includes('createExTester().downloadChromeDriver(VSCODE_VERSION)'));
    assert.ok(!source.includes('vscode-dependency-preparation'));
    assert.ok(!source.includes('prepareInstallation'));
    assert.ok(!source.includes('.code.getCodeFolder'), 'No private ExTester CodeUtil access');
  });

  it('passes the owned cache to the phase worker using only public ExTester methods', async () => {
    const inputPath = path.join(root, 'input.json');
    const input = {
      storageFolder: path.join(root, 'owned cache'),
      extensionsDir: path.join(root, 'extensions'),
      files: ['suite-owned-test.js'],
      options: { vscodeVersion: '1.108.0', offline: true },
      resultPath: path.join(root, 'result.json'),
    };
    fs.writeFileSync(inputPath, JSON.stringify(input));
    const calls: unknown[][] = [];
    class PublicExTester {
      // Deliberately no `code` member: private runtime introspection must fail.
      constructor(storageFolder: string, releaseType: undefined, extensionsDir: string) {
        calls.push([storageFolder, releaseType, extensionsDir]);
      }
      async runTests(files: string[], options: unknown): Promise<number> {
        calls.push([files, options]);
        return 0;
      }
    }
    const workerProcess: { argv: string[]; exitCode?: number } = { argv: ['node', 'worker', inputPath] };
    vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../../scripts/vscode-extester-phase.js'), 'utf8'), {
      process: workerProcess,
      console,
      require(id: string): unknown {
        if (id === 'node:fs') {
          return fs;
        }
        assert.strictEqual(id, 'vscode-extension-tester');
        return { ExTester: PublicExTester };
      },
    });
    await Promise.resolve();
    assert.deepStrictEqual(calls[0], [input.storageFolder, undefined, input.extensionsDir]);
    // Worker JSON is parsed in another VM realm; compare its serialized value,
    // not the prototypes of otherwise identical arrays and option objects.
    assert.strictEqual(JSON.stringify(calls[1]), JSON.stringify([input.files, input.options]));
    assert.strictEqual(workerProcess.exitCode, 0);
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(input.resultPath, 'utf8')), { functionalExitCode: 0 });
  });
});
