import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StandardRunService } from '@microsoft/logic-apps-shared';
import { HttpClient } from '@microsoft/vscode-extension-logic-apps';
import axios from 'axios';
import path from 'path';
import { readFileSync } from 'fs';
import {
  assertCodefulMonitoringContext,
  getCodefulMonitoringContext,
  prepareCodefulRunSnapshot,
  type CodefulMonitoringContext,
} from '../codefulMonitoring';

vi.mock('../../../../../localize', () => ({
  localize: (_key: string, message: string) => message,
}));

// Only the transport is mocked: the helper, StandardRunService and extension HttpClient are real.
vi.mock('axios', () => ({ default: vi.fn() }));

const projectPath = path.resolve('offline-fixtures', 'codeful-project');
const runtimeBaseUrl = 'http://localhost:17071/runtime/webhooks/workflow/api/management';
const apiVersion = '2019-10-01-edge-preview';
const workflowName = 'workflow alpha';
const runId = 'run+1';
const context = { telemetry: { properties: {} } } as any;
const sourceUri = { scheme: 'file', fsPath: path.join(projectPath, 'Program.cs') } as any;

function fixture() {
  return {
    id: `/workflows/${encodeURIComponent(workflowName)}/runs/${encodeURIComponent(runId)}`,
    name: runId,
    properties: {
      workflow: {
        id: `/workflows/${encodeURIComponent(workflowName)}/versions/historical-version`,
        name: 'historical-version',
        type: 'Microsoft.Logic/workflows/versions',
        location: null,
        envelopeExtension: { date: new Date('2024-02-03T04:05:06.000Z'), bytes: new Uint8Array([0, 255]) },
        properties: {
          kind: 'Stateful',
          definition: {
            $schema: 'https://schema.invalid/custom-workflow',
            contentVersion: '4.2.0.0',
            triggers: {
              executedTrigger: {
                type: 'Request',
                kind: 'Http',
                inputs: { schema: { type: 'object', properties: { id: { type: 'string', format: 'custom-id-format' } } } },
              },
            },
            actions: { HistoricalAction: { type: 'Compose', inputs: [null, false, 0, 1.25, '001', '@triggerBody()'] } },
            parameters: { nullable: { type: 'Object', defaultValue: null } },
            unknownDefinitionField: { numeric: 1.25, boolean: false },
          },
          parameters: { nullable: { value: null }, typed: { type: 'Int', value: 0 } },
          connections: null,
          connectionReferences: { preserved: { connectionName: 'authoring-connection' } },
          customCode: { unchanged: true },
          unknownProperties: [null, false, 0, '001'],
        },
      },
    },
  };
}

function freezeFixture<T>(value: T): T {
  if (value && typeof value === 'object' && !ArrayBuffer.isView(value)) {
    for (const child of Object.values(value)) {
      freezeFixture(child);
    }
    Object.freeze(value);
  }
  return value;
}

function load(overrides: { source?: any; project?: string; workflow?: string; run?: string } = {}) {
  return getCodefulMonitoringContext(
    context,
    overrides.source ?? sourceUri,
    overrides.project ?? projectPath,
    overrides.workflow ?? workflowName,
    overrides.run ?? runId,
    runtimeBaseUrl,
    apiVersion,
    'Stateless'
  );
}

