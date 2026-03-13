import { describe, it, expect } from 'vitest';
import { operationMetadataSlice, initialState, DynamicLoadStatus, ErrorLevel } from '../operationMetadataSlice';
import type { ParameterInfo } from '@microsoft/designer-ui';

const { clearDynamicIO, addDynamicInputs } = operationMetadataSlice.actions;

const createMockParameter = (overrides: Partial<ParameterInfo> & { parameterKey: string }): ParameterInfo =>
  ({
    id: overrides.parameterKey,
    parameterKey: overrides.parameterKey,
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

describe('clearDynamicIO - dynamic parameter stashing', () => {
  const nodeId = 'testNode';

  const makeStateWithParams = (params: ParameterInfo[]) => ({
    ...initialState,
    inputParameters: {
      [nodeId]: {
        dynamicLoadStatus: DynamicLoadStatus.NOTSTARTED,
        parameterGroups: {
          default: {
            id: 'default',
            description: '',
            parameters: params,
            rawInputs: [],
          },
        },
      },
    },
    dependencies: {
      [nodeId]: { inputs: {}, outputs: {} },
    },
    errors: {} as any,
  });

  it('should stash dynamic parameters before removing them', () => {
    const staticParam = createMockParameter({ parameterKey: 'staticParam' });
    const dynamicParam = createMockParameter({
      parameterKey: 'dynamicParam',
      info: { isDynamic: true, dynamicParameterReference: 'depKey' },
    });
    const state = makeStateWithParams([staticParam, dynamicParam]);

    const result = operationMetadataSlice.reducer(state as any, clearDynamicIO({ nodeId, inputs: true, outputs: false }));

    // Dynamic param should be removed from the group
    expect(result.inputParameters[nodeId].parameterGroups.default.parameters).toHaveLength(1);
    expect(result.inputParameters[nodeId].parameterGroups.default.parameters[0].parameterKey).toBe('staticParam');

    // Dynamic param should be stashed
    expect(result.inputParameters[nodeId].stashedDynamicParameterValues).toHaveLength(1);
    expect(result.inputParameters[nodeId].stashedDynamicParameterValues![0].parameterKey).toBe('dynamicParam');
    expect(result.inputParameters[nodeId].stashedDynamicParameterValues![0].value[0].value).toBe('dynamicParam-value');
  });

  it('should not create stash when no dynamic parameters exist', () => {
    const staticParam = createMockParameter({ parameterKey: 'staticParam' });
    const state = makeStateWithParams([staticParam]);

    const result = operationMetadataSlice.reducer(state as any, clearDynamicIO({ nodeId, inputs: true, outputs: false }));

    expect(result.inputParameters[nodeId].parameterGroups.default.parameters).toHaveLength(1);
    expect(result.inputParameters[nodeId].stashedDynamicParameterValues).toBeUndefined();
  });

  it('should selectively stash only parameters matching dynamicParameterKeys', () => {
    const dynamicParamA = createMockParameter({
      parameterKey: 'dynamicA',
      info: { isDynamic: true, dynamicParameterReference: 'depA' },
    });
    const dynamicParamB = createMockParameter({
      parameterKey: 'dynamicB',
      info: { isDynamic: true, dynamicParameterReference: 'depB' },
    });
    const state = makeStateWithParams([dynamicParamA, dynamicParamB]);

    const result = operationMetadataSlice.reducer(
      state as any,
      clearDynamicIO({ nodeId, inputs: true, outputs: false, dynamicParameterKeys: ['depA'] })
    );

    // Only depA's param should be removed and stashed
    expect(result.inputParameters[nodeId].parameterGroups.default.parameters).toHaveLength(1);
    expect(result.inputParameters[nodeId].parameterGroups.default.parameters[0].parameterKey).toBe('dynamicB');
    expect(result.inputParameters[nodeId].stashedDynamicParameterValues).toHaveLength(1);
    expect(result.inputParameters[nodeId].stashedDynamicParameterValues![0].parameterKey).toBe('dynamicA');
  });

  it('should preserve stash entries for unaffected dynamic parameter references on selective clear', () => {
    const dynamicParamB = createMockParameter({
      parameterKey: 'dynamicB',
      info: { isDynamic: true, dynamicParameterReference: 'depB' },
    });
    const state = makeStateWithParams([dynamicParamB]);

    // Pre-populate stash with depA entries
    (state.inputParameters[nodeId] as any).stashedDynamicParameterValues = [
      createMockParameter({
        parameterKey: 'dynamicA',
        info: { isDynamic: true, dynamicParameterReference: 'depA' },
      }),
    ];

    const result = operationMetadataSlice.reducer(
      state as any,
      clearDynamicIO({ nodeId, inputs: true, outputs: false, dynamicParameterKeys: ['depB'] })
    );

    // Stash should have both entries: depA preserved + depB newly stashed
    expect(result.inputParameters[nodeId].stashedDynamicParameterValues).toHaveLength(2);
    const keys = result.inputParameters[nodeId].stashedDynamicParameterValues!.map((p) => p.parameterKey);
    expect(keys).toContain('dynamicA');
    expect(keys).toContain('dynamicB');
  });
});

describe('addDynamicInputs - stash clearing', () => {
  const nodeId = 'testNode';

  it('should clear the stash when dynamic inputs are successfully loaded', () => {
    const newDynamicParam = createMockParameter({
      parameterKey: 'newDynamic',
      info: { isDynamic: true, dynamicParameterReference: 'depKey' },
    });

    const state = {
      ...initialState,
      inputParameters: {
        [nodeId]: {
          dynamicLoadStatus: DynamicLoadStatus.NOTSTARTED,
          parameterGroups: {
            default: {
              id: 'default',
              description: '',
              parameters: [],
              rawInputs: [],
            },
          },
          stashedDynamicParameterValues: [
            createMockParameter({
              parameterKey: 'oldDynamic',
              info: { isDynamic: true, dynamicParameterReference: 'depKey' },
            }),
          ],
        },
      },
      dependencies: {
        [nodeId]: { inputs: {}, outputs: {} },
      },
    };

    const result = operationMetadataSlice.reducer(
      state as any,
      addDynamicInputs({
        nodeId,
        groupId: 'default',
        inputs: [newDynamicParam],
        rawInputs: [],
      })
    );

    // Stash should be cleared
    expect(result.inputParameters[nodeId].stashedDynamicParameterValues).toBeUndefined();
    // New params should be in the group
    expect(result.inputParameters[nodeId].parameterGroups.default.parameters).toHaveLength(1);
    expect(result.inputParameters[nodeId].parameterGroups.default.parameters[0].parameterKey).toBe('newDynamic');
  });
});
