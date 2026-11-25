import * as assert from 'assert';
import { shouldDeferWorkspaceLifecycleCleanup } from './workspaceLifecycleCleanup';

function main(): void {
  assert.strictEqual(shouldDeferWorkspaceLifecycleCleanup({}), false, 'standalone mode should let the test host clean up');
  assert.strictEqual(
    shouldDeferWorkspaceLifecycleCleanup({ LA_E2E_CLI_WORKSPACE_PARENT: '/tmp/owned' }),
    true,
    'runner-owned workspace parent should defer cleanup to wrapper diagnostics'
  );
  assert.strictEqual(
    shouldDeferWorkspaceLifecycleCleanup({ LA_E2E_CLI_CREATE_WORKSPACE_PARENT: '/tmp/owned-create' }),
    true,
    'runner-owned create workspace parent should defer cleanup to wrapper diagnostics'
  );
  assert.strictEqual(
    shouldDeferWorkspaceLifecycleCleanup({ LA_E2E_CLI_PRESERVE_WORKSPACES: '1' }),
    true,
    'preserve mode should not remove workspaces in the test host'
  );
  console.log('[workspaceLifecycleCleanup.unit] all tests passed');
}

main();