describe('codeful monitoring snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    context.telemetry.properties = {};
  });

  it('preserves the full frozen versioned envelope and every property without coercion or synthetic definition', () => {
    const run = freezeFixture(fixture());
    const prepared = prepareCodefulRunSnapshot(run, workflowName, runId, 'Stateless');
    const snapshot = run.properties.workflow;

    expect(prepared.workflowSnapshot).toBe(snapshot);
    expect(prepared.workflowContent).toEqual(snapshot.properties);
    expect(prepared.workflowContent.definition).toBe(snapshot.properties.definition);
    expect(prepared.workflowContent.parameters).toBe(snapshot.properties.parameters);
    expect(prepared.workflowContent.unknownProperties).toBe(snapshot.properties.unknownProperties);
    expect(prepared.workflowContent.connections).toBeNull();
    expect(prepared.workflowContent.kind).toBe('Stateful');
    expect(prepared.workflowSnapshot.envelopeExtension).toBe(snapshot.envelopeExtension);
    expect(prepared.workflowSnapshot).toEqual(fixture().properties.workflow);
    expect(Object.isFrozen(snapshot.properties.definition)).toBe(true);
    expect(prepared.definitionOrigin).toEqual({ type: 'runtime-run', workflowName, runId });
  });

  it('accepts absent optional resource IDs but still requires the requested run name', () => {
    const run: any = fixture();
    delete run.id;
    delete run.properties.workflow.id;
    expect(prepareCodefulRunSnapshot(run, workflowName, runId, 'Stateful').workflowSnapshot).toBe(run.properties.workflow);
    run.name = 'another-run';
    expect(() => prepareCodefulRunSnapshot(run, workflowName, runId, 'Stateful')).toThrow('selected codeful run');
  });

  it.each(['run workflow', 'run name', 'snapshot workflow'])(
    'reports malformed percent escapes in %s as an actionable identity error',
    (field) => {
      const run = fixture();
      if (field === 'run workflow') {
        run.id = '/workflows/%ZZ/runs/run';
      } else if (field === 'run name') {
        run.id = `/workflows/${encodeURIComponent(workflowName)}/runs/%ZZ`;
      } else {
        run.properties.workflow.id = '/workflows/%ZZ/versions/historical-version';
      }
      expect(() => prepareCodefulRunSnapshot(run, workflowName, runId, 'Stateful')).toThrow('invalid workflow or run resource identity');
    }
  );

  it.each([
    [
      'wrong run name',
      (run: any) => {
        run.name = 'other-run';
      },
    ],
    [
      'wrong workflow in run ID',
      (run: any) => {
        run.id = `/workflows/other/runs/${runId}`;
      },
    ],
    [
      'wrong run in run ID',
      (run: any) => {
        run.id = `/workflows/${encodeURIComponent(workflowName)}/runs/other`;
      },
    ],
    [
      'invalid run ID',
      (run: any) => {
        run.id = null;
      },
    ],
    [
      'wrong workflow in version ID',
      (run: any) => {
        run.properties.workflow.id = '/workflows/other/versions/v1';
      },
    ],
  ])('rejects %s', (_label, change) => {
    const run = fixture();
    change(run);
    expect(() => prepareCodefulRunSnapshot(run, workflowName, runId, 'Stateful')).toThrow();
  });

  it.each([
    undefined,
    null,
    {},
    { definition: { actions: {}, triggers: {} } },
    { properties: { definition: null } },
    { properties: { definition: { actions: {} } } },
    { properties: { definition: { triggers: {} } } },
    { properties: { definition: { actions: [], triggers: {} } } },
    { properties: { definition: { actions: {}, triggers: null } } },
  ])('rejects incomplete workflow envelope %j instead of fabricating a definition', (snapshot) => {
    expect(() => prepareCodefulRunSnapshot({ name: runId, properties: { workflow: snapshot } }, workflowName, runId, 'Stateful')).toThrow(
      'no complete compiled workflow definition'
    );
  });

  it.each([undefined, null, [], {}, { name: runId }])('rejects unavailable run %j', (run) => {
    expect(() => prepareCodefulRunSnapshot(run, workflowName, runId, 'Stateful')).toThrow('selected codeful run');
  });

  it('uses the envelope kind and then selected workflow kind only when kind is absent', () => {
    const run: any = fixture();
    delete run.properties.workflow.properties.kind;
    run.properties.workflow.kind = 'Agent';
    expect(prepareCodefulRunSnapshot(run, workflowName, runId, 'Stateless').workflowContent.kind).toBe('Agent');
    delete run.properties.workflow.kind;
    expect(prepareCodefulRunSnapshot(run, workflowName, runId, 'Stateless').workflowContent.kind).toBe('Stateless');
  });

  it.each([null, 0, false, ''])('rejects invalid kind %j rather than coercing it', (kind) => {
    const run: any = fixture();
    run.properties.workflow.properties.kind = kind;
    expect(() => prepareCodefulRunSnapshot(run, workflowName, runId, 'Stateful')).toThrow('invalid workflow kind');
  });
});

