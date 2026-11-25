/* Offline contract: installed SDK/product construction, synthetic external responses only. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const http2 = require('node:http2');
const net = require('node:net');
const tls = require('node:tls');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');

const app = path.resolve(__dirname, '..');
const appRequire = Module.createRequire(path.join(app, 'package.json'));
const ts = appRequire('typescript');
const tenant = '11111111-1111-4111-8111-111111111111';
const client = '22222222-2222-4222-8222-222222222222';
const subscription = '33333333-3333-4333-8333-333333333333';
const providerToken = 'SYNTHETIC_PROVIDER_CONTRACT_ONLY';
const rawToken = 'SYNTHETIC_RAW_CONTRACT_ONLY';

// Compile whole, unmodified product modules; replace only explicitly listed dependencies.
function loadProduct(relative, dependencies) {
  const filename = path.join(app, relative);
  const instance = new Module(filename);
  const localRequire = Module.createRequire(filename);
  instance.filename = filename;
  instance.require = (name) => (Object.hasOwn(dependencies, name) ? dependencies[name] : localRequire(name));
  instance._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename
  );
  return instance.exports;
}

test('installed Azure SDK and product auth contract (offline)', async (t) => {
  const originalEnv = process.env;
  const originalLoad = Module._load;
  let networkAttempts = 0;
  let service;
  const ext = {};
  const nativeCalls = [];
  let rows;
  let tokenValue;
  let tokenError;
  let listError;
  let tokenCalls = 0;
  let listCalls = 0;

  try {
    // Do not read inherited auth values, profiles, or caches. SDK loading happens only below.
    process.env = {};
    const denyNetwork = () => {
      networkAttempts++;
      throw new Error('Offline auth contract prohibits network access');
    };
    for (const [object, method] of [
      [http, 'request'],
      [http, 'get'],
      [https, 'request'],
      [https, 'get'],
      [http2, 'connect'],
      [net, 'connect'],
      [net, 'createConnection'],
      [net.Socket.prototype, 'connect'],
      [tls, 'connect'],
      [globalThis, 'fetch'],
    ]) {
      t.mock.method(object, method, denyNetwork);
    }
    // The SDK emits static sign-in messages; do not emit sessions or auth payloads.
    t.mock.method(console, 'log', () => {});

    const vscode = {
      workspace: {
        getConfiguration: (section) => ({
          get: (name, fallback) => (section === 'azureLogicAppsStandard' && name === 'silentAuth' ? true : fallback),
        }),
      },
      authentication: {
        getSession: async (provider, scopes, options) => {
          nativeCalls.push({ provider, scopes, options });
          return undefined;
        },
      },
    };
    Module._load = function (name, ...args) {
      return name === 'vscode' ? vscode : originalLoad.call(this, name, ...args);
    };
    let sdk;
    try {
      sdk = appRequire('@microsoft/vscode-azext-azureauth');
    } finally {
      Module._load = originalLoad;
    }
    const sdkRequire = Module.createRequire(appRequire.resolve('@microsoft/vscode-azext-azureauth'));
    const { ClientAssertionCredential } = sdkRequire('@azure/identity');
    const { SubscriptionClient } = sdkRequire('@azure/arm-resources-subscriptions');
    // Keep the real credential constructor but never invoke its assertion callback or auth implementation.
    t.mock.method(ClientAssertionCredential.prototype, 'getToken', async function (scopes) {
      assert.ok(this instanceof ClientAssertionCredential);
      assert.equal(this.tenantId, tenant);
      assert.equal(scopes, 'https://management.azure.com/.default');
      tokenCalls++;
      if (tokenError) {
        throw tokenError;
      }
      return { token: tokenValue, expiresOnTimestamp: Date.now() + 3600000 };
    });
    // Keep the real client and subscription paging; terminate before ARM transport/auth.
    t.mock.method(SubscriptionClient.prototype, 'sendOperationRequest', async function (_args, spec) {
      assert.ok(this instanceof SubscriptionClient);
      assert.equal(spec.path, '/subscriptions');
      listCalls++;
      if (listError) {
        throw listError;
      }
      return { value: rows };
    });

    service = loadProduct('src/app/utils/services/VSCodeAzureSubscriptionProvider.ts', {
      '@microsoft/vscode-azext-azureauth': sdk,
    });
    const auth = loadProduct('src/app/utils/codeless/getAuthorizationToken.ts', {
      '@microsoft/vscode-azext-azureauth': sdk,
      vscode,
      '../../../extensionVariables': { ext },
      '../../../localize': { localize: (_key, message) => message },
      '../services/VSCodeAzureSubscriptionProvider': service,
    });
    function reset(raw = false) {
      process.env = {
        FC_SERVICE_CONNECTION_ID: '44444444-4444-4444-8444-444444444444',
        FC_SERVICE_CONNECTION_TENANT_ID: tenant,
        FC_SERVICE_CONNECTION_CLIENT_ID: client,
        AGENT_BUILDDIRECTORY: 'synthetic-agent',
        SYSTEM_ACCESSTOKEN: 'SYNTHETIC_JOB_CONTRACT_ONLY',
        SYSTEM_TEAMFOUNDATIONCOLLECTIONURI: 'https://example.invalid/',
        SYSTEM_TEAMPROJECTID: 'synthetic-project',
        SYSTEM_PLANID: 'synthetic-plan',
        SYSTEM_JOBID: 'synthetic-job',
        VSCODE_RUNNING_TESTS: '1',
        ...(raw ? { LA_E2E_CLI_AZURE_ACCESS_TOKEN: rawToken } : {}),
      };
      service.resetAzureSubscriptionProviderForTests();
      ext.subscriptionProvider = undefined;
      nativeCalls.length = 0;
      rows = [{ subscriptionId: subscription, displayName: 'Synthetic subscription' }];
      tokenValue = providerToken;
      tokenError = undefined;
      listError = undefined;
      tokenCalls = 0;
      listCalls = 0;
    }
    async function createProvider() {
      ext.subscriptionProvider = await service.createAzureSubscriptionProvider();
      assert.ok(ext.subscriptionProvider instanceof sdk.AzureDevOpsSubscriptionProvider);
      assert.equal(await ext.subscriptionProvider.isSignedIn(), true);
      return ext.subscriptionProvider;
    }
    function assertNativeSilent(requestedTenant) {
      assert.deepEqual(nativeCalls, [
        {
          provider: 'microsoft',
          scopes: ['https://management.core.windows.net/.default', `VSCODE_TENANT:${requestedTenant}`],
          options: { silent: true },
        },
      ]);
    }

    for (const raw of [false, true]) {
      await t.test(`real WIF session wins with synthetic raw token ${raw ? 'present' : 'absent'}`, async () => {
        reset(raw);
        await createProvider();
        const session = await auth.getAuthData(tenant);
        assert.equal(session.accessToken, providerToken);
        assert.equal(session.id, tenant);
        assert.deepEqual(session.account, { id: tenant, label: tenant });
        assert.deepEqual(session.scopes, []);
        assert.equal(tokenCalls, 1);
        assert.equal(listCalls, 1);
        assert.deepEqual(nativeCalls, []);
      });
    }

    await t.test('signed-out provider reacquires; later helper calls obtain new tokens, not mutated snapshots', async () => {
      reset();
      const provider = await createProvider();
      await provider.signOut();
      assert.equal(await provider.isSignedIn(), false);
      const first = await auth.getAuthData(tenant);
      assert.equal(await provider.isSignedIn(), true);
      tokenValue = 'SYNTHETIC_REFRESH_CONTRACT_ONLY';
      const next = await auth.getAuthData();
      assert.equal(first.accessToken, providerToken);
      assert.equal(next.accessToken, tokenValue);
      assert.equal(tokenCalls, 2);
      assert.equal(listCalls, 2);
      assert.deepEqual(nativeCalls, []);
    });

    await t.test('real connector caller retains the known tenant-only account parsing mismatch', async () => {
      reset();
      await createProvider();
      const constants = {
        workflowTenantIdKey: 'WORKFLOWS_TENANT_ID',
        workflowSubscriptionIdKey: 'WORKFLOWS_SUBSCRIPTION_ID',
        workflowResourceGroupNameKey: 'WORKFLOWS_RESOURCE_GROUP_NAME',
        workflowLocationKey: 'WORKFLOWS_LOCATION_NAME',
        workflowManagementBaseURIKey: 'WORKFLOWS_MANAGEMENT_BASE_URI',
        azurePublicBaseUrl: 'https://management.azure.com',
      };
      const connector = loadProduct('src/app/commands/azureConnectors/azureConnectorDetails.ts', {
        '../../../constants': constants,
        './azureConnectorWizard': {
          createAzureWizard: () => assert.fail('Contract must not open a wizard'),
        },
        '../../state/connectors': {},
        '../../utils/appSettings/localSettings': {
          getLocalSettingsJson: async () => ({
            Values: {
              [constants.workflowTenantIdKey]: tenant,
              [constants.workflowSubscriptionIdKey]: subscription,
              [constants.workflowResourceGroupNameKey]: 'synthetic-resource-group',
              [constants.workflowLocationKey]: 'westus',
            },
          }),
        },
        '../../utils/codeless/getAuthorizationToken': auth,
        '@microsoft/vscode-azext-utils': {},
      });
      const details = await connector.getAzureConnectorDetailsForLocalProject(
        { telemetry: { properties: {} } },
        'synthetic-installed-sdk-project'
      );
      assert.deepEqual(details, {
        enabled: true,
        accessToken: `Bearer ${providerToken}`,
        subscriptionId: subscription,
        resourceGroupName: 'synthetic-resource-group',
        location: 'westus',
        // Characterization only, NOT desired semantics or an auth defect fix.
        tenantId: undefined,
        clientId: tenant,
        workflowManagementBaseUrl: 'https://management.azure.com/',
      });
      assert.equal(tokenCalls, 1);
      assert.equal(listCalls, 1);
      assert.deepEqual(nativeCalls, []);
    });

    for (const missing of ['empty subscriptions', 'wrong requested tenant']) {
      await t.test(`${missing} does not synthesize a raw-token session`, async () => {
        reset(true);
        await createProvider();
        if (missing === 'empty subscriptions') {
          rows = [];
        }
        const requestedTenant = missing === 'empty subscriptions' ? tenant : '55555555-5555-4555-8555-555555555555';
        const session = await auth.getAuthData(requestedTenant);
        assertNativeSilent(requestedTenant);
        assert.equal(tokenCalls, 1);
        assert.equal(listCalls, 1);
        assert.equal(session, undefined);
      });
    }

    for (const boundary of ['token', 'subscription list']) {
      await t.test(`${boundary} failure propagates without native or raw fallback`, async () => {
        reset(true);
        await createProvider();
        const failure = new Error(`Synthetic ${boundary} failure`);
        if (boundary === 'token') {
          tokenError = failure;
        } else {
          listError = failure;
        }
        await assert.rejects(
          () => auth.getAuthData(tenant),
          (error) => error === failure
        );
        assert.equal(tokenCalls, 1);
        assert.equal(listCalls, boundary === 'token' ? 0 : 1);
        assert.deepEqual(nativeCalls, []);
      });
    }

    await t.test('missing ADO job context fails in the installed SDK before fallback', async () => {
      reset(true);
      delete process.env.SYSTEM_JOBID;
      await assert.rejects(() => service.createAzureSubscriptionProvider(), /environment variables are not set/);
      assert.equal(tokenCalls, 0);
      assert.equal(listCalls, 0);
      assert.deepEqual(nativeCalls, []);
    });

    await t.test('incomplete federated metadata fails in product configuration before fallback', async () => {
      reset(true);
      delete process.env.FC_SERVICE_CONNECTION_CLIENT_ID;
      await assert.rejects(() => auth.getAuthData(tenant), /not fully configured/);
      assert.equal(tokenCalls, 0);
      assert.equal(listCalls, 0);
      assert.deepEqual(nativeCalls, []);
    });
  } finally {
    service?.resetAzureSubscriptionProviderForTests();
    delete ext.subscriptionProvider;
    Module._load = originalLoad;
    t.mock.restoreAll();
    process.env = originalEnv;
    // Also fail if code swallowed a denied network attempt.
    assert.equal(networkAttempts, 0, 'No network attempt is allowed, even if its error was caught');
  }
});
