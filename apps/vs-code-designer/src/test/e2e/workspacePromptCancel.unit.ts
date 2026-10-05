import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { assertExistingAppView, captureWorkspacePromptCancelBaseline } from './workspacePromptCancel';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-cancel-unit-'));
try {
  const appDir = path.join(root, 'workspace', 'existing-app');
  fs.mkdirSync(path.join(appDir, '.vscode'), { recursive: true });
  const workspace = {
    appDir,
    workspaceFilePath: path.join(root, 'workspace', 'existing.code-workspace'),
    workflowJsonPath: path.join(appDir, 'workflow.json'),
  };
  for (const name of ['tasks.json', 'launch.json', 'settings.json', 'extensions.json']) {
    fs.writeFileSync(path.join(appDir, '.vscode', name), '{}');
  }
  for (const file of [
    workspace.workspaceFilePath,
    workspace.workflowJsonPath,
    path.join(appDir, 'host.json'),
    path.join(appDir, 'local.settings.json'),
  ]) {
    fs.writeFileSync(file, '{}');
  }
  const baseline = captureWorkspacePromptCancelBaseline(root, workspace);
  assert.strictEqual(baseline.files.length, 8);
  assert.deepStrictEqual(captureWorkspacePromptCancelBaseline(root, workspace), baseline);
  fs.writeFileSync(workspace.workflowJsonPath, '{ }');
  assert.notDeepStrictEqual(
    captureWorkspacePromptCancelBaseline(root, workspace).files,
    baseline.files,
    'Even semantically equal byte changes must fail'
  );
  fs.writeFileSync(workspace.workflowJsonPath, '{}');
  fs.writeFileSync(path.join(appDir, 'unexpected.txt'), 'unexpected');
  assert.notDeepStrictEqual(
    captureWorkspacePromptCancelBaseline(root, workspace).entries,
    baseline.entries,
    'New files must not count as nothing happening'
  );
  const view = { title: 'existing-app - [Extension Development Host]', folderNames: ['EXISTING-APP'], tabs: [] };
  assertExistingAppView(view, workspace);
  assert.throws(() => assertExistingAppView({ ...view, title: 'existing workspace' }, workspace), /must still show the existing app/);
  assert.throws(() => assertExistingAppView({ ...view, folderNames: ['workspace'] }, workspace), /Explorer must still show/);
  assert.throws(() => assertExistingAppView({ ...view, tabs: ['Create logic app workspace'] }, workspace), /must not open the wizard/);
  console.log('[workspacePromptCancel.unit] baseline/view assertions passed; no native/UI coverage claimed.');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
