#!/usr/bin/env node
/* eslint-disable no-undef */
const fs = require('fs/promises');
const path = require('path');

async function main() {
  const version = process.argv[2];
  if (!version) {
    console.error('Usage: node scripts/update-extension-bundle-version.js <version>');
    process.exitCode = 1;
    return;
  }

  const constantsPath = path.resolve(__dirname, '../src/constants.ts');
  const dockerfilePath = path.resolve(__dirname, '../src/container/Dockerfile');

  await updateFile(
    constantsPath,
    /export const EXTENSION_BUNDLE_VERSION = ['"][^'"]+['"];\s*/,
    `export const EXTENSION_BUNDLE_VERSION = '${version}';\n`
  );
  await updateFile(dockerfilePath, /ARG EXTENSION_BUNDLE_VERSION=[^\s]+/, `ARG EXTENSION_BUNDLE_VERSION=${version}`);

  console.log(`Updated extension bundle version to ${version}`);
}

async function updateFile(filePath, regex, replacement) {
  const original = await fs.readFile(filePath, 'utf8');
  if (!regex.test(original)) {
    throw new Error(`Could not find target pattern in ${filePath}`);
  }
  const updated = original.replace(regex, replacement);
  if (updated !== original) {
    await fs.writeFile(filePath, updated);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
