import * as assert from 'assert';
import * as fs from 'fs';
import { Session, url as inspectorUrl } from 'inspector';
import * as os from 'os';
import * as path from 'path';
import * as ts from 'typescript';
import * as vm from 'vm';
import { pathToFileURL } from 'url';
import {
  connectorIdentityProbes,
  NativeConnectorIdentityObservation,
  shouldObserveNativeConnectorIdentity,
} from './nativeConnectorIdentityObservation';

const fixtureKey = '__connectorIdentitySyntheticControl';
const tenant = 'synthetic-private-tenant-canary';
const client = 'synthetic-private-client-canary';
const token = 'synthetic-private-token-canary';
const fixture = {
  tenant,
  project: path.resolve('synthetic-project'),
  session: { account: { id: tenant }, accessToken: token },
  providerAvailable: true,
  calls: 0,
};

const source = `
async function getAuthData(tenantId2) {
  const providerAuthData = globalThis.${fixtureKey}.providerAvailable ? globalThis.${fixtureKey}.session : undefined;
  if (providerAuthData) {
    return providerAuthData;
  }
  return globalThis.${fixtureKey}.session;
}
async function getAuthorizationToken() {}
async function getAzureConnectorDetailsForLocalProject(context4, projectPath) {
  let tenantId2 = globalThis.${fixtureKey}.tenant;
  let clientId;
  const authData = await getAuthData(tenantId2);
  if (authData?.account?.id) {
    const [parsedClientId, parsedTenantId] = authData.account.id.split(".");
    tenantId2 = parsedTenantId;
    clientId = parsedClientId;
  }
  const details = { enabled: true, tenantId: tenantId2, clientId, accessToken: authData?.accessToken };
  globalThis.${fixtureKey}.calls++;
  return details;
}
function invalidateAzureDetailsCache(projectPath) {}
globalThis.${fixtureKey}.invoke = getAzureConnectorDetailsForLocalProject;
`;

