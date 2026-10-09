#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global Buffer, console, module, process, require */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SCHEMA_VERSION = 1;

function main(args = process.argv.slice(2)) {
  const [command, ...rest] = args;
  const options = parseArgs(rest);
  if (command === 'write') {
    writeManifest(options.store, options.manifest);
    return;
  }
  if (command === 'verify') {
    verifyManifest(options.store, options.manifest);
    return;
  }
  if (command === 'prune') {
    pruneVolatileMetadata(options.store);
    return;
  }
  throw new Error('Usage: pnpm-store-integrity.js <write|verify|prune> --store <path> [--manifest <path>]');
}

function writeManifest(storeRoot, manifestPath) {
  const store = requireDirectory(storeRoot, 'pnpm store');
  const manifest = path.resolve(requireValue(manifestPath, '--manifest'));
  assertManifestInsideStore(store, manifest);
  const value = {
    schemaVersion: SCHEMA_VERSION,
    files: collectStoreFiles(store, manifest),
  };
  fs.mkdirSync(path.dirname(manifest), { recursive: true });
  const temporary = path.join(path.dirname(store), `.logicappsux-store-manifest.${process.pid}.tmp`);
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value)}\n`);
    fs.rmSync(manifest, { force: true });
    fs.renameSync(temporary, manifest);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
  console.log(`Wrote pnpm store integrity manifest with ${value.files.length} files.`);
  return value;
}

function verifyManifest(storeRoot, manifestPath) {
  const store = requireDirectory(storeRoot, 'pnpm store');
  const manifest = path.resolve(requireValue(manifestPath, '--manifest'));
  assertManifestInsideStore(store, manifest);
  if (!fs.existsSync(manifest)) {
    throw new Error(`pnpm store integrity manifest is missing: ${manifest}`);
  }
  const expected = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  if (expected.schemaVersion !== SCHEMA_VERSION || !Array.isArray(expected.files)) {
    throw new Error('pnpm store integrity manifest has an unsupported schema.');
  }
  const observed = collectStoreFiles(store, manifest);
  if (JSON.stringify(observed) !== JSON.stringify(expected.files)) {
    throw new Error('pnpm store integrity manifest mismatch.');
  }
  console.log(`Verified pnpm store integrity manifest with ${observed.length} files.`);
  return observed;
}

function collectStoreFiles(storeRoot, manifestPath) {
  const files = [];
  const stack = [storeRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (fullPath === manifestPath) {
        continue;
      }
      if (entry.isSymbolicLink()) {
        throw new Error(`pnpm store contains a symbolic link: ${fullPath}`);
      }
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile()) {
        throw new Error(`pnpm store contains an unsupported entry: ${fullPath}`);
      }
      const stat = fs.statSync(fullPath);
      files.push({
        path: path.relative(storeRoot, fullPath).replace(/\\/g, '/'),
        bytes: stat.size,
        sha256: sha256File(fullPath),
      });
    }
  }
  files.sort((left, right) => left.path.localeCompare(right.path));
  return files;
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.alloc(1024 * 1024);
  const file = fs.openSync(filePath, 'r');
  try {
    let bytesRead;
    do {
      bytesRead = fs.readSync(file, buffer, 0, buffer.length, null);
      if (bytesRead > 0) {
        hash.update(buffer.subarray(0, bytesRead));
      }
    } while (bytesRead > 0);
  } finally {
    fs.closeSync(file);
  }
  return hash.digest('hex');
}

function pruneVolatileMetadata(storeRoot) {
  const store = requireDirectory(storeRoot, 'pnpm store');
  let removed = 0;
  for (const entry of fs.readdirSync(store, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^v\d+$/.test(entry.name)) {
      continue;
    }
    const projects = path.join(store, entry.name, 'projects');
    if (fs.existsSync(projects)) {
      removeTreeWithoutFollowingLinks(projects);
      removed += 1;
    }
  }
  console.log(`Pruned ${removed} pnpm store project metadata director${removed === 1 ? 'y' : 'ies'}.`);
  return removed;
}

function removeTreeWithoutFollowingLinks(target) {
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink() || stat.isFile()) {
    fs.unlinkSync(target);
    return;
  }
  if (!stat.isDirectory()) {
    throw new Error(`pnpm store volatile metadata contains an unsupported entry: ${target}`);
  }
  for (const entry of fs.readdirSync(target)) {
    removeTreeWithoutFollowingLinks(path.join(target, entry));
  }
  fs.rmdirSync(target);
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Invalid pnpm store integrity argument: ${key ?? '<missing>'}`);
    }
    if (key === '--store') {
      options.store = value;
    } else if (key === '--manifest') {
      options.manifest = value;
    } else {
      throw new Error(`Unknown pnpm store integrity argument: ${key}`);
    }
  }
  return options;
}

function requireDirectory(value, label) {
  const resolved = path.resolve(requireValue(value, `--${label}`));
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`${label} is not a directory: ${resolved}`);
  }
  return fs.realpathSync.native(resolved);
}

function requireValue(value, option) {
  if (!value) {
    throw new Error(`${option} is required.`);
  }
  return value;
}

function assertManifestInsideStore(storeRoot, manifestPath) {
  const relative = path.relative(storeRoot, manifestPath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('pnpm store integrity manifest must be a file inside the store root.');
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

module.exports = {
  _test: {
    collectStoreFiles,
    pruneVolatileMetadata,
    verifyManifest,
    writeManifest,
  },
};
