import { describe, it, expect, vi, type Mock } from 'vitest';
import type { OperationManifest } from '@microsoft/logic-apps-shared';

// Mock external dependencies before importing the module under test.
vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    OperationManifestService: () => ({
      isSupported: () => true,
    }),
    LoggerService: () => ({
      log: vi.fn(),
    }),
  };
});

vi.mock('../../../queries/operation', () => ({
  getOperationManifest: vi.fn(),
}));

vi.mock('../../../utils/graph', () => ({
  isTriggerNode: () => false,
  isRootNode: () => true,
  getTriggerNodeId: () => 'trigger',
  getNode: () => undefined,
}));

vi.mock('../../../state/workflow/helper', () => ({
  isA2AWorkflow: () => false,
  isBuiltInMcpOperation: () => false,
  isManagedMcpOperation: () => false,
}));

import { serializeOperation } from '../serializer';
import { getOperationManifest } from '../../../queries/operation';
import { DynamicLoadStatus, ErrorLevel } from '../../../state/operation/operationMetadataSlice';
import type { RootState } from '../../../store';
import type { ParameterInfo } from '@microsoft/designer-ui';

const minimalManifest: OperationManifest = {
  properties: {
    iconUri: 'https://test',
    brandColor: '#000',
    description: 'test operation',
    summary: 'test',
    inputs: {},
    outputs: {},
    connector: { id: 'test', name: 'test', type: 'test' },
    inputsLocation: ['inputs'],
    isInputsOptional: false,
    // No connectionReference → serializeHost returns undefined
    // No recurrence → no recurrence block
    // No allowChildOperations → no nested operations
  },
} as unknown as OperationManifest;

const createMockParameter = (overrides: Partial<ParameterInfo> & { parameterKey: string }): ParameterInfo =>
  ({
    id: overrides.parameterKey,
    parameterName: overrides.parameterKey,
    label: overrides.parameterKey,
    required: false,
    type: 'string',
    value: [{ id: '1', type: 'literal', value: overrides.parameterKey + '-value' }],
    info: {
      isDynamic: false,
      ...overrides.info,
    },
    ...overrides,
  }) as ParameterInfo;

const createMockRootState = (overrides: any = {}): RootState =>
  ({
    workflow: {
      idReplacements: {},
      operations: {},
      nodesMetadata: {},
      graph: { id: 'root', children: [] },
      ...overrides.workflow,
    },
    operations: {
      inputParameters: {},
      outputParameters: {},
      operationInfo: {},
      errors: {},
      settings: {},
      staticResults: {},
      actionMetadata: {},
      ...overrides.operations,
    },
    connections: {
      connectionsMapping: {},
      ...overrides.connections,
    },
  }) as unknown as RootState;

