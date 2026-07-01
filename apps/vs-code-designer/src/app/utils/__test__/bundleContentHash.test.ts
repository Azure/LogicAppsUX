/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fse from 'fs-extra';
import * as path from 'path';
import { computeBundleContentHash } from '../bundleFeed';
import { bundleSourceMd5SidecarFile } from '../../../constants';

// Override the global fs-extra mock from test-setup.ts with the real module so
// these tests can actually create/read files on disk.
vi.mock('fs-extra', async () => {
  const actual = await vi.importActual<typeof import('fs-extra')>('fs-extra');
  return actual;
});

// Resolve a real tmpdir without going through the globally-mocked `os` module.
const realOs = (await vi.importActual<typeof import('os')>('os')) as typeof import('os');

vi.mock('../../../extensionVariables', () => ({
  ext: { outputChannel: { appendLog: vi.fn(), show: vi.fn() }, telemetryReporter: { sendTelemetryEvent: vi.fn() } },
}));
vi.mock('../../localize', () => ({ localize: vi.fn((_key: string, defaultValue: string) => defaultValue) }));

describe('computeBundleContentHash', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fse.mkdtemp(path.join(realOs.tmpdir(), 'la-bundle-hash-'));
  });

  afterEach(async () => {
    await fse.remove(tmpDir).catch(() => undefined);
  });

  it('returns undefined for a non-existent directory', async () => {
    const result = await computeBundleContentHash(path.join(tmpDir, 'does-not-exist'));
    expect(result).toBeUndefined();
  });

  it('is deterministic across repeated calls over the same tree', async () => {
    await fse.outputFile(path.join(tmpDir, 'a.txt'), 'alpha');
    await fse.outputFile(path.join(tmpDir, 'sub', 'b.bin'), Buffer.from([0, 1, 2, 3]));
    const h1 = await computeBundleContentHash(tmpDir);
    const h2 = await computeBundleContentHash(tmpDir);
    expect(h1).toBeDefined();
    expect(h1).toBe(h2);
  });

  it('matches the E2E preflight hash contract', async () => {
    await fse.outputFile(path.join(tmpDir, 'a.txt'), 'alpha');
    await fse.outputFile(path.join(tmpDir, 'sub', 'b.bin'), Buffer.from([0, 1, 2, 3]));
    await fse.outputFile(path.join(tmpDir, bundleSourceMd5SidecarFile), JSON.stringify({ version: 1, sourceMd5: 'x', contentHash: 'y' }));

    // Contract shared with run-e2e.js and bundleRepair.test.ts:
    // sorted POSIX relative path, NUL, file size, NUL, file bytes, NUL;
    // sidecar excluded; digest is base64 SHA-256.
    await expect(computeBundleContentHash(tmpDir)).resolves.toBe('NCnH5Zy1riTeL6oGcO8/SmGZodVJojldZ8auMRwr2EM=');
  });

  it('changes when a single byte in a file is mutated', async () => {
    await fse.outputFile(path.join(tmpDir, 'file.txt'), 'hello');
    const before = await computeBundleContentHash(tmpDir);
    await fse.outputFile(path.join(tmpDir, 'file.txt'), 'hellp'); // last char changed
    const after = await computeBundleContentHash(tmpDir);
    expect(before).not.toBe(after);
  });

  it('changes when a file is added', async () => {
    await fse.outputFile(path.join(tmpDir, 'one.txt'), 'one');
    const before = await computeBundleContentHash(tmpDir);
    await fse.outputFile(path.join(tmpDir, 'two.txt'), 'two');
    const after = await computeBundleContentHash(tmpDir);
    expect(before).not.toBe(after);
  });

  it('changes when a file is removed', async () => {
    await fse.outputFile(path.join(tmpDir, 'one.txt'), 'one');
    await fse.outputFile(path.join(tmpDir, 'two.txt'), 'two');
    const before = await computeBundleContentHash(tmpDir);
    await fse.remove(path.join(tmpDir, 'two.txt'));
    const after = await computeBundleContentHash(tmpDir);
    expect(before).not.toBe(after);
  });

  it('excludes the sidecar file itself from the hash', async () => {
    await fse.outputFile(path.join(tmpDir, 'a.txt'), 'alpha');
    const without = await computeBundleContentHash(tmpDir);
    await fse.outputFile(path.join(tmpDir, bundleSourceMd5SidecarFile), JSON.stringify({ version: 1, sourceMd5: 'x', contentHash: 'y' }));
    const withSidecar = await computeBundleContentHash(tmpDir);
    expect(without).toBe(withSidecar);
  });

  it('is path-sensitive: same bytes under different relative paths produce different hashes', async () => {
    await fse.outputFile(path.join(tmpDir, 'a', 'file.txt'), 'same-bytes');
    const h1 = await computeBundleContentHash(tmpDir);
    await fse.remove(path.join(tmpDir, 'a'));
    await fse.outputFile(path.join(tmpDir, 'b', 'file.txt'), 'same-bytes');
    const h2 = await computeBundleContentHash(tmpDir);
    expect(h1).not.toBe(h2);
  });
});
