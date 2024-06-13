import reducer, { OperationMetadataState, initializeOperationInfo } from '../../operation/operationMetadataSlice';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';

const test2 = {
  id: 'manual',
  connectorId: 'connectionProviders/request',
  operationId: 'request',
  type: 'Request',
  kind: 'Http',
};

describe('operationMetadataSlice', () => {
  let initialState: OperationMetadataState;

  beforeEach(() => {
    // Runs before each test
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
});
