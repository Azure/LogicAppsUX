import * as assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';

export function recordMultiRootWizardHandoff(
  entry: {
    appType: string;
    wfType: string;
    parentDir: string;
    wsFilePath: string;
    appDir: string;
    createdAt: string;
  },
  version: string
): void {
  const file = process.env.LA_E2E_CLI_MULTI_ROOT_HANDOFF;
  if (!file) {
    return;
  }
  assert.equal(entry.appType, 'standard');
  assert.equal(entry.wfType, 'Stateful');
  const context = JSON.parse(process.env.LA_E2E_CLI_MULTI_ROOT_CONTEXT || '{}');
  assert.ok(
    context.invocation && context.identity && context.workspaceParent === fs.realpathSync(entry.parentDir),
    'Current family wizard context is required'
  );
  const executable = fs.realpathSync(process.execPath);
  fs.writeFileSync(
    file,
    JSON.stringify({
      ...context,
      entry,
      launch: {
        executable,
        sha256: createHash('sha256').update(fs.readFileSync(executable)).digest('hex'),
        version,
        extensionsDir: process.env.LA_E2E_CLI_EXTENSIONS_DIR,
      },
    }),
    { flag: 'wx' }
  );
}
