import { describe, it, expect, beforeEach, vi } from 'vitest';

// Extend the partial `fs` mock from test-setup with the sync APIs this suite needs.
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  statSync: vi.fn(),
  copyFileSync: vi.fn(),
  chmodSync: vi.fn(),
  createWriteStream: vi.fn(),
}));

import * as fs from 'fs';
import { GenerateADODeploymentScriptsStep } from '../GenerateADODeploymentScriptsStep';

// Reach into the class for the private static helpers under test.
const Cls = GenerateADODeploymentScriptsStep as unknown as {
  generateHybridArmTemplate: () => any;
  generateHybridArmParameters: (context: any) => any;
  transformConnectionTemplatesForHybrid: (folder: string) => void;
  fixAccessPolicyIdentityForHybrid: (resources: any[]) => void;
};

describe('generateHybridArmTemplate', () => {
  const template = Cls.generateHybridArmTemplate();

  it('declares the three Container Apps + nested storage resources', () => {
    const types = (template.resources as any[]).map((r) => r.type);
    expect(types).toContain('Microsoft.Resources/deployments');
    expect(types).toContain('Microsoft.App/containerApps');
    expect(types).toContain('Microsoft.App/logicApps');
  });

  it('declares secrets as securestring parameters', () => {
    const params = template.parameters as Record<string, { type: string }>;
    expect(params.sqlConnectionString.type).toBe('securestring');
    expect(params.fileSharePassword.type).toBe('securestring');
    expect(params.aadClientSecret.type).toBe('securestring');
  });

  it('container app exposes WORKFLOWAPP_AAD_* env vars from parameters and secret refs', () => {
    const containerApp = (template.resources as any[]).find((r) => r.type === 'Microsoft.App/containerApps');
    const env = containerApp.properties.template.containers[0].env as { name: string; value?: string; secretRef?: string }[];
    const names = env.map((e) => e.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'WORKFLOWAPP_AAD_CLIENTID',
        'WORKFLOWAPP_AAD_CLIENTSECRET',
        'WORKFLOWAPP_AAD_OBJECTID',
        'WORKFLOWAPP_AAD_TENANTID',
      ])
    );
    expect(env.find((e) => e.name === 'WORKFLOWAPP_AAD_CLIENTSECRET')?.secretRef).toBe('aad-client-secret');
  });

  it('nested storage deployment uses outer-scope expression evaluation', () => {
    const nested = (template.resources as any[]).find((r) => r.type === 'Microsoft.Resources/deployments');
    expect(nested.properties.expressionEvaluationOptions.scope).toBe('outer');
  });
});

describe('generateHybridArmParameters', () => {
  it('populates context-derived values and omits secret parameters', () => {
    const params = Cls.generateHybridArmParameters({
      subscriptionId: 'sub-1',
      logicAppName: 'la-1',
      resourceGroup: { name: 'rg-1', location: 'eastus' },
      connectedEnvironmentName: 'ce-1',
      connectedEnvironmentResourceGroup: 'rg-ce',
    } as any).parameters as Record<string, { value: string }>;

    expect(params.logicAppName.value).toBe('la-1');
    expect(params.location.value).toBe('eastus');
    expect(params.connectedEnvironmentName.value).toBe('ce-1');
    expect(params.connectedEnvironmentResourceGroup.value).toBe('rg-ce');

    // Secrets must be set via ADO pipeline secret variables, never the parameters file.
    expect(params.sqlConnectionString).toBeUndefined();
    expect(params.fileSharePassword).toBeUndefined();
    expect(params.aadClientSecret).toBeUndefined();
  });

  it('falls back to placeholders when optional context fields are missing', () => {
    const params = Cls.generateHybridArmParameters({
      logicAppName: 'la-1',
      resourceGroup: undefined,
    } as any).parameters as Record<string, { value: string }>;

    expect(params.subscriptionId.value).toBe('<your-subscription-id>');
    expect(params.location.value).toBe('');
    expect(params.connectedEnvironmentName.value).toBe('');
  });
});

