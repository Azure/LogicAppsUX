import { beforeEach, describe, expect, test } from 'vitest';
import { getMockedUndoRedoPartialRootState } from '../../../../__test__/mock-root-state';
import { setStateAfterUndoRedo } from '../../global';
import reducer, {
  NodeData,
  OperationMetadataState,
  initializeNodes,
  initializeOperationInfo,
} from '../../operation/operationMetadataSlice';

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
});