describe('getCodefulMonitoringContext real service/client integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    context.telemetry.properties = {};
    vi.mocked(axios).mockResolvedValue({ data: freezeFixture(fixture()), status: 200 });
  });

  it.each(['Program.cs', 'Workflow.cs'])('loads %s via the real expanded GET and preserves the versioned snapshot', async (fileName) => {
    const source = { scheme: 'file', fsPath: path.join(projectPath, fileName) } as any;
    const run = freezeFixture(fixture());
    vi.mocked(axios).mockResolvedValue({ data: run, status: 200 });
    const getRun = vi.spyOn(StandardRunService.prototype, 'getRun');
    const dispose = vi.spyOn(HttpClient.prototype, 'dispose');
    // Standard IDs also arrive with an unescaped final segment from the overview.
    const selectedRunId = `/workflows/${encodeURIComponent(workflowName)}/runs/${runId}`;
    const monitoring = await load({ source, run: selectedRunId });

    expect(getRun).toHaveBeenCalledWith(encodeURIComponent(runId));
    expect(axios).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        method: 'GET',
        url: `${runtimeBaseUrl}/workflows/workflow%20alpha/runs/run%2B1?api-version=${apiVersion}&$expand=properties/actions,workflow/properties`,
      })
    );
    expect(monitoring.sourceUri).toBe(source);
    expect(monitoring.projectPath).toBe(projectPath);
    expect(monitoring.runtimeBaseUrl).toBe(runtimeBaseUrl);
    expect(monitoring.runId).toBe(runId);
    expect(monitoring.workflowSnapshot).toBe(run.properties.workflow);
    expect(monitoring.workflowContent.definition).toBe(run.properties.workflow.properties.definition);
    expect(context.telemetry.properties.codefulMonitoringDefinitionOrigin).toBe('runtime-run');
    expect(dispose).toHaveBeenCalledOnce();
    expect(readFileSync).not.toHaveBeenCalled();
    expect(() => assertCodefulMonitoringContext(monitoring, source, selectedRunId)).not.toThrow();
  });

  it('accepts a percent-encoded full run resource ID without double encoding its final segment', async () => {
    const monitoring = await load({ run: fixture().id });
    expect(axios).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        url: `${runtimeBaseUrl}/workflows/workflow%20alpha/runs/run%2B1?api-version=${apiVersion}&$expand=properties/actions,workflow/properties`,
      })
    );
    expect(monitoring.runId).toBe(runId);
    expect(() => assertCodefulMonitoringContext(monitoring, sourceUri, fixture().id)).not.toThrow();
  });

  it('disposes the client and reports an actionable error on transport failure without leaking transport details', async () => {
    const dispose = vi.spyOn(HttpClient.prototype, 'dispose');
    vi.mocked(axios).mockRejectedValue(new Error('mock transport internal detail'));
    await expect(load()).rejects.toThrow('compiled definition for the selected codeful run could not be loaded');
    expect(dispose).toHaveBeenCalledOnce();
    expect(context.telemetry.properties).not.toHaveProperty('codefulMonitoringDefinitionOrigin');
  });

  it('rejects malformed resource escapes before transport with the localized identity diagnostic', async () => {
    await expect(load({ run: '/workflows/%ZZ/runs/run' })).rejects.toThrow('invalid workflow or run resource identity');
    expect(axios).not.toHaveBeenCalled();
  });

  it('disposes the client and rejects incomplete runtime responses', async () => {
    const dispose = vi.spyOn(HttpClient.prototype, 'dispose');
    vi.mocked(axios).mockResolvedValue({ data: { name: runId, properties: {} } });
    await expect(load()).rejects.toThrow('no complete compiled workflow definition');
    expect(dispose).toHaveBeenCalledOnce();
  });

  it.each(['', '.', '..', 'other/name', 'other\\name', 'name?query', 'name#fragment'])(
    'rejects invalid workflow %j before transport',
    async (workflow) => {
      await expect(load({ workflow })).rejects.toThrow('Select a named codeful workflow');
      expect(axios).not.toHaveBeenCalled();
    }
  );

  it.each(['', '.', '..', 'run\\name', 'run?query', 'run#fragment', '/workflows/other/runs/run'])(
    'rejects invalid run %j before transport',
    async (run) => {
      await expect(load({ run })).rejects.toThrow();
      expect(axios).not.toHaveBeenCalled();
    }
  );

  it.each([
    { scheme: 'file', fsPath: path.join(projectPath, '..', 'elsewhere', 'Workflow.cs') },
    { scheme: 'file', fsPath: path.join(`${projectPath}-sibling`, 'Workflow.cs') },
    { scheme: 'file', fsPath: path.join(projectPath, 'workflow.json') },
    { scheme: 'vscode-remote', fsPath: sourceUri.fsPath },
  ])('rejects out-of-scope/non-C# source %j before transport', async (source) => {
    await expect(load({ source })).rejects.toThrow('must belong to the selected authoring project');
    expect(axios).not.toHaveBeenCalled();
  });

  it.each([
    [
      'source',
      (monitoring: CodefulMonitoringContext) => {
        monitoring.sourceUri = { ...sourceUri, fsPath: path.join(projectPath, 'Other.cs') };
      },
    ],
    [
      'run',
      (monitoring: CodefulMonitoringContext) => {
        monitoring.runId = 'other';
      },
    ],
    [
      'workflow origin',
      (monitoring: CodefulMonitoringContext) => {
        monitoring.definitionOrigin.workflowName = 'other';
      },
    ],
    [
      'run origin',
      (monitoring: CodefulMonitoringContext) => {
        monitoring.definitionOrigin.runId = 'other';
      },
    ],
    [
      'definition identity',
      (monitoring: CodefulMonitoringContext) => {
        monitoring.workflowContent = { ...monitoring.workflowContent, definition: { actions: {}, triggers: {} } };
      },
    ],
  ])('rejects mismatched %s context at the panel boundary', async (_label, change) => {
    const monitoring = await load();
    change(monitoring);
    expect(() => assertCodefulMonitoringContext(monitoring, sourceUri, runId)).toThrow('does not match');
  });
});
