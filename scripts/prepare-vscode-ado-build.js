#!/usr/bin/env node
/* global console, process */
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

if (process.env.LA_VSCODE_ADO_PIPELINE !== 'true') {
  throw new Error('prepare-vscode-ado-build.js may only run when LA_VSCODE_ADO_PIPELINE=true.');
}

const aiKey = process.env.AI_KEY;
if (!aiKey?.trim() || /^\$\([^)]+\)$/.test(aiKey.trim())) {
  throw new Error('AI_KEY must be set for the VS Code extension build.');
}

const packageJsonPath = path.join(repoRoot, 'apps', 'vs-code-designer', 'src', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.aiKey = aiKey;
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

const mainPath = path.join(repoRoot, 'apps', 'vs-code-designer', 'src', 'main.ts');
const main = fs.readFileSync(mainPath, 'utf8');
if (!main.includes("'setInGitHubBuild'")) {
  throw new Error('Unable to find telemetry placeholder in apps/vs-code-designer/src/main.ts.');
}
fs.writeFileSync(mainPath, main.replace("'setInGitHubBuild'", JSON.stringify(aiKey)), 'utf8');

console.log('Prepared VS Code extension build metadata.');