async function withSyntheticBundle(run: (bundlePath: string) => Promise<void>): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'logicapps-identity-control-'));
  const bundlePath = path.join(root, 'synthetic-product.js');
  fs.writeFileSync(bundlePath, source);
  Object.defineProperty(globalThis, fixtureKey, { configurable: true, value: fixture });
  try {
    require(bundlePath);
    await run(bundlePath);
  } finally {
    delete require.cache[bundlePath];
    Reflect.deleteProperty(globalThis, fixtureKey);
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function invoke(project = fixture.project): Promise<Record<string, unknown>> {
  const value = Reflect.get(globalThis, fixtureKey) as {
    invoke: (context: object, project: string) => Promise<Record<string, unknown>>;
  };
  return value.invoke({}, project);
}

async function testSyntheticExecutionAndPrivacy(): Promise<void> {
  await withSyntheticBundle(async (bundlePath) => {
    fixture.calls = 0;
    fixture.session = { account: { id: tenant }, accessToken: token };
    const globalsBefore = new Set(Object.getOwnPropertyNames(globalThis));
    const observer = await NativeConnectorIdentityObservation.install(bundlePath, fixture.project, tenant);
    try {
      assert.strictEqual(inspectorUrl(), undefined, 'In-process observation must not open an inspector listener');
      assert.throws(() => observer.snapshot(), /evidence is unavailable/);
      await invoke(path.resolve('foreign-project'));
      assert.throws(() => observer.snapshot(), /evidence is unavailable/, 'Another project cannot supply evidence');
      const actual = await invoke();
      assert.deepStrictEqual(actual, { enabled: true, tenantId: undefined, clientId: tenant, accessToken: token });
      assert.strictEqual(fixture.calls, 2, 'Conditional probes must not invoke product functions themselves');
      const receipt = observer.snapshot();
      assert.deepStrictEqual(receipt, {
        observed: true,
        providerSessionCorrelated: true,
        inputTenantMatchesFixture: true,
        sessionAccountIsTenantOnly: true,
        sessionAccountHasCompositeShape: false,
        returnedTenantPresent: false,
        returnedTenantMatchesFixture: false,
        returnedClientIsFixtureTenant: true,
        connectorsEnabled: true,
        consistent: true,
        nonPausing: true,
      });
      const serialized = JSON.stringify(receipt);
      assert.ok(Object.values(receipt).every((value) => typeof value === 'boolean'));
      for (const canary of [tenant, client, token, fixture.project, 'accessToken', 'account']) {
        assert.ok(!serialized.includes(canary), 'Receipts must not serialize auth values or payloads');
      }
      await invoke();
      assert.deepStrictEqual(observer.snapshot(), receipt, 'Repeated identical calls do not grow the observation');
      fixture.session = { account: { id: `${client}.${tenant}` }, accessToken: token };
      await invoke();
      assert.throws(() => observer.snapshot(), /evidence is unavailable/, 'Contradictory calls cannot silently replace earlier evidence');
    } finally {
      await observer.dispose();
      await observer.dispose();
    }
    assert.ok(observer.isDisposed);
    assert.deepStrictEqual(
      Object.getOwnPropertyNames(globalThis).filter((key) => !globalsBefore.has(key)),
      [],
      'Observer must release its global receiver'
    );
    const after = await invoke();
    assert.strictEqual(after.tenantId, tenant, 'Disposal must preserve the unmodified product behavior');
  });
}

async function testMissingOrAmbiguousSourceIsRejected(): Promise<void> {
  assert.throws(() => connectorIdentityProbes(source.replace('if (providerAuthData)', 'if (true)'), 'safe'), /anchor/);
  assert.throws(() => connectorIdentityProbes(`${source}\n${source}`, 'safe'), /ambiguous/);
  await withSyntheticBundle(async (bundlePath) => {
    fs.appendFileSync(bundlePath, '\n// changed after load');
    await assert.rejects(NativeConnectorIdentityObservation.install(bundlePath, fixture.project, tenant), /admitted bundle/);
  });
  await withSyntheticBundle(async (bundlePath) => {
    const unloaded = path.join(path.dirname(bundlePath), 'unloaded.js');
    fs.writeFileSync(unloaded, source);
    await assert.rejects(NativeConnectorIdentityObservation.install(unloaded, fixture.project, tenant), /one loaded product script/);
  });
}

async function testUncorrelatedSessionIsNotAttributedToWif(): Promise<void> {
  await withSyntheticBundle(async (bundlePath) => {
    fixture.providerAvailable = false;
    fixture.session = { account: { id: `${client}.${tenant}` }, accessToken: token };
    const observer = await NativeConnectorIdentityObservation.install(bundlePath, fixture.project, tenant);
    try {
      const actual = await invoke();
      assert.strictEqual(actual.tenantId, tenant);
      assert.strictEqual(actual.clientId, client);
      const receipt = observer.snapshot();
      assert.strictEqual(receipt.providerSessionCorrelated, false, 'Another auth path must not be attributed to the WIF provider');
      assert.strictEqual(receipt.sessionAccountHasCompositeShape, true);
      assert.strictEqual(receipt.returnedTenantMatchesFixture, true);
    } finally {
      fixture.providerAvailable = true;
      await observer.dispose();
    }
  });
}

async function testConditionFailureCannotReuseStaleEvidence(): Promise<void> {
  for (const kind of ['accessor', 'proxy']) {
    await withSyntheticBundle(async (bundlePath) => {
      fixture.session = { account: { id: tenant }, accessToken: token };
      const observer = await NativeConnectorIdentityObservation.install(bundlePath, fixture.project, tenant);
      try {
        await invoke();
        assert.strictEqual(observer.snapshot().observed, true);
        let reads = 0;
        if (kind === 'accessor') {
          Object.defineProperty(fixture.session, 'account', {
            get: () => {
              reads++;
              return { id: tenant };
            },
          });
        } else {
          fixture.session = new Proxy(fixture.session, {
            get: (target, key, receiver) => {
              reads++;
              return Reflect.get(target, key, receiver);
            },
          });
        }
        const baseline = await invoke(path.resolve('foreign-project'));
        const productReads = reads;
        reads = 0;
        const actual = await invoke();
        assert.deepStrictEqual(actual, baseline);
        assert.strictEqual(actual.clientId, tenant, 'An observer condition error must not change the product result');
        assert.strictEqual(reads, productReads, 'Inspection must not add accessor/proxy reads beyond the same product-only call');
        assert.throws(
          () => observer.snapshot(),
          (error: unknown) => error instanceof Error && error.message.endsWith('caller evidence is unavailable'),
          'V8 condition errors must reject the receipt, not silently reuse the preceding call'
        );
      } finally {
        await observer.dispose();
      }
    });
  }
}

async function testRealBundleProbeResolution(): Promise<void> {
  const bundlePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'main.js');
  assert.ok(fs.existsSync(bundlePath), 'Build the actual extension before running its compiled-source binding control');
  // Compile without evaluating the bundle: no activation, host API, SDK or network.
  const compiler = new Session();
  compiler.connect();
  try {
    await new Promise<void>((resolve, reject) => compiler.post('Runtime.enable', (error) => (error ? reject(error) : resolve())));
    await new Promise<void>((resolve, reject) =>
      compiler.post(
        'Runtime.compileScript',
        { expression: fs.readFileSync(bundlePath, 'utf8'), sourceURL: pathToFileURL(bundlePath).href, persistScript: true },
        (error, value) => (error || value.exceptionDetails ? reject(new Error('Real bundle compilation failed')) : resolve())
      )
    );
    const observer = await NativeConnectorIdentityObservation.install(bundlePath, fixture.project, tenant);
    try {
      assert.throws(() => observer.snapshot(), /evidence is unavailable/, 'Compilation is not native caller execution');
    } finally {
      await observer.dispose();
    }
  } finally {
    compiler.disconnect();
  }
}

