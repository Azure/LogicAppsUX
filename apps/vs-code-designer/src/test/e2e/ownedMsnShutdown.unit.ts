import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { type CachedExtensionEntry, type OwnedMsnShutdownHost, teardownOwnedMsnHost } from './ownedMsnShutdown';

async function run(): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-e2e-cli-msn-weather-lifecycle-'));
  const extensionRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'la-msn-shutdown-extension-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'la-msn-shutdown-unowned-'));
  const prefixSibling = `${root}-foreign`;
  fs.mkdirSync(prefixSibling);
  try {
    const app = path.join(root, 'workspace', 'app');
    fs.mkdirSync(app, { recursive: true });
    const main = path.join(extensionRoot, 'main.js');
    const other = path.join(extensionRoot, 'other.js');
    fs.writeFileSync(main, '');
    fs.writeFileSync(other, '');
    const canonicalMain = fs.realpathSync(main);
    const sequence: string[] = [];
    const exports = {
      activate: () => undefined,
      deactivate: async () => {
        sequence.push('deactivate');
      },
    };
    const entry: CachedExtensionEntry = { id: canonicalMain, filename: canonicalMain, loaded: true, exports };
    const host: OwnedMsnShutdownHost = {
      dedicatedMsnRunHost: true,
      extension: {
        id: 'ms-azuretools.vscode-azurelogicapps',
        isActive: true,
        extensionPath: extensionRoot,
        main: './main.js',
      },
      workspaceParent: root,
      workspaceRoots: [app],
      resolveEntry: (filename) => filename,
      cachedEntry: () => entry,
    };
    await teardownOwnedMsnHost(host, [
      async () => {
        sequence.push('panels');
      },
      async () => {
        sequence.push('debug-and-tasks');
      },
    ]);
    assert.deepStrictEqual(sequence, ['panels', 'debug-and-tasks', 'deactivate', 'deactivate']);
    assert.ok(fs.existsSync(root), 'Awaited deactivation must not manufacture filesystem cleanup success');

    const rejectedHosts: { host: OwnedMsnShutdownHost; reason: RegExp }[] = [
      { host: { ...host, dedicatedMsnRunHost: false }, reason: /dedicated run-phase/ },
      { host: { ...host, extension: { ...host.extension, isActive: false } }, reason: /active Logic Apps/ },
      { host: { ...host, extension: { ...host.extension, id: 'other.extension' } }, reason: /active Logic Apps/ },
      { host: { ...host, workspaceRoots: [] }, reason: /requires workspace roots/ },
      { host: { ...host, workspaceRoots: [root] }, reason: /escapes the runner-owned/ },
      { host: { ...host, workspaceRoots: [app, outside] }, reason: /escapes the runner-owned/ },
      { host: { ...host, workspaceRoots: [prefixSibling] }, reason: /escapes the runner-owned/ },
      { host: { ...host, extension: { ...host.extension, main: '../foreign.js' } }, reason: /main escapes/ },
      { host: { ...host, extension: { ...host.extension, main } }, reason: /extension-relative main/ },
      { host: { ...host, resolveEntry: () => other }, reason: /does not match the configured/ },
      { host: { ...host, cachedEntry: () => undefined }, reason: /already-loaded original/ },
      { host: { ...host, cachedEntry: () => ({ ...entry, loaded: false }) }, reason: /already-loaded original/ },
      { host: { ...host, cachedEntry: () => ({ ...entry, filename: other }) }, reason: /entry identity/ },
      { host: { ...host, cachedEntry: () => ({ ...entry, id: other }) }, reason: /entry identity/ },
      { host: { ...host, cachedEntry: () => ({ ...entry, exports: { activate: exports.activate } }) }, reason: /original lifecycle/ },
      { host: { ...host, cachedEntry: () => ({ ...entry, exports: Object.create(exports) }) }, reason: /original lifecycle/ },
    ];
    for (const control of rejectedHosts) {
      sequence.length = 0;
      await assert.rejects(
        teardownOwnedMsnHost(control.host, [
          async () => {
            sequence.push('unsafe-teardown');
          },
        ]),
        control.reason
      );
      assert.deepStrictEqual(sequence, [], 'Rejected ownership/cache identity must not execute teardown or deactivation');
    }
    const escapedRoot = path.join(root, 'linked-outside');
    fs.symlinkSync(outside, escapedRoot, process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(teardownOwnedMsnHost({ ...host, workspaceRoots: [escapedRoot] }, []), /escapes the runner-owned/);
    fs.unlinkSync(escapedRoot);
    const linkedMain = path.join(extensionRoot, 'linked-entry');
    fs.writeFileSync(path.join(outside, 'main.js'), '');
    fs.symlinkSync(outside, linkedMain, process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(
      teardownOwnedMsnHost({ ...host, extension: { ...host.extension, main: './linked-entry/main.js' } }, []),
      /resolves outside the extension/
    );
    fs.unlinkSync(linkedMain);

    sequence.length = 0;
    const teardownError = new Error('panel-teardown-control');
    await assert.rejects(
      teardownOwnedMsnHost(host, [
        async () => {
          sequence.push('panels');
          throw teardownError;
        },
        async () => {
          sequence.push('debug-and-tasks');
        },
      ]),
      (error: AggregateError) => {
        assert.deepStrictEqual(error.errors, [teardownError]);
        return true;
      }
    );
    assert.deepStrictEqual(sequence, ['panels', 'debug-and-tasks', 'deactivate', 'deactivate']);

    sequence.length = 0;
    const deactivationError = new Error('deactivation-control');
    const failingEntry: CachedExtensionEntry = {
      ...entry,
      exports: {
        activate: exports.activate,
        deactivate: async () => {
          sequence.push('failed-deactivate');
          throw deactivationError;
        },
      },
    };
    await assert.rejects(
      teardownOwnedMsnHost({ ...host, cachedEntry: () => failingEntry }, [
        async () => {
          throw teardownError;
        },
      ]),
      (error: AggregateError) => {
        assert.deepStrictEqual(error.errors, [teardownError, deactivationError]);
        return true;
      }
    );
    assert.deepStrictEqual(sequence, ['failed-deactivate'], 'A failed deactivation is not retried or accepted');

    let changedEntry = entry;
    await assert.rejects(
      teardownOwnedMsnHost({ ...host, cachedEntry: () => changedEntry }, [
        async () => {
          changedEntry = { ...entry };
        },
      ]),
      /teardown failed/
    );
    assert.deepStrictEqual(sequence, ['failed-deactivate'], 'Cache replacement must not invoke any replacement export');
    for (const replacement of ['exports', 'deactivate', 'activate', 'filename', 'id', 'loaded']) {
      const original = {
        activate: exports.activate,
        deactivate: exports.deactivate,
      };
      const mutableEntry: CachedExtensionEntry = { ...entry, exports: original };
      sequence.length = 0;
      await assert.rejects(
        teardownOwnedMsnHost({ ...host, cachedEntry: () => mutableEntry }, [
          async () => {
            if (replacement === 'exports') {
              mutableEntry.exports = { ...original };
            } else if (replacement === 'deactivate') {
              original.deactivate = async () => {
                sequence.push('replacement-deactivate');
              };
            } else if (replacement === 'activate') {
              original.activate = () => undefined;
            } else if (replacement === 'filename') {
              mutableEntry.filename = other;
            } else if (replacement === 'id') {
              mutableEntry.id = other;
            } else {
              mutableEntry.loaded = false;
            }
          },
        ]),
        /teardown failed/
      );
      assert.deepStrictEqual(sequence, [], 'Changed lifecycle identity must fail before calling any export');
    }
    for (const mutation of ['workspaceRoots', 'workspaceParent', 'dedicatedMsnRunHost', 'isActive', 'main', 'extensionPath']) {
      const mutableHost: OwnedMsnShutdownHost = { ...host, extension: { ...host.extension } };
      sequence.length = 0;
      await assert.rejects(
        teardownOwnedMsnHost(mutableHost, [
          async () => {
            if (mutation === 'workspaceRoots') {
              mutableHost.workspaceRoots = [app, outside];
            } else if (mutation === 'workspaceParent') {
              mutableHost.workspaceParent = outside;
            } else if (mutation === 'dedicatedMsnRunHost') {
              mutableHost.dedicatedMsnRunHost = false;
            } else if (mutation === 'isActive') {
              mutableHost.extension.isActive = false;
            } else if (mutation === 'main') {
              mutableHost.extension.main = './other.js';
            } else {
              mutableHost.extension.extensionPath = outside;
            }
          },
        ]),
        (error: AggregateError) => {
          assert.strictEqual(error.errors.length, 1);
          assert.ok(error.errors[0] instanceof assert.AssertionError);
          return true;
        }
      );
      assert.deepStrictEqual(sequence, [], 'Changed live host ownership must fail before deactivation');
    }
    for (const mutation of ['workspaceRoots', 'exports']) {
      let shutdownCalls = 0;
      const mutableHost: OwnedMsnShutdownHost = { ...host, extension: { ...host.extension } };
      const mutableEntry: CachedExtensionEntry = {
        ...entry,
        exports: {
          activate: exports.activate,
          deactivate: async () => {
            shutdownCalls++;
            if (mutation === 'workspaceRoots') {
              mutableHost.workspaceRoots = [outside];
            } else {
              mutableEntry.exports = { ...exports };
            }
          },
        },
      };
      mutableHost.cachedEntry = () => mutableEntry;
      await assert.rejects(teardownOwnedMsnHost(mutableHost, []), (error: AggregateError) => {
        assert.strictEqual(error.errors.length, 1);
        assert.ok(error.errors[0] instanceof assert.AssertionError);
        return true;
      });
      assert.strictEqual(shutdownCalls, 1, 'Changed ownership or exports must prevent repeated shutdown');
    }
    let calls = 0;
    const repeatError = new Error('repeated-shutdown-control');
    const repeatEntry: CachedExtensionEntry = {
      ...entry,
      exports: {
        activate: exports.activate,
        deactivate: async () => {
          calls++;
          if (calls === 2) {
            throw repeatError;
          }
        },
      },
    };
    await assert.rejects(teardownOwnedMsnHost({ ...host, cachedEntry: () => repeatEntry }, []), (error: AggregateError) => {
      assert.deepStrictEqual(error.errors, [repeatError]);
      return true;
    });
    assert.strictEqual(calls, 2, 'Repeated shutdown failure must not be retried or accepted');
    console.log('[ownedMsnShutdown.unit] all tests passed');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(extensionRoot, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
    fs.rmSync(prefixSibling, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
