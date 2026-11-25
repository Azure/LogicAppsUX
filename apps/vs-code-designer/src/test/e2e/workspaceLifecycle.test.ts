import { registerWorkspaceLifecycleSuite } from './workspaceLifecycle';

// Family consumers share the real wizard/designer helpers without registering the
// canonical lifecycle test a second time. Existing labels keep their old counts.
if (
  !process.env.LA_E2E_CLI_STATELESS_VARIABLES_MODE &&
  !process.env.LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MODE &&
  !process.env.LA_E2E_CLI_RUN_AFTER_PERSISTENCE_MODE
) {
  registerWorkspaceLifecycleSuite();
}