async function testNativeLifecycleWiring(): Promise<void> {
  const lifecyclePath = path.resolve(__dirname, '..', '..', '..', 'src', 'test', 'e2e', 'workspaceLifecycle.ts');
  const lifecycle = ts.createSourceFile(lifecyclePath, fs.readFileSync(lifecyclePath, 'utf8'), ts.ScriptTarget.Latest, true);
  const declaration = lifecycle.statements.find(
    (node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === 'runMsnWeatherLifecycle'
  );
  assert.ok(declaration, 'Exercise the actual MSN lifecycle orchestration, not a copied implementation');
  const implementation = ts.transpileModule(`export ${declaration.getText(lifecycle)}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  for (const scenario of [
    'wif',
    'raw-token',
    'install-failure',
    'warmup-failure',
    'authoring-failure',
    'snapshot-failure',
    'disposal-failure',
    'authoring-and-disposal-failure',
    'runtime-failure',
  ]) {
    const calls: string[] = [];
    const logs: string[] = [];
    const primary = new Error(`synthetic-${scenario}`);
    const disposal = new Error('synthetic-disposal');
    const env =
      scenario === 'raw-token'
        ? { LA_E2E_CLI_AZURE_ACCESS_TOKEN: token }
        : {
            FC_SERVICE_CONNECTION_ID: 'synthetic-connection',
            FC_SERVICE_CONNECTION_CLIENT_ID: client,
            FC_SERVICE_CONNECTION_TENANT_ID: tenant,
          };
    const observer = {
      isDisposed: false,
      snapshot: () => {
        calls.push('snapshot');
        if (scenario === 'snapshot-failure') {
          throw primary;
        }
        return { observed: true };
      },
      dispose: async () => {
        calls.push('dispose');
        observer.isDisposed = true;
        if (scenario.includes('disposal-failure')) {
          throw disposal;
        }
      },
    };
    const exports: { runMsnWeatherLifecycle?: (workspace: Record<string, string>) => Promise<void> } = {};
    const noops = Object.fromEntries(
      [
        'waitForGeneratedLogicAppFolder',
        'logMsnWeatherDesignerOpenDiagnostics',
        'ensureLocalSettingsForMsnWeather',
        'assertMsnWeatherLocalSettingsReady',
        'assertMsnWeatherStandardWorkflow',
        'waitForPathExists',
        'completeSyntheticLifecyclePhase',
        'assertRunResponseReturnsMsnWeatherConditions',
        'captureLifecycleScreenshot',
      ].map((name) => [name, () => undefined])
    );
    vm.runInNewContext(implementation, {
      ...noops,
      exports,
      assert,
      path,
      process: { env },
      console: { log: (line: string) => logs.push(line) },
      require: { resolve: (value: string) => value },
      logicAppsExtensionId: 'synthetic-extension',
      responseActionTitle: 'Response',
      requiredValue: () => 'synthetic-fixture-directory',
      redactDiagnosticString: (value: string) => value,
      getMsnWeatherAzureSettingsFromEnvironment: () => ({ tenantId: tenant }),
      shouldObserveNativeConnectorIdentity,
      vscode: {
        extensions: {
          getExtension: () => ({ isActive: true, extensionPath: 'synthetic-extension', packageJSON: { main: 'main.js' } }),
        },
      },
      NativeConnectorIdentityObservation: {
        install: async (bundlePath: string, projectPath: string, fixtureTenant: string) => {
          calls.push('install');
          assert.strictEqual(bundlePath, path.resolve('synthetic-extension', 'main.js'));
          assert.strictEqual(projectPath, fixture.project);
          assert.strictEqual(fixtureTenant, tenant);
          if (scenario === 'install-failure') {
            throw primary;
          }
          return observer;
        },
      },
      openDesignerAndCreateWorkflowWithDotnetInstallRetry: async (_workspace: unknown, options: { warmOnly?: boolean }) => {
        calls.push(options.warmOnly ? 'warmup' : 'authoring');
        if (
          (options.warmOnly && scenario === 'warmup-failure') ||
          (!options.warmOnly && ['authoring-failure', 'authoring-and-disposal-failure'].includes(scenario))
        ) {
          throw primary;
        }
      },
      runLifecyclePhase: async (_workspace: unknown, _phase: unknown, run: () => Promise<void>) => run(),
      startDebuggingGeneratedWorkspace: async () => {
        calls.push('runtime');
        assert.ok(scenario === 'raw-token' || observer.isDisposed, 'Remove every probe before debug/runtime starts');
        if (scenario === 'runtime-failure') {
          throw primary;
        }
      },
      runWorkflowThroughOverviewAndAssertSucceeded: async () => ({ name: 'synthetic-run' }),
      openRunDetailsThroughOverview: async (_workspace: unknown, _run: unknown, run: (cdp: object, contextId: number) => Promise<void>) =>
        run({}, 1),
      recordMsnBodyAssertions: () => calls.push('body-passed'),
      observeMsnCleanupDiagnostics: ({ stage }: { stage: string }) => calls.push(stage),
      stopDebuggingAndTasks: async () => calls.push('stop'),
      operationDiagnostics: { summary: () => calls.push('summary') },
    });
    assert.ok(exports.runMsnWeatherLifecycle);
    let failure: unknown;
    try {
      await exports.runMsnWeatherLifecycle({ appType: 'standard', appDir: fixture.project, label: 'standard', wfName: 'synthetic' });
    } catch (error) {
      failure = error;
    }
    assert.deepStrictEqual(calls.slice(-4), ['before-task-teardown', 'stop', 'after-task-teardown', 'summary']);
    if (scenario === 'wif' || scenario === 'raw-token') {
      assert.strictEqual(failure, undefined);
      assert.ok(calls.includes('body-passed'));
      assert.strictEqual(logs.filter((line) => line.includes('[connector-identity-')).length, scenario === 'wif' ? 2 : 0);
    } else {
      assert.ok(failure && typeof failure === 'object' && 'errors' in failure, `Expected original aggregate for ${scenario}`);
      const errors = failure.errors as unknown[];
      assert.ok(errors.includes(scenario === 'disposal-failure' ? disposal : primary), 'Keep the original body/installation error');
      if (scenario === 'authoring-and-disposal-failure') {
        assert.ok(errors.includes(disposal), 'Disposal must not replace the original authoring error');
      }
      assert.ok(!calls.includes('body-passed'));
    }
    if (scenario === 'raw-token') {
      assert.ok(!calls.includes('install'), 'Raw-token-only authoring must not gain a WIF prerequisite');
    } else {
      assert.ok(calls.indexOf('install') < calls.indexOf('warmup') || scenario === 'install-failure');
      assert.strictEqual(calls.filter((call) => call === 'dispose').length, scenario === 'install-failure' ? 0 : 1);
    }
  }
}

async function main(): Promise<void> {
  assert.strictEqual(shouldObserveNativeConnectorIdentity({ LA_E2E_CLI_AZURE_ACCESS_TOKEN: token }), false);
  assert.strictEqual(
    shouldObserveNativeConnectorIdentity({
      FC_SERVICE_CONNECTION_ID: 'synthetic-connection',
      FC_SERVICE_CONNECTION_CLIENT_ID: client,
      FC_SERVICE_CONNECTION_TENANT_ID: tenant,
    }),
    true
  );
  assert.strictEqual(
    shouldObserveNativeConnectorIdentity({
      AzCode_ServiceConnectionID: 'synthetic-connection',
      AzCode_ServiceConnectionDomain: tenant,
      AzCode_ServiceConnectionClientID: client,
    }),
    true
  );
  await testSyntheticExecutionAndPrivacy();
  await testUncorrelatedSessionIsNotAttributedToWif();
  await testConditionFailureCannotReuseStaleEvidence();
  await testMissingOrAmbiguousSourceIsRejected();
  await testRealBundleProbeResolution();
  await testNativeLifecycleWiring();
  console.log('[nativeConnectorIdentityObservation.unit] synthetic privacy/execution and real-bundle binding controls passed');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
