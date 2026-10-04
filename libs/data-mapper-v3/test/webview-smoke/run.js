/* global __dirname, process, require */

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const scenarios = ['shell.js', 'bridge.js', 'state.js', 'mapping.js'];

for (const scenario of scenarios) {
  const result = spawnSync(process.execPath, [path.join(__dirname, scenario)], {
    cwd: path.join(__dirname, '..', '..'),
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
