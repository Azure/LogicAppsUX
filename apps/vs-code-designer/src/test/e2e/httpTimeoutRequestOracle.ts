import * as assert from 'assert';
import * as path from 'path';
import type { CreatedWorkspace } from './workspaceLifecycle.test';

export const httpTimeoutRequestActionName = 'HTTP';
export const httpTimeoutInvalidDurationError = 'Timeout value is invalid, must match ISO 8601 duration format';
export const httpTimeoutPt24hRuntimeError = "The provided request options timeout of '1.00:00:00' for action 'HTTP' must be less than";

interface HttpAction {
  type?: unknown;
  inputs?: {
    method?: unknown;
    uri?: unknown;
  };
  runAfter?: unknown;
  operationOptions?: unknown;
  limit?: {
    timeout?: unknown;
    count?: unknown;
  };
  runtimeConfiguration?: {
    requestOptions?: {
      timeout?: unknown;
    };
  };
}

interface HttpTimeoutWorkflow {
  kind?: unknown;
  definition?: {
    triggers?: Record<string, { type?: unknown; kind?: unknown }>;
    actions?: Record<string, HttpAction>;
  };
}

export function selectHttpTimeoutRequestWorkspace(manifest: unknown, expectedLabel: string): CreatedWorkspace {
  assert.ok(Array.isArray(manifest), 'HTTP timeout request manifest must be an array');
  assert.strictEqual(manifest.length, 1, 'HTTP timeout request suite requires one isolated wizard-created fixture');
  const entry = manifest[0] as CreatedWorkspace;
  assert.strictEqual(entry.label, expectedLabel);
  assert.strictEqual(entry.appType, 'standard');
  assert.ok(path.isAbsolute(entry.workspaceDir));
  assert.strictEqual(path.resolve(entry.workspaceFilePath), path.resolve(entry.workspaceDir, `${entry.wsName}.code-workspace`));
  assert.strictEqual(path.resolve(entry.workflowJsonPath), path.resolve(entry.appDir, entry.wfName, 'workflow.json'));
  return entry;
}

export function assertHttpTimeoutRequestPersisted(
  workflow: unknown,
  expectedTimeout: string,
  expectedUri: string
): asserts workflow is HttpTimeoutWorkflow {
  const value = workflow as HttpTimeoutWorkflow;
  assert.strictEqual(value.kind, 'Stateless');
  const triggers = Object.values(value.definition?.triggers ?? {});
  assert.strictEqual(triggers.length, 1, 'Exactly one Request trigger must be authored');
  assert.strictEqual(triggers[0].type, 'Request');
  assert.strictEqual(triggers[0].kind, 'Http');
  const actions = value.definition?.actions ?? {};
  assert.deepStrictEqual(Object.keys(actions), [httpTimeoutRequestActionName], 'Exactly one HTTP action must be authored');
  const action = actions[httpTimeoutRequestActionName];
  assert.strictEqual(action.type, 'Http');
  assert.strictEqual(action.inputs?.method, 'GET');
  assert.strictEqual(action.inputs?.uri, expectedUri);
  assert.deepStrictEqual(action.runAfter, {});
  assert.strictEqual(action.operationOptions, 'DisableAsyncPattern');
  assert.ok(
    action.runtimeConfiguration?.requestOptions,
    'runtimeConfiguration.requestOptions must be present; Action timeout limit is not a substitute'
  );
  assert.strictEqual(action.runtimeConfiguration?.requestOptions?.timeout, expectedTimeout);
  assert.strictEqual(
    action.limit?.timeout,
    undefined,
    'Action limit.timeout must remain absent; it cannot substitute for runtimeConfiguration.requestOptions.timeout'
  );
}

export function assertHttpTimeoutActionFailed(actions: unknown, runName: string): void {
  const values = Array.isArray((actions as { value?: unknown[] })?.value) ? (actions as { value: unknown[] }).value : [];
  const action = values.find((item) => (item as { name?: unknown }).name === httpTimeoutRequestActionName) as
    | { properties?: { status?: unknown; code?: unknown; error?: { code?: unknown; message?: unknown } } }
    | undefined;
  assert.ok(action, `Exact run ${runName} must contain the HTTP action`);
  assert.strictEqual(action.properties?.status, 'Failed', `Exact run ${runName} HTTP action must fail`);
  const failureText = JSON.stringify({
    code: action.properties?.code,
    errorCode: action.properties?.error?.code,
    errorMessage: action.properties?.error?.message,
  });
  assert.match(failureText, /timed?\s*out|timeout/i, 'HTTP action failure must be timeout-specific');
}
