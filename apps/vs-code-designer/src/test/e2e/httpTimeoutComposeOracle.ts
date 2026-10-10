import * as assert from 'assert';
import * as path from 'path';

// Only the connector-free Compose clause. HTTP execution, Portal and Consumption
// validation are deliberately not represented by a replacement endpoint.
export const httpTimeoutComposeAction = {
  inputs: 'test',
  runAfter: {},
  runtimeConfiguration: { requestOptions: { timeout: 'PT24H' } },
  type: 'Compose',
} as const;

export const httpTimeoutComposeError =
  "The request options timeout parameter is not supported for action 'Compose' of type 'Compose'. Actions of type 'HTTP' are supported.";

export const httpTimeoutComposeDesignerViewType = 'designerLocalV2';

export async function selectHttpTimeoutComposeDesignerV2(
  getConfiguration: () => {
    update(section: string, value: number, target: number): PromiseLike<void>;
    get<T>(section: string): T | undefined;
  },
  workspaceTarget: number
): Promise<void> {
  await getConfiguration().update('designerVersion', 2, workspaceTarget);
  assert.strictEqual(getConfiguration().get<number>('designerVersion'), 2, 'Family requires the V2 global Code/Workflow views');
}

export interface HttpTimeoutComposeWorkflow {
  kind: string;
  definition: {
    triggers: Record<string, { type: string; kind?: string }>;
    actions: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface HttpTimeoutComposeWorkspace {
  appType: string;
  wfType: string;
  parentDir: string;
  wsName: string;
  appName: string;
  wfName: string;
  wsDir: string;
  wsFilePath: string;
  appDir: string;
  wfDir: string;
  createdAt: string;
}

export function selectHttpTimeoutComposeWorkspace(
  manifest: unknown,
  parent: string,
  notBefore: number,
  now = Date.now()
): HttpTimeoutComposeWorkspace {
  assert.ok(Array.isArray(manifest), 'Fixture manifest must be an array');
  assert.strictEqual(manifest.length, 1, 'Expected exactly one newly generated fixture');
  const entry = manifest[0] as HttpTimeoutComposeWorkspace;
  assert.strictEqual(entry.appType, 'standard');
  assert.strictEqual(entry.wfType, 'Stateless');
  const createdAt = Date.parse(entry.createdAt);
  assert.ok(Number.isFinite(createdAt) && createdAt >= notBefore && createdAt <= now, 'Stale/future fixture manifest');
  assert.strictEqual(path.resolve(entry.parentDir), path.resolve(parent), 'Wrong owned fixture parent');
  for (const name of [entry.wsName, entry.appName, entry.wfName]) {
    assert.ok(typeof name === 'string' && name.length > 0 && !/[\\/:]/.test(name) && name !== '..', 'Invalid fixture name');
  }
  assert.strictEqual(path.resolve(entry.wsDir), path.resolve(parent, entry.wsName));
  assert.strictEqual(path.resolve(entry.wsFilePath), path.resolve(entry.wsDir, `${entry.wsName}.code-workspace`));
  assert.strictEqual(path.resolve(entry.appDir), path.resolve(entry.wsDir, entry.appName));
  assert.strictEqual(path.resolve(entry.wfDir), path.resolve(entry.appDir, entry.wfName));
  return entry;
}

export function assertHttpTimeoutComposeAuthored(value: unknown): asserts value is HttpTimeoutComposeWorkflow {
  const workflow = value as HttpTimeoutComposeWorkflow;
  assert.strictEqual(workflow.kind, 'Stateless', 'Original prerequisite is Stateless, not Stateful');
  const triggers = Object.values(workflow.definition.triggers);
  assert.strictEqual(triggers.length, 1, 'Exactly one Request trigger must be authored');
  assert.strictEqual(triggers[0].type, 'Request');
  assert.strictEqual(triggers[0].kind, 'Http');
  assert.deepStrictEqual(Object.keys(workflow.definition.actions), ['Compose'], 'Exactly the authored Compose action is required');
  const action = workflow.definition.actions.Compose as Record<string, unknown>;
  assert.strictEqual(action.type, 'Compose');
  assert.strictEqual(action.inputs, 'test');
  assert.deepStrictEqual(action.runAfter, {});
  assert.ok(!('runtimeConfiguration' in action), 'Timeout must not be present before Code-tab replacement');
}

export function replaceHttpTimeoutComposeAction(value: unknown): HttpTimeoutComposeWorkflow {
  assertHttpTimeoutComposeAuthored(value);
  const workflow = structuredClone(value);
  workflow.definition.actions.Compose = structuredClone(httpTimeoutComposeAction);
  return workflow;
}

export function assertHttpTimeoutComposePersisted(actual: unknown, expected: HttpTimeoutComposeWorkflow): void {
  const workflow = actual as HttpTimeoutComposeWorkflow;
  assert.strictEqual(workflow.kind, 'Stateless');
  assert.deepStrictEqual(workflow.definition, expected.definition, 'Saved definition is stale, partial, or changed outside Compose');
  assert.deepStrictEqual(workflow.definition.actions.Compose, httpTimeoutComposeAction, 'Original replacement JSON must persist exactly');
}

export interface HttpTimeoutComposeContext {
  targetId: string;
  contextId: number;
  frameId: string;
  documentOrigin: number;
}

export interface HttpTimeoutComposeErrorObservation extends HttpTimeoutComposeContext {
  visible: boolean;
  activeDesigner: boolean;
  messages: string[];
}

export function assertHttpTimeoutComposeVisibleError(
  observation: HttpTimeoutComposeErrorObservation,
  owner: HttpTimeoutComposeContext
): void {
  assert.ok(owner.targetId && owner.frameId, 'Original designer target/frame identity missing');
  assert.ok(Number.isInteger(owner.contextId) && owner.contextId > 0, 'Original designer context identity missing');
  assert.ok(Number.isFinite(owner.documentOrigin) && owner.documentOrigin > 0, 'Original designer document identity missing');
  for (const key of ['targetId', 'contextId', 'frameId', 'documentOrigin'] as const) {
    assert.strictEqual(observation[key], owner[key], `Timeout error belongs to a different ${key}`);
  }
  assert.strictEqual(observation.visible, true, 'Hidden error is not user-visible evidence');
  assert.strictEqual(observation.activeDesigner, true, 'Error must be on the actual active designer');
  assert.ok(observation.messages.includes(httpTimeoutComposeError), 'Exact original unsupported-timeout error must be visible');
}

export interface HttpTimeoutComposeRenderedPage {
  editorId: string;
  lines: Array<{ number: number; text: string }>;
}

// Rendered lines are an observation, never a fallback source for missing JSON.
// Every numbered line through a separately observed Ctrl+End must be present.
export function assembleHttpTimeoutComposeCode(pages: HttpTimeoutComposeRenderedPage[], endLine: number): string {
  assert.ok(Number.isInteger(endLine) && endLine > 0, 'Code editor EOF must be observed');
  assert.ok(pages.length > 0, 'No rendered Code editor pages');
  const lines = new Map<number, string>();
  const editorId = pages[0].editorId;
  assert.ok(editorId, 'Code editor identity missing');
  for (const page of pages) {
    assert.strictEqual(page.editorId, editorId, 'Code editor changed while reading');
    assert.ok(page.lines.length > 0, 'Empty/unfinished virtualized editor page');
    for (const line of page.lines) {
      assert.ok(Number.isInteger(line.number) && line.number > 0 && line.number <= endLine, 'Invalid rendered line number');
      if (lines.has(line.number)) {
        assert.strictEqual(lines.get(line.number), line.text, 'Code changed while reading rendered pages');
      }
      lines.set(line.number, line.text);
    }
  }
  const text = Array.from({ length: endLine }, (_, index) => {
    const number = index + 1;
    assert.ok(lines.has(number), `Incomplete Code editor virtualization: missing line ${number}`);
    return lines.get(number);
  }).join('\n');
  JSON.parse(text); // Truncation/invalid JSON must fail, even if the fragment contains Compose.
  return text;
}

export function httpTimeoutComposeRemaining(deadline: number, now = Date.now()): number {
  const remaining = deadline - now;
  assert.ok(Number.isFinite(remaining) && remaining > 0, 'HTTP timeout Compose observation deadline expired');
  return remaining;
}

export async function pollHttpTimeoutCompose<T>(
  read: () => Promise<T>,
  ready: (value: T) => boolean,
  deadline: number,
  description: string
): Promise<T> {
  httpTimeoutComposeRemaining(deadline);
  let lastBoundedError: unknown;
  while (Date.now() < deadline) {
    let value: T;
    try {
      value = await read(); // RPC/read failures before the deadline remain actionable and propagate.
    } catch (error) {
      if (Date.now() < deadline) {
        throw error;
      }
      lastBoundedError = error;
      break;
    }
    if (Date.now() >= deadline) {
      break;
    }
    if (ready(value)) {
      return value;
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(100, remaining)));
  }
  assert.fail(`Timed out waiting for ${description}${lastBoundedError ? `. Last bounded error: ${String(lastBoundedError)}` : ''}`);
}
