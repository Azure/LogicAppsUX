import { getMockedInitialRootState } from '../../../../../__test__/mock-root-state';
import type { RootState } from '../../../../../core/store';
import { clone, OutputSource, WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { configureStore, type Action } from '@reduxjs/toolkit';

export const createConnectionExpressionState = (expression = "@parameters('Test_variable_1234')"): RootState => {
  const state = clone(getMockedInitialRootState());
  state.workflow.graph = {
    id: 'root',
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
    children: ['Request', 'Previous', 'Query'].map((id) => ({ id, type: WORKFLOW_NODE_TYPES.OPERATION_NODE })),
  };
  state.workflow.nodesMetadata = {
    Request: { graphId: 'root', isTrigger: true },
    Previous: { graphId: 'root' },
    Query: { graphId: 'root' },
  };
  state.workflow.operations = {
    Request: { type: 'Request' },
    Previous: { type: 'Compose', inputs: 'connection' },
    Query: { type: 'ServiceProvider' },
  };
  state.connections.connectionsMapping = { Query: { kind: 'expression', expression } };
  state.workflowParameters.definitions = {
    Test_variable_1234: { name: 'Test_variable_1234', isEditable: true, type: 'String', value: 'Sql' },
  };
  return state;
};

export const addConnectionExpressionMetadata = (state: RootState): RootState => ({
  ...state,
  operations: {
    ...state.operations,
    operationMetadata: {
      ...state.operations.operationMetadata,
      Previous: { brandColor: '#107c10', iconUri: 'previous.svg' },
      Request: { brandColor: '#0078d4', iconUri: 'request.svg' },
    },
    outputParameters: {
      ...state.operations.outputParameters,
      Previous: {
        outputs: {
          'outputs.$.connectionName': {
            key: 'outputs.$.connectionName',
            name: 'connectionName',
            title: 'Resolved connection',
            type: 'string',
            isAdvanced: false,
            source: OutputSource.Outputs,
          },
        },
      },
    },
  },
});

export const createConnectionExpressionStore = (initialState = createConnectionExpressionState()) =>
  configureStore({
    reducer: (state = initialState, action: Action) =>
      action.type === 'test/loadConnectionMetadata' ? addConnectionExpressionMetadata(state) : state,
    preloadedState: initialState,
  });
