/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const { spawnSync } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');

const distPath = join(__dirname, '..', 'dist');
if (!existsSync(distPath)) {
  console.error(`Extension dist folder does not exist: ${distPath}`);
  process.exit(1);
}

const args = ['install', ...process.argv.slice(2)];
const npmUserConfig = process.env.NPM_CONFIG_USERCONFIG?.trim();
if (npmUserConfig) {
  if (!existsSync(npmUserConfig)) {
    console.error('NPM_CONFIG_USERCONFIG is set, but the configured npm userconfig file does not exist.');
    process.exit(1);
  }

  console.log('Using npm userconfig from NPM_CONFIG_USERCONFIG.');
  args.push('--userconfig', npmUserConfig);
}

const npmCliPath = join(process.execPath, '..', 'node_modules', 'npm', 'bin', 'npm-cli.js');
const command = existsSync(npmCliPath) ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm';
const commandArgs = existsSync(npmCliPath) ? [npmCliPath, ...args] : args;

const result = spawnSync(command, commandArgs, {
  cwd: distPath,
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
