import * as assert from 'assert';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import * as vm from 'vm';

const sourcePath = path.resolve(__dirname, '..', '..', '..', 'src', 'test', 'e2e', 'workspaceLifecycle.test.ts');
const sourceText = fs.readFileSync(sourcePath, 'utf-8');
const source = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true);

const runtimeFunctionNames = new Set([
  'waitForOverviewRunStatus',
  'waitForLatestRunStatus',
  'getWorkflowRunFailureDiagnostics',
  'tryParseJsonForDiagnostics',
  'sanitizeRunDiagnostic',
  'isSensitiveDiagnosticKey',
  'redactDiagnosticString',
  'parseListResponse',
]);

async function main(): Promise<void> {
  await testTerminalStatusFailsFast();
  await testSucceededStatusDoesNotCollectFailureDetails();
  await testMalformedActionDiagnosticsPreserveTerminalStatus();
  testRuntimeDiagnosticsRedactSensitiveSubtrees();
  testRuntimeDiagnosticsRedactSensitiveStrings();
  testEarlyMsnWeatherPhaseWiring();
  console.log('[workspaceLifecycleDiagnostics.unit] all tests passed');
}

function loadRuntimeHarness(status: string, options: { malformedActions?: boolean } = {}) {
  const selected = source.statements.filter(
    (node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && runtimeFunctionNames.has(node.name?.text ?? '')
  );
  assert.strictEqual(selected.length, runtimeFunctionNames.size, 'Expected all runtime diagnostic functions to be extracted');

  const implementation = ts.transpileModule(selected.map((node) => `export ${node.getText(source)}`).join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;

  const exported: Record<string, any> = {};
  const calls = { polls: 0, urls: [] as string[], logs: [] as string[], actionDetails: [] as string[] };
  const workflowName = 'workflow / with space';
  const runName = 'run/?exact';
  vm.runInNewContext(implementation, {
    exports: exported,
    assert,
    console: { log: (line: string) => calls.logs.push(line) },
    managementBaseUrl: 'http://localhost:7071/management',
    apiVersion: '2018-11-01',
    getOverviewRunStatus: async () => ({ status, runName, text: `${runName} ${status}` }),
    getRunActionDetails: async (_workflow: string, _run: string, action: string) => {
      calls.actionDetails.push(action);
      return {
        properties: {
          status: 'Failed',
          error: {
            code: 'UpstreamFailure',
            message: 'Fixture upstream failed.',
          },
        },
      };
    },
    httpRequest: async (request: { url: string }) => {
      calls.urls.push(request.url);
      if (request.url.includes('/actions?')) {
        if (options.malformedActions) {
          return { status: 200, body: '<html>Unexpected proxy response</html>' };
        }
        return {
          status: 200,
          body: JSON.stringify({
            value: [
              { name: 'Get_current_weather', properties: { status: 'Failed', code: 'UpstreamFailure' } },
              { name: 'Successful_action', properties: { status: 'Succeeded' } },
            ],
          }),
        };
      }
      if (request.url.includes('/runs?')) {
        return { status: 200, body: JSON.stringify({ value: [{ name: runName, properties: { status } }] }) };
      }
      return { status: 200, body: JSON.stringify({ name: runName, properties: { status } }) };
    },
    waitUntil: async (predicate: () => Promise<boolean> | boolean) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        calls.polls++;
        try {
          if (await predicate()) {
            return;
          }
        } catch {
          // Match production waitUntil's retrying predicate contract.
        }
      }
      throw new Error('Synthetic wait exhausted: terminal failure was swallowed.');
    },
  });

  return { exported, calls, workflowName, runName };
}

async function testTerminalStatusFailsFast(): Promise<void> {
  for (const status of ['Failed', 'Cancelled']) {
    const overview = loadRuntimeHarness(status);
    await assert.rejects(
      overview.exported.waitForOverviewRunStatus({}, 9, overview.workflowName, 'standard', overview.runName, 'Succeeded', 180000),
      (error: Error) => error.message.includes(overview.runName) && error.message.includes(status)
    );
    assert.strictEqual(overview.calls.polls, 1, `Overview ${status} should stop on first terminal observation`);
    assert.deepStrictEqual(overview.calls.actionDetails, ['Get_current_weather']);
    assert.ok(overview.calls.urls.every((url) => url.includes(encodeURIComponent(overview.workflowName))));
    assert.ok(overview.calls.urls.every((url) => url.includes(encodeURIComponent(overview.runName))));
    assert.ok(overview.calls.logs.some((line) => line.includes('UpstreamFailure')));

    const management = loadRuntimeHarness(status);
    await assert.rejects(
      management.exported.waitForLatestRunStatus(management.workflowName, 'Succeeded', 180000),
      (error: Error) => error.message.includes(management.runName) && error.message.includes(status)
    );
    assert.strictEqual(management.calls.polls, 1, `Management ${status} should stop on first terminal observation`);
    assert.deepStrictEqual(management.calls.actionDetails, ['Get_current_weather']);
  }
}

