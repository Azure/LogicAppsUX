import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  type CachedExtensionEntry,
  type OwnedMsnShutdownHost,
  assertOwnedMsnHandleScopes,
  findLoadedCachedExtensionEntry,
  teardownOwnedMsnHost,
} from './ownedMsnShutdown';

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
    const selectEntry = (selected: CachedExtensionEntry) => ({ cacheKey: canonicalMain, entry: selected });
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
      cachedEntry: () => selectEntry(entry),
    };
    const ownedHandles = {
      tasks: [{ workspacePath: app, name: 'func: host start' }],
      session: { workspacePath: app, invocation: 'current-msn-control' },
    };
    assertOwnedMsnHandleScopes(host, 'current-msn-control', ownedHandles);
    for (const handles of [
      { ...ownedHandles, tasks: [{ workspacePath: outside, name: 'func: host start' }] },
      { ...ownedHandles, tasks: [{ workspacePath: prefixSibling, name: 'func: host start' }] },
      { ...ownedHandles, tasks: [{ workspacePath: undefined, name: 'func: host start' }] },
      { ...ownedHandles, tasks: [{ workspacePath: app, name: 'foreign-task' }] },
      { ...ownedHandles, session: { workspacePath: outside, invocation: 'current-msn-control' } },
      { ...ownedHandles, session: { workspacePath: app, invocation: 'earlier-msn-control' } },
    ]) {
      assert.throws(() => assertOwnedMsnHandleScopes(host, 'current-msn-control', handles), /foreign MSN/);
    }
    assert.throws(() => assertOwnedMsnHandleScopes({ ...host, dedicatedMsnRunHost: false }, 'current-msn-control', ownedHandles));
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

    sequence.length = 0;
    await teardownOwnedMsnHost(
      host,
      [
        async () => {
          sequence.push('panels');
        },
      ],
      {
        capture: async () => {
          sequence.push('capture-process-identities');
        },
        finalize: async () => {
          sequence.push('observe-owned-process-exit');
        },
      }
    );
    assert.deepStrictEqual(sequence, ['capture-process-identities', 'panels', 'deactivate', 'deactivate', 'observe-owned-process-exit']);
    assert.ok(fs.existsSync(root), 'Process observation success must not manufacture root absence');
    for (const failedStage of ['capture', 'finalize']) {
      sequence.length = 0;
      const observationError = new Error(`process-${failedStage}-control`);
      await assert.rejects(
        teardownOwnedMsnHost(
          host,
          [
            async () => {
              sequence.push('panels');
            },
          ],
          {
            capture: async () => {
              sequence.push('capture-process-identities');
              if (failedStage === 'capture') {
                throw observationError;
              }
            },
            finalize: async () => {
              sequence.push('observe-owned-process-exit');
              if (failedStage === 'finalize') {
                throw observationError;
              }
            },
          }
        ),
        (error: AggregateError) => {
          assert.deepStrictEqual(error.errors, [observationError]);
          return true;
        }
      );
      assert.deepStrictEqual(sequence, [
        'capture-process-identities',
        'panels',
        'deactivate',
        'deactivate',
        ...(failedStage === 'finalize' ? ['observe-owned-process-exit'] : []),
      ]);
    }

    const panelFailure = new Error('combined-panel-control');
    const shutdownFailure = new Error('combined-deactivation-control');
    const processFailure = new Error('combined-process-finalization-control');
    let finalizationCalls = 0;
    const combinedEntry: CachedExtensionEntry = {
      ...entry,
      exports: {
        activate: exports.activate,
        deactivate: async () => {
          throw shutdownFailure;
        },
      },
    };
    await assert.rejects(
      teardownOwnedMsnHost(
        { ...host, cachedEntry: () => selectEntry(combinedEntry) },
        [
          async () => {
            throw panelFailure;
          },
        ],
        {
          capture: async () => undefined,
          finalize: async () => {
            finalizationCalls++;
            throw processFailure;
          },
        }
      ),
      (error: AggregateError) => {
        assert.deepStrictEqual(error.errors, [panelFailure, shutdownFailure, processFailure]);
        return true;
      }
    );
    assert.strictEqual(finalizationCalls, 1, 'Earlier errors must not skip or retry captured-process finalization');

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
      { host: { ...host, cachedEntry: () => ({ cacheKey: canonicalMain, entry: undefined }) }, reason: /already-loaded original/ },
      { host: { ...host, cachedEntry: () => ({ cacheKey: other, entry }) }, reason: /selected cache key/ },
      { host: { ...host, cachedEntry: () => selectEntry({ ...entry, loaded: false }) }, reason: /already-loaded original/ },
      { host: { ...host, cachedEntry: () => selectEntry({ ...entry, filename: other }) }, reason: /entry identity/ },
      { host: { ...host, cachedEntry: () => selectEntry({ ...entry, id: other }) }, reason: /entry identity/ },
      {
        host: { ...host, cachedEntry: () => selectEntry({ ...entry, exports: { activate: exports.activate } }) },
        reason: /original lifecycle/,
      },
      { host: { ...host, cachedEntry: () => selectEntry({ ...entry, exports: Object.create(exports) }) }, reason: /original lifecycle/ },
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
      teardownOwnedMsnHost({ ...host, cachedEntry: () => selectEntry(failingEntry) }, [
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
      teardownOwnedMsnHost({ ...host, cachedEntry: () => selectEntry(changedEntry) }, [
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
        teardownOwnedMsnHost({ ...host, cachedEntry: () => selectEntry(mutableEntry) }, [
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
      mutableHost.cachedEntry = () => selectEntry(mutableEntry);
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
    await assert.rejects(teardownOwnedMsnHost({ ...host, cachedEntry: () => selectEntry(repeatEntry) }, []), (error: AggregateError) => {
      assert.deepStrictEqual(error.errors, [repeatError]);
      return true;
    });
    assert.strictEqual(calls, 2, 'Repeated shutdown failure must not be retried or accepted');

    const runtimeMain = path.join(extensionRoot, 'runtime-entry.js');
    fs.writeFileSync(
      runtimeMain,
      'exports.activate = () => undefined; exports.calls = 0; exports.deactivate = () => { exports.calls++; };'
    );
    const loadedKey = process.platform === 'win32' ? runtimeMain[0].toLowerCase() + runtimeMain.slice(1) : runtimeMain;
    const lookupPath = process.platform === 'win32' ? runtimeMain[0].toUpperCase() + runtimeMain.slice(1) : runtimeMain;
    const runtimeExports: unknown = require(loadedKey);
    const resolvedRuntime = require.resolve(lookupPath);
    const runtimeEntry = require.cache[require.resolve(loadedKey)];
    assert.ok(runtimeEntry?.loaded);
    if (process.platform === 'win32') {
      assert.notStrictEqual(
        require.resolve(loadedKey),
        resolvedRuntime,
        'The actual Windows control must use differing drive-key spelling'
      );
      assert.strictEqual(require.cache[resolvedRuntime], undefined, 'The exact differing-case cache lookup must miss');
    }
    const runtimeHost: OwnedMsnShutdownHost = {
      ...host,
      extension: { ...host.extension, main: './runtime-entry.js' },
      resolveEntry: () => resolvedRuntime,
      cachedEntry: (filename) => findLoadedCachedExtensionEntry(filename, require.cache),
    };
    try {
      await teardownOwnedMsnHost(runtimeHost, []);
      assert.ok(typeof runtimeExports === 'object' && runtimeExports !== null && 'calls' in runtimeExports);
      assert.strictEqual(runtimeExports.calls, 2, 'Only the real already-loaded original module must be called twice');
      const aliasKey =
        process.platform === 'win32'
          ? resolvedRuntime[0].toLowerCase() + resolvedRuntime.slice(1)
          : `${path.dirname(resolvedRuntime)}${path.sep}.${path.sep}${path.basename(resolvedRuntime)}`;
      assert.notStrictEqual(aliasKey, resolvedRuntime);
      const ambiguous: Record<string, CachedExtensionEntry | undefined> = {
        [resolvedRuntime]: runtimeEntry,
        [aliasKey]: runtimeEntry,
      };
      await assert.rejects(
        teardownOwnedMsnHost({ ...runtimeHost, cachedEntry: (filename) => findLoadedCachedExtensionEntry(filename, ambiguous) }, []),
        /unambiguous original/
      );
      assert.strictEqual(runtimeExports.calls, 2, 'An exact key must not override a matching alias');
      for (const mutation of ['add-alias', 'replace-key', 'replace-object']) {
        const mutableCache: Record<string, CachedExtensionEntry | undefined> = { [resolvedRuntime]: runtimeEntry };
        await assert.rejects(
          teardownOwnedMsnHost({ ...runtimeHost, cachedEntry: (filename) => findLoadedCachedExtensionEntry(filename, mutableCache) }, [
            async () => {
              if (mutation === 'replace-key') {
                delete mutableCache[resolvedRuntime];
                mutableCache[aliasKey] = runtimeEntry;
              } else if (mutation === 'add-alias') {
                mutableCache[aliasKey] = runtimeEntry;
              } else {
                mutableCache[resolvedRuntime] = { ...runtimeEntry };
              }
            },
          ]),
          /teardown failed/
        );
        assert.strictEqual(runtimeExports.calls, 2, 'Changed cache key, inventory or object must prevent any deactivation');
      }
      for (const mutation of ['add-alias', 'replace-key', 'replace-object']) {
        for (const mutationCall of [1, 2]) {
          let shutdownCalls = 0;
          const mutableCache: Record<string, CachedExtensionEntry | undefined> = {};
          const mutableEntry: CachedExtensionEntry = {
            ...runtimeEntry,
            exports: {
              activate: exports.activate,
              deactivate: () => {
                shutdownCalls++;
                if (shutdownCalls === mutationCall) {
                  if (mutation === 'add-alias') {
                    mutableCache[aliasKey] = mutableEntry;
                  } else if (mutation === 'replace-key') {
                    delete mutableCache[resolvedRuntime];
                    mutableCache[aliasKey] = mutableEntry;
                  } else {
                    mutableCache[resolvedRuntime] = { ...mutableEntry };
                  }
                }
              },
            },
          };
          mutableCache[resolvedRuntime] = mutableEntry;
          await assert.rejects(
            teardownOwnedMsnHost({ ...runtimeHost, cachedEntry: (filename) => findLoadedCachedExtensionEntry(filename, mutableCache) }, []),
            /teardown failed/
          );
          assert.strictEqual(shutdownCalls, mutationCall, 'A cache mutation during either shutdown must remain fatal without retry');
        }
      }
    } finally {
      delete require.cache[require.resolve(loadedKey)];
    }
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
