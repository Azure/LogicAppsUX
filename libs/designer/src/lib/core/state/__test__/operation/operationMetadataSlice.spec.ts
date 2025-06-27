import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getMockedUndoRedoPartialRootState } from '../../../../__test__/mock-root-state';
import { setStateAfterUndoRedo } from '../../global';
import reducer, {
  NodeData,
  OperationMetadataState,
  initializeNodes,
  initializeOperationInfo,
  updateExistingInputTokenTitles, // Your new function
} from '../../operation/operationMetadataSlice';
import { TokenType } from '@microsoft/logic-apps-shared';

// Mock helper functions
vi.mock('../../helpers', () => ({
  normalizeKey: vi.fn((key: string) => key.toLowerCase()),
  getTokenTitle: vi.fn((output: any) => output.title || output.name),
  isValueSegment: vi.fn((item: any) => item && typeof item === 'object' && 'type' in item && 'id' in item),
  isTokenValueSegment: vi.fn((segment: any) => segment && segment.type === 'token' && segment.token),
  createTokenValueSegment: vi.fn((token: any, value: string, type: string) => ({
    id: 'new-id',
    type,
    token,
    value,
  })),
}));

describe('operationMetadataSlice', () => {
  let initialState: OperationMetadataState;

  beforeEach(() => {
    initialState = {
      operationInfo: {},
      inputParameters: {},
      outputParameters: {},
      dependencies: {},
      settings: {},
      operationMetadata: {},
      actionMetadata: {},
      staticResults: {},
      repetitionInfos: {},
      supportedChannels: {},
      errors: {},
      loadStatus: {
        nodesInitialized: false,
        nodesAndDynamicDataInitialized: false,
      },
    };
    vi.clearAllMocks();
  });

  test('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  test('should initialize the operation info in the state and should have connectorId, operationId, type and kind properties', () => {
    const action = {
      id: 'manual',
      connectorId: 'connectionProviders/request',
      operationId: 'request',
      type: 'Request',
      kind: 'Http',
    };
    const updatedState = reducer(initialState, initializeOperationInfo(action));
    expect(updatedState.operationInfo).toHaveProperty(action.id);
    expect(updatedState.operationInfo[action.id]).toEqual({
      connectorId: action.connectorId,
      operationId: action.operationId,
      type: action.type,
      kind: action.kind,
    });
  });

  test('should initialize nodes status to true and nodes data remain the same when there are no nodes', () => {
    const nodes: Array<NodeData | undefined> = [];
    const updatedState = reducer(initialState, initializeNodes({ nodes: nodes }));
    expect(updatedState.operationInfo).toEqual(initialState.operationInfo);
    expect(updatedState.inputParameters).toEqual(initialState.inputParameters);
    expect(updatedState.outputParameters).toEqual(initialState.outputParameters);
    expect(updatedState.loadStatus.nodesInitialized).toEqual(true);
  });

  test('should stay the nodes initialized load status as false when any node is set as undefined', () => {
    const nodes: Array<NodeData | undefined> = [undefined, undefined];
    const updatedState = reducer(initialState, initializeNodes({ nodes: nodes }));
    expect(updatedState.loadStatus.nodesInitialized).toEqual(false);
  });

  test('should set operation metadata on undo redo', async () => {
    const undoRedoPartialRootState = getMockedUndoRedoPartialRootState();
    const operationMetadataState: OperationMetadataState = {
      ...undoRedoPartialRootState.operations,
      inputParameters: {
        mockParam: {
          parameterGroups: {
            mockParamGroup: {
              id: '',
              parameters: [
                {
                  parameterKey: 'test',
                  info: {},
                  id: 'test',
                  label: 'test',
                  parameterName: 'test',
                  required: false,
                  type: 'test',
                  value: [],
                },
              ],
              rawInputs: [],
            },
          },
        },
      },
    };

    const state = reducer(
      initialState,
      setStateAfterUndoRedo({
        ...undoRedoPartialRootState,
        operations: operationMetadataState,
      })
    );

    expect(state).toEqual(operationMetadataState);
  });

  describe('updateExistingInputTokenTitles', () => {
    test('should update token titles in parameter.value when matching outputs exist', () => {
      const state: OperationMetadataState = {
        ...initialState,
        inputParameters: {
          node1: {
            parameterGroups: {
              group1: {
                id: 'group1',
                parameters: [
                  {
                    parameterKey: 'param1',
                    info: {},
                    id: 'param1',
                    label: 'Parameter 1',
                    parameterName: 'param1',
                    required: false,
                    type: 'string',
                    value: [
                      {
                        id: 'segment1',
                        type: 'token',
                        token: {
                          key: 'outputs.$.body.field1',
                          title: 'Old Title',
                          tokenType: TokenType.OUTPUTS,
                        },
                        value: 'token_value',
                      },
                    ],
                  },
                ],
                rawInputs: [],
              },
            },
          },
        },
      };

      const actionPayload = {
        nodeId: 'node1',
        outputs: {
          field1: {
            key: 'outputs.$.body.field1',
            name: 'field1',
            title: 'New Title',
            type: 'string',
            isAdvanced: false,
          },
        },
      };

      updateExistingInputTokenTitles(state, actionPayload);

      expect(state.inputParameters.node1.parameterGroups.group1.parameters[0].value[0].token?.title).toBe('New Title');
    });

    test('should update token titles in parameter.editorViewModel when tokens exist', () => {
      const state: OperationMetadataState = {
        ...initialState,
        inputParameters: {
          node1: {
            parameterGroups: {
              group1: {
                id: 'group1',
                parameters: [
                  {
                    parameterKey: 'param1',
                    info: {},
                    id: 'param1',
                    label: 'Parameter 1',
                    parameterName: 'param1',
                    required: false,
                    type: 'string',
                    value: [],
                    editorViewModel: [
                      {
                        id: 'item1',
                        key: [
                          {
                            id: 'key1',
                            type: 'literal',
                            value: 'Field Name',
                          },
                        ],
                        value: [
                          {
                            id: 'value1',
                            type: 'token',
                            token: {
                              key: 'outputs.$.body.field2',
                              title: 'Old Token Title',
                            },
                            value: 'token_value',
                          },
                        ],
                      },
                    ],
                  },
                ],
                rawInputs: [],
              },
            },
          },
        },
      };

      const actionPayload = {
        nodeId: 'node1',
        outputs: {
          field2: {
            key: 'outputs.$.body.field2',
            name: 'field2',
            title: 'Updated Token Title',
            type: 'string',
            isAdvanced: false,
          },
        },
      };

      updateExistingInputTokenTitles(state, actionPayload);

      const editorViewModel = state.inputParameters.node1.parameterGroups.group1.parameters[0].editorViewModel;
      expect(editorViewModel[0].value[0].token.title).toBe('Updated Token Title');
    });

    test('should not modify parameters when no matching tokens exist', () => {
      const state: OperationMetadataState = {
        ...initialState,
        inputParameters: {
          node1: {
            parameterGroups: {
              group1: {
                id: 'group1',
                parameters: [
                  {
                    parameterKey: 'param1',
                    info: {},
                    id: 'param1',
                    label: 'Parameter 1',
                    parameterName: 'param1',
                    required: false,
                    type: 'string',
                    value: [
                      {
                        id: 'segment1',
                        type: 'literal',
                        value: 'static text',
                      },
                    ],
                  },
                ],
                rawInputs: [],
              },
            },
          },
        },
      };

      const originalParameter = state.inputParameters.node1.parameterGroups.group1.parameters[0];

      const actionPayload = {
        nodeId: 'node1',
        outputs: {
          field1: {
            key: 'outputs.$.body.different_field',
            name: 'field1',
            title: 'New Title',
            type: 'string',
            isAdvanced: false,
          },
        },
      };

      updateExistingInputTokenTitles(state, actionPayload);

      // Should return same reference (no changes)
      expect(state.inputParameters.node1.parameterGroups.group1.parameters[0]).toBe(originalParameter);
    });

    test('should handle empty outputs gracefully', () => {
      const state: OperationMetadataState = {
        ...initialState,
        inputParameters: {
          node1: {
            parameterGroups: {
              group1: {
                id: 'group1',
                parameters: [
                  {
                    parameterKey: 'param1',
                    info: {},
                    id: 'param1',
                    label: 'Parameter 1',
                    parameterName: 'param1',
                    required: false,
                    type: 'string',
                    value: [],
                  },
                ],
                rawInputs: [],
              },
            },
          },
        },
      };

      const actionPayload = {
        nodeId: 'node1',
        outputs: {},
      };

      expect(() => {
        updateExistingInputTokenTitles(state, actionPayload);
      }).not.toThrow();
    });

    test('should handle parameters without editorViewModel', () => {
      const state: OperationMetadataState = {
        ...initialState,
        inputParameters: {
          node1: {
            parameterGroups: {
              group1: {
                id: 'group1',
                parameters: [
                  {
                    parameterKey: 'param1',
                    info: {},
                    id: 'param1',
                    label: 'Parameter 1',
                    parameterName: 'param1',
                    required: false,
                    type: 'string',
                    value: [
                      {
                        id: 'segment1',
                        type: 'token',
                        token: {
                          key: 'outputs.$.body.field1',
                          title: 'Old Title',
                          tokenType: TokenType.OUTPUTS,
                        },
                        value: 'token_value',
                      },
                    ],
                    // No editorViewModel property
                  },
                ],
                rawInputs: [],
              },
            },
          },
        },
      };

      const actionPayload = {
        nodeId: 'node1',
        outputs: {
          field1: {
            key: 'outputs.$.body.field1',
            name: 'field1',
            title: 'New Title',
            type: 'string',
            isAdvanced: false,
          },
        },
      };

      expect(() => {
        updateExistingInputTokenTitles(state, actionPayload);
      }).not.toThrow();

      expect(state.inputParameters.node1.parameterGroups.group1.parameters[0].value[0].token?.title).toBe('New Title');
    });

    test('should handle deeply nested editorViewModel structures', () => {
      const state: OperationMetadataState = {
        ...initialState,
        inputParameters: {
          node1: {
            parameterGroups: {
              group1: {
                id: 'group1',
                parameters: [
                  {
                    parameterKey: 'param1',
                    info: {},
                    id: 'param1',
                    label: 'Parameter 1',
                    parameterName: 'param1',
                    required: false,
                    type: 'string',
                    value: [],
                    editorViewModel: {
                      sections: [
                        {
                          items: [
                            {
                              id: 'item1',
                              content: [
                                {
                                  id: 'content1',
                                  type: 'token',
                                  token: {
                                    key: 'outputs.$.body.nested_field',
                                    title: 'Old Nested Title',
                                  },
                                  value: 'nested_token_value',
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  },
                ],
                rawInputs: [],
              },
            },
          },
        },
      };

      const actionPayload = {
        nodeId: 'node1',
        outputs: {
          nested_field: {
            key: 'outputs.$.body.nested_field',
            name: 'nested_field',
            title: 'New Nested Title',
            type: 'string',
            isAdvanced: false,
          },
        },
      };

      updateExistingInputTokenTitles(state, actionPayload);

      const nestedToken = state.inputParameters.node1.parameterGroups.group1.parameters[0].editorViewModel.sections[0].items[0].content[0];
      expect(nestedToken.token.title).toBe('New Nested Title');
    });
  });
});