describe('fixAccessPolicyIdentityForHybrid', () => {
  it('replaces Microsoft.Web/Sites identity refs with AAD parameter references', () => {
    const resources = [
      {
        type: 'accessPolicies',
        properties: {
          principal: {
            identity: {
              objectId:
                "[reference(resourceId('Microsoft.Web/sites', parameters('logicAppName')), '2018-02-01', 'Full').identity.principalId]",
              tenantId:
                "[reference(resourceId('Microsoft.Web/sites', parameters('logicAppName')), '2018-02-01', 'Full').identity.tenantId]",
            },
          },
        },
      },
    ];

    Cls.fixAccessPolicyIdentityForHybrid(resources);

    expect(resources[0].properties.principal.identity.objectId).toBe("[parameters('aadObjectId')]");
    expect(resources[0].properties.principal.identity.tenantId).toBe("[parameters('aadTenantId')]");
  });

  it('recurses into nested resources', () => {
    const resources = [
      {
        type: 'parent',
        resources: [
          {
            type: 'accessPolicies',
            properties: {
              principal: {
                identity: {
                  objectId: 'something microsoft.web/sites else',
                  tenantId: 'static-tenant',
                },
              },
            },
          },
        ],
      },
    ];

    Cls.fixAccessPolicyIdentityForHybrid(resources);

    const inner = (resources[0] as any).resources[0];
    expect(inner.properties.principal.identity.objectId).toBe("[parameters('aadObjectId')]");
    // tenantId did not reference Microsoft.Web/sites, so it stays untouched.
    expect(inner.properties.principal.identity.tenantId).toBe('static-tenant');
  });

  it('leaves non-accessPolicies resources untouched', () => {
    const resources = [{ type: 'Microsoft.Web/connections', properties: { displayName: 'sql' } }];

    Cls.fixAccessPolicyIdentityForHybrid(resources);

    expect(resources[0]).toEqual({ type: 'Microsoft.Web/connections', properties: { displayName: 'sql' } });
  });
});

describe('transformConnectionTemplatesForHybrid', () => {
  const sampleTemplate = {
    parameters: { existing: { type: 'String' } },
    resources: [
      {
        type: 'accessPolicies',
        properties: {
          principal: {
            identity: {
              objectId: "[reference(resourceId('Microsoft.Web/sites', 'la'), '2018-02-01', 'Full').identity.principalId]",
              tenantId: "[reference(resourceId('Microsoft.Web/sites', 'la'), '2018-02-01', 'Full').identity.tenantId]",
            },
          },
        },
      },
    ],
  };

  const sampleParameters = { parameters: { existing: { value: 'x' } } };

  let writes: Record<string, string>;

  beforeEach(() => {
    writes = {};

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync as any).mockImplementation(((p: string) => {
      // Two passes: template files first, then parameters files.
      if ((fs.readdirSync as any).mock.calls.length === 1) {
        return ['sql.template.json', 'hybrid-logicapp-template.json'];
      }
      return ['sql.parameters.json', 'hybrid-logicapp-parameters.json'];
    }) as any);
    vi.mocked(fs.readFileSync as any).mockImplementation(((p: string) => {
      if (String(p).endsWith('.template.json')) return JSON.stringify(sampleTemplate);
      if (String(p).endsWith('.parameters.json')) return JSON.stringify(sampleParameters);
      return '{}';
    }) as any);
    vi.mocked(fs.writeFileSync as any).mockImplementation(((p: string, data: string) => {
      writes[String(p)] = String(data);
    }) as any);
  });

  it('adds AAD parameters, rewrites identity refs, and ignores the hybrid template files', () => {
    Cls.transformConnectionTemplatesForHybrid('/fake/infra');

    const written = Object.keys(writes);
    // Only the per-connection files should be rewritten.
    expect(written.some((p) => p.endsWith('sql.template.json'))).toBe(true);
    expect(written.some((p) => p.endsWith('sql.parameters.json'))).toBe(true);
    expect(written.some((p) => p.endsWith('hybrid-logicapp-template.json'))).toBe(false);
    expect(written.some((p) => p.endsWith('hybrid-logicapp-parameters.json'))).toBe(false);

    const updatedTemplate = JSON.parse(writes[written.find((p) => p.endsWith('sql.template.json'))!]);
    expect(updatedTemplate.parameters.aadObjectId).toEqual({ type: 'String' });
    expect(updatedTemplate.parameters.aadTenantId).toEqual({ type: 'String' });
    expect(updatedTemplate.resources[0].properties.principal.identity.objectId).toBe("[parameters('aadObjectId')]");

    const updatedParams = JSON.parse(writes[written.find((p) => p.endsWith('sql.parameters.json'))!]);
    expect(updatedParams.parameters.aadObjectId).toEqual({ value: '' });
    expect(updatedParams.parameters.aadTenantId).toEqual({ value: '' });
  });

  it('is a no-op when the infrastructure folder does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    Cls.transformConnectionTemplatesForHybrid('/missing');

    expect(fs.readdirSync as any).not.toHaveBeenCalled();
    expect(fs.writeFileSync as any).not.toHaveBeenCalled();
  });
});
