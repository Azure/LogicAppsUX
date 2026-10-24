export function shouldDeferWorkspaceLifecycleCleanup(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env.LA_E2E_CLI_WORKSPACE_PARENT || env.LA_E2E_CLI_CREATE_WORKSPACE_PARENT || env.LA_E2E_CLI_PRESERVE_WORKSPACES === '1');
}
