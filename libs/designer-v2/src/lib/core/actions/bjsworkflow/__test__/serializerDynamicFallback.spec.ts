import { describe, it, expect } from 'vitest';
import { getOperationInputsToSerialize } from '../serializer';
import { DynamicLoadStatus, ErrorLevel } from '../../../state/operation/operationMetadataSlice';
import type { RootState } from '../../../store';
import type { ParameterInfo } from '@microsoft/designer-ui';

const createMockParameter = (overrides: Partial<ParameterInfo> & { parameterKey: string }): ParameterInfo =>
  ({
    id: overrides.parameterKey,
    // parameterKey: overrides.parameterKey, // Present in overrides spread
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
      ...overrides.workflow,
    },
    operations: {
      inputParameters: {},
      outputParameters: {},
      operationInfo: {},
      errors: {},
      ...overrides.operations,
    },
  }) as unknown as RootState;

describe('getOperationInputsToSerialize', () => {
  const operationId = 'testNode';

  it('should include stashed dynamic parameters when they are missing from current params', () => {
    const staticParam = createMockParameter({ parameterKey: 'inputs.$.method' });
    const stashedDynamicParam = createMockParameter({
      parameterKey: 'inputs.$.body.tableName',
      info: { isDynamic: true, dynamicParameterReference: 'depKey' },
    });

    const rootState = createMockRootState({
      operations: {
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
            stashedDynamicParameterValues: [stashedDynamicParam],
          },
        },
        operationInfo: {
          [operationId]: { type: 'ApiConnection', connectorId: 'sql', operationId: 'getRows' },
        },
        errors: {},
      },
    });

    const result = getOperationInputsToSerialize(rootState, operationId);

    expect(result).toHaveLength(2);
    const keys = result.map((p) => p.parameterKey);
    expect(keys).toContain('inputs.$.method');
    expect(keys).toContain('inputs.$.body.tableName');
  });

  it('should not include stashed parameters that already exist in current params', () => {
    const currentParam = createMockParameter({
      parameterKey: 'inputs.$.body.tableName',
      info: { isDynamic: true, dynamicParameterReference: 'depKey' },
      value: [{ id: '1', type: 'literal', value: 'updated-value' }],
    });
    const stashedParam = createMockParameter({
      parameterKey: 'inputs.$.body.tableName',
      info: { isDynamic: true, dynamicParameterReference: 'depKey' },
      value: [{ id: '1', type: 'literal', value: 'old-value' }],
    });

    const rootState = createMockRootState({
      operations: {
        inputParameters: {
          [operationId]: {
            dynamicLoadStatus: DynamicLoadStatus.SUCCEEDED,
            parameterGroups: {
              default: {
                id: 'default',
                description: '',
                parameters: [currentParam],
                rawInputs: [],
              },
            },
            stashedDynamicParameterValues: [stashedParam],
          },
        },
        operationInfo: {
          [operationId]: { type: 'ApiConnection', connectorId: 'sql', operationId: 'getRows' },
        },
        errors: {},
      },
    });

    const result = getOperationInputsToSerialize(rootState, operationId);

    // Only the current param should be included, not the stashed one
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('updated-value');
  });

  it('should serialize normally when there is no stash', () => {
    const staticParam = createMockParameter({ parameterKey: 'inputs.$.method' });

    const rootState = createMockRootState({
      operations: {
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
        operationInfo: {
          [operationId]: { type: 'ApiConnection', connectorId: 'sql', operationId: 'getRows' },
        },
        errors: {},
      },
    });

    const result = getOperationInputsToSerialize(rootState, operationId);

    expect(result).toHaveLength(1);
    expect(result[0].parameterKey).toBe('inputs.$.method');
  });

  it('should preserve user edits to non-dynamic parameters while including stashed dynamic parameters after error', () => {
    // Simulate: dynamic params errored, user then edited a static param
    const editedStaticParam = createMockParameter({
      parameterKey: 'inputs.$.method',
      value: [{ id: '1', type: 'literal', value: 'POST' }],
    });
    const anotherStaticParam = createMockParameter({
      parameterKey: 'inputs.$.uri',
      value: [{ id: '2', type: 'literal', value: 'https://updated-url.com' }],
    });
    const stashedDynamicParam = createMockParameter({
      parameterKey: 'inputs.$.body.columnA',
      info: { isDynamic: true, dynamicParameterReference: 'depKey' },
      value: [{ id: '3', type: 'literal', value: 'original-column-value' }],
    });
    const stashedDynamicParam2 = createMockParameter({
      parameterKey: 'inputs.$.body.columnB',
      info: { isDynamic: true, dynamicParameterReference: 'depKey' },
      value: [{ id: '4', type: 'literal', value: 'another-column-value' }],
    });

    const rootState = createMockRootState({
      operations: {
        inputParameters: {
          [operationId]: {
            dynamicLoadStatus: DynamicLoadStatus.NOTSTARTED,
            parameterGroups: {
              default: {
                id: 'default',
                description: '',
                parameters: [editedStaticParam, anotherStaticParam],
                rawInputs: [],
              },
            },
            stashedDynamicParameterValues: [stashedDynamicParam, stashedDynamicParam2],
          },
        },
        operationInfo: {
          [operationId]: { type: 'ApiConnection', connectorId: 'sql', operationId: 'getRows' },
        },
        errors: {
          [operationId]: {
            [ErrorLevel.DynamicInputs]: {
              level: ErrorLevel.DynamicInputs,
              message: 'Failed to retrieve dynamic inputs.',
            },
          },
        },
      },
    });

    const result = getOperationInputsToSerialize(rootState, operationId);

    // Should have all 4 parameters: 2 static (user-edited) + 2 stashed dynamic
    expect(result).toHaveLength(4);

    // Verify user edits to static params are preserved with correct values
    const methodParam = result.find((p) => p.parameterKey === 'inputs.$.method');
    expect(methodParam).toBeDefined();
    expect(methodParam!.value).toBe('POST');

    const uriParam = result.find((p) => p.parameterKey === 'inputs.$.uri');
    expect(uriParam).toBeDefined();
    expect(uriParam!.value).toBe('https://updated-url.com');

    // Verify stashed dynamic params are included with their original values
    const columnAParam = result.find((p) => p.parameterKey === 'inputs.$.body.columnA');
    expect(columnAParam).toBeDefined();
    expect(columnAParam!.value).toBe('original-column-value');

    const columnBParam = result.find((p) => p.parameterKey === 'inputs.$.body.columnB');
    expect(columnBParam).toBeDefined();
    expect(columnBParam!.value).toBe('another-column-value');
  });
});
