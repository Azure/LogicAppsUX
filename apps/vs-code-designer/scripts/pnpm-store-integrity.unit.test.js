#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global console, require */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { _test } = require('./pnpm-store-integrity');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pnpm-store-integrity-'));
try {
  const store = path.join(root, 'store');
  const manifest = path.join(store, '.logicappsux-store-manifest.json');
  fs.mkdirSync(path.join(store, 'v11', 'files'), { recursive: true });
  fs.mkdirSync(path.join(store, 'v11', 'projects', 'checkout-state'), { recursive: true });
  fs.writeFileSync(path.join(store, 'v11', 'projects', 'checkout-state', 'metadata.json'), '{}');
  fs.writeFileSync(path.join(store, 'v11', 'files', 'package-a'), 'package-a');
  fs.writeFileSync(path.join(store, 'v11', 'files', 'package-b'), 'package-b');

  assert.equal(_test.pruneVolatileMetadata(store), 1);
  assert.ok(!fs.existsSync(path.join(store, 'v11', 'projects')));
  const written = _test.writeManifest(store, manifest);
  assert.equal(written.schemaVersion, 1);
  assert.deepEqual(
    written.files.map((file) => file.path),
    ['v11/files/package-a', 'v11/files/package-b']
  );
  assert.deepEqual(_test.verifyManifest(store, manifest), written.files);

  fs.writeFileSync(path.join(store, 'v11', 'files', 'package-a'), 'mutated');
  assert.throws(() => _test.verifyManifest(store, manifest), /manifest mismatch/);
  fs.writeFileSync(path.join(store, 'v11', 'files', 'package-a'), 'package-a');
  _test.writeManifest(store, manifest);

  fs.writeFileSync(path.join(store, 'v11', 'files', 'unexpected'), 'unexpected');
  assert.throws(() => _test.verifyManifest(store, manifest), /manifest mismatch/);
  assert.throws(() => _test.writeManifest(store, path.join(root, 'outside.json')), /inside the store root/);
  const resolved = _test.resolveStoreAndManifest(store, manifest);
  assert.equal(resolved.store, fs.realpathSync.native(store));
  assert.equal(resolved.manifest, path.join(fs.realpathSync.native(store), '.logicappsux-store-manifest.json'));
  console.log('pnpm store integrity tests passed.');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