async function testSucceededStatusDoesNotCollectFailureDetails(): Promise<void> {
  const harness = loadRuntimeHarness('Succeeded');
  await harness.exported.waitForOverviewRunStatus({}, 9, harness.workflowName, 'standard', harness.runName, 'Succeeded', 180000);
  assert.strictEqual(harness.calls.polls, 1);
  assert.deepStrictEqual(harness.calls.urls, []);
  assert.deepStrictEqual(harness.calls.actionDetails, []);
}

async function testMalformedActionDiagnosticsPreserveTerminalStatus(): Promise<void> {
  for (const source of ['Overview', 'Management']) {
    const harness = loadRuntimeHarness('Failed', { malformedActions: true });
    await assert.rejects(
      source === 'Overview'
        ? harness.exported.waitForOverviewRunStatus({}, 9, harness.workflowName, 'standard', harness.runName, 'Succeeded', 180000)
        : harness.exported.waitForLatestRunStatus(harness.workflowName, 'Succeeded', 180000),
      (error: Error) => error.message.includes(harness.runName) && error.message.includes('Failed')
    );
    assert.strictEqual(harness.calls.polls, 1, `${source} malformed action diagnostics must not hide terminal status`);
  }
}

function testRuntimeDiagnosticsRedactSensitiveSubtrees(): void {
  const harness = loadRuntimeHarness('Failed');
  for (const key of [
    'password',
    'credential',
    'accountKey',
    'x-api-key',
    'cookie',
    'authentication',
    'clientSecret',
    'accessToken',
    'connectionKey',
    'MSN_CONNECTION_KEY',
    'connection-key',
    'connection_key',
    'connectionRuntimeUrl',
    'MSN_CONNECTION_RUNTIME_URL',
  ]) {
    const secret = `synthetic-${randomUUID()}`;
    const output = JSON.stringify(harness.exported.sanitizeRunDiagnostic({ properties: { details: { [key]: { nested: secret } } } }));
    assert.ok(!output.includes(secret), `Sensitive ${key} value must not survive production sanitizer`);
  }
}

function testRuntimeDiagnosticsRedactSensitiveStrings(): void {
  const harness = loadRuntimeHarness('Failed');
  for (const [kind, inputFactory] of Object.entries({
    Bearer: (secret: string) => `Authorization: Bearer ${secret}`,
    'SAS URL': (secret: string) => `https://example.invalid/run?sig=${secret}&api-version=1`,
    'connection string': (secret: string) => `Request failed with AccountName=test;AccountKey=${secret};EndpointSuffix=core.windows.net`,
    connectionKey: (secret: string) => `Request failed with connectionKey=${secret}`,
    'prefixed connection key': (secret: string) => `Request failed: {"MSN_CONNECTION_KEY":"${secret}"}`,
    'dash connection key': (secret: string) => `Request failed: {"connection-key":"${secret}"}`,
    'underscore connection key': (secret: string) => `Request failed: {"connection_key":"${secret}"}`,
    connectionRuntimeUrl: (secret: string) => `Request failed with connectionRuntimeUrl=https://example.invalid/runtime/${secret}`,
    'prefixed runtime URL': (secret: string) =>
      `Request failed: {"MSN_CONNECTION_RUNTIME_URL":"https://example.invalid/runtime/${secret}"}`,
    'embedded JSON': (secret: string) => `Request failed: {"password":"${secret}"}`,
    Basic: (secret: string) => `Authorization: Basic ${secret}`,
  })) {
    const secret = randomUUID().replaceAll('-', '');
    const output = JSON.stringify(harness.exported.sanitizeRunDiagnostic({ error: { message: inputFactory(secret) } }));
    assert.ok(!output.includes(secret), `Sensitive ${kind} value must not survive production sanitizer`);
  }
}

function testEarlyMsnWeatherPhaseWiring(): void {
  const orderMatch = sourceText.match(/const msnWeatherLifecyclePhaseOrder = \[([\s\S]*?)\];/);
  assert.ok(orderMatch, 'Expected msnWeatherLifecyclePhaseOrder declaration');
  const order = Array.from(orderMatch[1].matchAll(/'([^']+)'/g)).map((match) => match[1]);
  assert.deepStrictEqual(order.slice(0, 4), ['Requestinserted', 'MsnWeatherDiscoveryready', 'MsnWeatherinserted', 'MsnWeatherconfigured']);
  assert.ok(order.indexOf('MsnWeatherconfigured') < order.indexOf('connectionReady'), 'MSN configuration must precede connectionReady');
  assert.match(sourceText, /runLifecyclePhase\(createdWorkspace,\s*'Requestinserted'/);
  assert.match(sourceText, /runLifecyclePhase\(createdWorkspace,\s*'MsnWeatherDiscoveryready'/);
  assert.match(sourceText, /runLifecyclePhase\(createdWorkspace,\s*'MsnWeatherinserted'/);
  assert.match(sourceText, /runLifecyclePhase\(createdWorkspace,\s*'MsnWeatherconfigured'/);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
