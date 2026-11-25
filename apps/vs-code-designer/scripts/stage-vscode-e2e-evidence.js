#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global console, module, process, require */
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { finalizeEvidenceManifest, readEvidenceManifest } = require('./vscode-e2e-evidence-manifest');

const stagedManifestFileName = 'suite-evidence-manifest.json';
const validationFileName = 'ORDERED_EVIDENCE_VALIDATION.json';

function stageVscodeE2eEvidence({ manifestPath, artifactRoot, outcomeFile }) {
  const sourceManifestPath = path.resolve(manifestPath);
  const bundleRoot = path.dirname(sourceManifestPath);
  const destinationRoot = path.resolve(artifactRoot);
  fs.mkdirSync(destinationRoot, { recursive: true });
  const validationPath = path.join(destinationRoot, validationFileName);
  const validation = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceManifest: path.basename(sourceManifestPath),
    valid: false,
    copiedFiles: [],
    errors: [],
  };

  try {
    const outcome = readOutcome(outcomeFile);
    const sourceManifest = readEvidenceManifest(sourceManifestPath);
    finalizeEvidenceManifest({
      manifestPath: sourceManifestPath,
      state: outcome === 'success' ? 'complete' : 'failed',
      reason: outcome === 'success' ? undefined : `Native suite outcome: ${outcome}`,
      expectedInvocation: sourceManifest.invocation,
    });
    const manifest = readEvidenceManifest(sourceManifestPath);
    const references = collectReferences(manifest);
    const claimedPaths = new Set();
    for (const reference of references) {
      if (claimedPaths.has(reference.path)) {
        throw new Error(`Evidence bundle path is referenced more than once: ${reference.path}`);
      }
      claimedPaths.add(reference.path);
      const sourcePath = resolveContainedRegularFile(bundleRoot, reference.path);
      verifyIntegrity(sourcePath, reference);
      const destinationPath = resolveDestination(destinationRoot, reference.path);
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.copyFileSync(sourcePath, destinationPath, fs.constants.COPYFILE_EXCL);
      validation.copiedFiles.push(reference.path);
    }
    const stagedManifestPath = path.join(destinationRoot, stagedManifestFileName);
    copyFileAtomic(sourceManifestPath, stagedManifestPath);
    validation.copiedFiles.push(stagedManifestFileName);
    validation.valid = true;
    validation.suiteId = manifest.suiteId;
    validation.state = manifest.state;
    validation.checkpointCount = manifest.groups.reduce((count, group) => count + group.checkpoints.length, 0);
    validation.attachmentCount = manifest.attachments.length;
    writeJsonAtomic(validationPath, validation);
    return { manifestPath: stagedManifestPath, validationPath, validation };
  } catch (error) {
    validation.errors.push(error instanceof Error ? error.message : String(error));
    writeJsonAtomic(validationPath, validation);
    throw error;
  }
}

function readOutcome(outcomeFile) {
  if (!fs.existsSync(path.resolve(outcomeFile))) {
    return 'failure';
  }
  const value = JSON.parse(fs.readFileSync(path.resolve(outcomeFile), 'utf8'));
  if (!value || typeof value.outcome !== 'string' || !['success', 'failure'].includes(value.outcome)) {
    throw new Error('Native suite result must contain outcome success or failure');
  }
  return value.outcome;
}

function collectReferences(manifest) {
  const references = [];
  for (const checkpoint of manifest.groups.flatMap((group) => group.checkpoints)) {
    for (const reference of Object.values(checkpoint.evidence ?? {})) {
      references.push(reference);
    }
  }
  for (const attachment of manifest.attachments) {
    for (const reference of Object.values(attachment.evidence ?? {})) {
      references.push(reference);
    }
  }
  return references;
}

function resolveContainedRegularFile(bundleRoot, relativePath) {
  const root = path.resolve(bundleRoot);
  const segments = relativePath.split('/');
  let current = root;
  for (const segment of segments) {
    current = path.join(current, segment);
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) {
      throw new Error(`Evidence bundle reference traverses a symbolic link: ${relativePath}`);
    }
  }
  const relative = path.relative(root, current);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Evidence bundle reference escapes its root: ${relativePath}`);
  }
  const stat = fs.lstatSync(current);
  if (!stat.isFile()) {
    throw new Error(`Evidence bundle reference is not a regular file: ${relativePath}`);
  }
  const extension = path.extname(current).toLowerCase();
  const maximumBytes = extension === '.png' ? 20 * 1024 * 1024 : extension === '.json' ? 1024 * 1024 : 0;
  if (!maximumBytes || stat.size > maximumBytes) {
    throw new Error(`Evidence bundle reference has an unsupported extension or size: ${relativePath}`);
  }
  return current;
}

function verifyIntegrity(filePath, reference) {
  const bytes = fs.readFileSync(filePath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== reference.size || sha256 !== reference.sha256) {
    throw new Error(`Evidence bundle integrity mismatch: ${reference.path}`);
  }
}

function resolveDestination(destinationRoot, relativePath) {
  const root = path.resolve(destinationRoot);
  const destination = path.resolve(root, ...relativePath.split('/'));
  const relative = path.relative(root, destination);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Evidence staging destination escapes its root: ${relativePath}`);
  }
  return destination;
}

function copyFileAtomic(sourcePath, destinationPath) {
  const temporaryPath = `${destinationPath}.${process.pid}.${randomUUID()}.tmp`;
  fs.copyFileSync(sourcePath, temporaryPath, fs.constants.COPYFILE_EXCL);
  fs.renameSync(temporaryPath, destinationPath);
}

function writeJsonAtomic(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  fs.renameSync(temporaryPath, filePath);
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const name = args[index];
    const value = args[index + 1];
    if (!name?.startsWith('--') || !value || value.startsWith('--')) {
      throw new Error(`Invalid argument near ${name ?? '<end>'}`);
    }
    options[name.slice(2)] = value;
    index++;
  }
  return options;
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = stageVscodeE2eEvidence({
      manifestPath: options.manifest,
      artifactRoot: options['artifact-root'],
      outcomeFile: options['outcome-file'],
    });
    console.log(`[ordered-evidence] Staged ${result.validation.copiedFiles.length} allowlisted files.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

module.exports = {
  stageVscodeE2eEvidence,
  validationFileName,
  _test: {
    collectReferences,
    resolveContainedRegularFile,
  },
};
