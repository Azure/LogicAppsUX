#!/usr/bin/env node
/* global console, process */
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const requiredEnv = [
  'BUILD_ARTIFACTSTAGINGDIRECTORY',
  'BUILD_BUILDID',
  'BUILD_BUILDNUMBER',
  'BUILD_REPOSITORY_NAME',
  'BUILD_REPOSITORY_URI',
  'BUILD_SOURCEVERSION',
];

if (process.env.LA_VSCODE_ADO_PIPELINE !== 'true') {
  throw new Error('stage-vscode-e2e-build-artifact.js may only run when LA_VSCODE_ADO_PIPELINE=true.');
}

for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(`Missing required Azure Pipelines environment variable: ${name}`);
  }
}

if (!process.env.SYSTEM_DEFINITIONID && !process.env.BUILD_DEFINITIONID) {
  throw new Error('Missing required Azure Pipelines environment variable: SYSTEM_DEFINITIONID or BUILD_DEFINITIONID');
}

const repoRoot = process.cwd();
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
if (head.toLowerCase() !== process.env.BUILD_SOURCEVERSION.toLowerCase()) {
  throw new Error(`Checked out HEAD ${head} does not match BUILD_SOURCEVERSION ${process.env.BUILD_SOURCEVERSION}.`);
}

const distRoot = path.join(repoRoot, 'apps', 'vs-code-designer', 'dist');
const outRoot = path.join(repoRoot, 'apps', 'vs-code-designer', 'out');
const compiledCliTest = path.join(outRoot, 'test', 'e2e', 'createWorkspace.test.js');
for (const requiredPath of [distRoot, outRoot, compiledCliTest]) {
  if (!fs.existsSync(requiredPath)) {
    throw new Error(`Required E2E payload path is missing: ${requiredPath}`);
  }
}

const stagingRoot = path.join(process.env.BUILD_ARTIFACTSTAGINGDIRECTORY, 'build', 'Root', 'vscode-e2e');
fs.mkdirSync(stagingRoot, { recursive: true });

const artifactPath = path.join(stagingRoot, 'extension-build.tar.gz');
const manifestPath = path.join(stagingRoot, 'vscode-e2e-build-manifest.json');
execFileSync('tar', ['-czf', artifactPath, 'apps/vs-code-designer/dist', 'apps/vs-code-designer/out'], {
  cwd: repoRoot,
  stdio: 'inherit',
});

const manifestScript = path.join(repoRoot, 'apps', 'vs-code-designer', 'scripts', 'vscode-e2e-artifact-manifest.js');
execFileSync(
  process.execPath,
  [
    manifestScript,
    'generate',
    '--artifact',
    artifactPath,
    '--out',
    manifestPath,
    '--artifact-name',
    'vscode-e2e-build',
    '--checkout-ref',
    head,
    '--payload-root',
    'apps/vs-code-designer/dist',
    '--payload-root',
    'apps/vs-code-designer/out',
  ],
  { cwd: repoRoot, stdio: 'inherit', env: process.env }
);

execFileSync(
  process.execPath,
  [
    manifestScript,
    'verify',
    '--artifact',
    artifactPath,
    '--manifest',
    manifestPath,
    '--expected-source-sha',
    head,
    '--expected-producer-run-id',
    process.env.BUILD_BUILDID,
    '--expected-producer-definition-id',
    process.env.SYSTEM_DEFINITIONID || process.env.BUILD_DEFINITIONID,
    '--expected-repository-name',
    process.env.BUILD_REPOSITORY_NAME,
    '--expected-repository-uri',
    process.env.BUILD_REPOSITORY_URI,
    '--expected-checkout-ref',
    head,
    '--privileged-admission',
  ],
  { cwd: repoRoot, stdio: 'inherit', env: process.env }
);

const sha256 = await sha256File(artifactPath);
fs.writeFileSync(`${artifactPath}.sha256`, `${sha256}  extension-build.tar.gz\n`);
console.log('Staged VS Code E2E build payload in native Build Root artifact.');

async function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(filePath)) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}