describe('serializeOperation – DynamicInputs error merge with original definition', () => {
  const operationId = 'myAction';

  it('should merge originalDef.inputs into serializedOperation.inputs on DynamicInputs error, with user edits winning', async () => {
    (getOperationManifest as Mock).mockResolvedValue(minimalManifest);

    // Static parameter the user edited (changed method from GET to POST)
    const editedStaticParam = createMockParameter({
      parameterKey: 'inputs.$.method',
      value: [{ id: '1', type: 'literal', value: 'POST' }],
    });

    const rootState = createMockRootState({
      workflow: {
        operations: {
          [operationId]: {
            type: 'Http',
            inputs: {
              method: 'GET',
              body: {
                tableName: 'original-table',
                column1: 'original-value',
              },
            },
          },
        },
        nodesMetadata: {
          [operationId]: { graphId: 'root', isRoot: true },
        },
      },
      operations: {
        operationInfo: {
          [operationId]: { type: 'Http', connectorId: 'http', operationId: 'httpaction' },
        },
        inputParameters: {
          [operationId]: {
            dynamicLoadStatus: undefined,
            parameterGroups: {
              default: {
                id: 'default',
                description: '',
                parameters: [editedStaticParam],
                rawInputs: [],
              },
            },
            // No stash — simulates initial load failure where nothing was stashed
          },
        },
        errors: {
          [operationId]: {
            [ErrorLevel.DynamicInputs]: {
              level: ErrorLevel.DynamicInputs,
              message: 'Failed to retrieve dynamic schema.',
            },
          },
        },
        settings: { [operationId]: {} },
        staticResults: {},
        actionMetadata: {},
      },
    });

    const result = await serializeOperation(rootState, operationId);

    // User-edited value wins over the original
    expect(result).not.toBeNull();
    expect(result!.inputs.method).toBe('POST');

    // Original dynamic values are preserved through the merge
    expect(result!.inputs.body).toEqual({
      tableName: 'original-table',
      column1: 'original-value',
    });
  });

  it('should merge originalDef.inputs when dynamic loading is in progress (no error yet), preserving dynamic values', async () => {
    (getOperationManifest as Mock).mockResolvedValue(minimalManifest);

    const staticParam = createMockParameter({
      parameterKey: 'inputs.$.method',
      value: [{ id: '1', type: 'literal', value: 'POST' }],
    });

    const rootState = createMockRootState({
      workflow: {
        operations: {
          [operationId]: {
            type: 'Http',
            inputs: {
              method: 'GET',
              body: {
                tableName: 'original-table',
                column1: 'original-value',
              },
            },
          },
        },
        nodesMetadata: {
          [operationId]: { graphId: 'root', isRoot: true },
        },
      },
      operations: {
        operationInfo: {
          [operationId]: { type: 'Http', connectorId: 'http', operationId: 'httpaction' },
        },
        inputParameters: {
          [operationId]: {
            dynamicLoadStatus: DynamicLoadStatus.NOTSTARTED,
            parameterGroups: {
              default: {
                id: 'default',
                description: '',
                parameters: [staticParam],
                rawInputs: [],
              },
            },
            // No stash — dynamic params were never in state (initial load, schema not fetched yet)
          },
        },
        // No DynamicInputs error — loading is still in progress
        errors: {},
        settings: { [operationId]: {} },
        staticResults: {},
        actionMetadata: {},
      },
    });

    const result = await serializeOperation(rootState, operationId);

    expect(result).not.toBeNull();
    // User-edited static value is preserved
    expect(result!.inputs.method).toBe('POST');

    // Original dynamic values are preserved through the merge even without an error
    expect(result!.inputs.body).toEqual({
      tableName: 'original-table',
      column1: 'original-value',
    });
  });

  it('should NOT merge when DynamicInputs error is absent (normal save)', async () => {
    (getOperationManifest as Mock).mockResolvedValue(minimalManifest);

    const staticParam = createMockParameter({
      parameterKey: 'inputs.$.method',
      value: [{ id: '1', type: 'literal', value: 'POST' }],
    });

    const rootState = createMockRootState({
      workflow: {
        operations: {
          [operationId]: {
            type: 'Http',
            inputs: {
              method: 'GET',
              body: { tableName: 'original-table' },
            },
          },
        },
        nodesMetadata: {
          [operationId]: { graphId: 'root', isRoot: true },
        },
      },
      operations: {
        operationInfo: {
          [operationId]: { type: 'Http', connectorId: 'http', operationId: 'httpaction' },
        },
        inputParameters: {
          [operationId]: {
            parameterGroups: {
              default: {
                id: 'default',
                description: '',
                parameters: [staticParam],
                rawInputs: [],
              },
            },
          },
        },
        errors: {},
        settings: { [operationId]: {} },
        staticResults: {},
        actionMetadata: {},
      },
    });

    const result = await serializeOperation(rootState, operationId);

    expect(result).not.toBeNull();
    expect(result!.inputs.method).toBe('POST');
    // body should NOT appear because there's no merge — only current state is serialized
    expect(result!.inputs.body).toBeUndefined();
  });

  it('should NOT merge when stashed parameters exist (stash path handles preservation instead)', async () => {
    (getOperationManifest as Mock).mockResolvedValue(minimalManifest);

    const staticParam = createMockParameter({
      parameterKey: 'inputs.$.method',
      value: [{ id: '1', type: 'literal', value: 'POST' }],
    });
    const stashedDynamicParam = createMockParameter({
      parameterKey: 'inputs.$.body.tableName',
      info: { isDynamic: true, dynamicParameterReference: 'depKey' },
      value: [{ id: '2', type: 'literal', value: 'stashed-table' }],
    });

    const rootState = createMockRootState({
      workflow: {
        operations: {
          [operationId]: {
            type: 'Http',
            inputs: {
              method: 'GET',
              body: { tableName: 'original-table', extraField: 'should-not-appear-via-merge' },
            },
          },
        },
        nodesMetadata: {
          [operationId]: { graphId: 'root', isRoot: true },
        },
      },
      operations: {
        operationInfo: {
          [operationId]: { type: 'Http', connectorId: 'http', operationId: 'httpaction' },
        },
        inputParameters: {
          [operationId]: {
            parameterGroups: {
              default: {
                id: 'default',
                description: '',
                parameters: [staticParam],
                rawInputs: [],
              },
            },
            stashedDynamicParameterValues: [stashedDynamicParam],
          },
        },
        errors: {
          [operationId]: {
            [ErrorLevel.DynamicInputs]: {
              level: ErrorLevel.DynamicInputs,
              message: 'Failed to retrieve dynamic schema.',
            },
          },
        },
        settings: { [operationId]: {} },
        staticResults: {},
        actionMetadata: {},
      },
    });

    const result = await serializeOperation(rootState, operationId);

    expect(result).not.toBeNull();
    // Stashed param should be serialized via getOperationInputsToSerialize fallback
    expect(result!.inputs.body?.tableName).toBe('stashed-table');
    // The merge branch should NOT fire, so extraField from originalDef should NOT appear
    expect(result!.inputs.body?.extraField).toBeUndefined();
  });
});
