import { configureStore, type AnyAction } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { IntlProvider } from 'react-intl';
import type { PropsWithChildren } from 'react';
import type { ParameterInfo } from '@microsoft/logic-apps-shared';
import { initialConnectionsState } from '../../connection/connectionSlice';
import { initialState as initialOperationsState } from '../../operation/operationMetadataSlice';
import type { RootState } from '../store';
import { McpPanelView } from '../panel/mcpPanelSlice';
import { createLiteralValueSegment } from '../../../utils/parameters/segment';

export const connectorId = '/serviceProviders/sql';
export const operationId = 'Query';
export const reference = { api: { id: connectorId }, connection: { id: '/connections/Sql' } };
export const expressionMapping = {
  kind: 'expression' as const,
  expression: "@parameters('connectionName')",
  designTimeReferenceKey: 'Sql',
};

export const createMcpState = (): Pick<RootState, 'connection' | 'operations' | 'mcpPanel' | 'mcpSelection'> => ({
  connection: {
    ...initialConnectionsState,
    connectionsMapping: { [operationId]: 'Sql' },
    connectionReferences: { Sql: reference },
    loading: { ...initialConnectionsState.loading },
  },
  operations: {
    ...initialOperationsState,
    operationInfo: { [operationId]: { connectorId, operationId, type: 'ServiceProvider' } },
    inputParameters: { [operationId]: { parameterGroups: { default: { id: 'default', description: '', parameters: [] } } } },
    dependencies: { [operationId]: { inputs: {}, outputs: {} } },
  },
  mcpPanel: { isOpen: true, currentPanelView: McpPanelView.SelectConnector },
  mcpSelection: { selectedConnectorId: connectorId, selectedOperations: [operationId], errors: {} },
});

// Keep Redux subscriptions real. Effects outside these component/selector units are
// recorded at the dispatch boundary rather than contacting connector services.
export const createMcpHarness = (state = createMcpState()) => {
  const actions: AnyAction[] = [];
  const store = configureStore({
    reducer: (current = state) => current,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(() => (next) => (action) => {
        actions.push(action);
        return next(action);
      }),
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <Provider store={store}>
      <IntlProvider locale="en">{children}</IntlProvider>
    </Provider>
  );
  return { store, actions, wrapper };
};

export const createParameter = (overrides: Partial<ParameterInfo> = {}): ParameterInfo =>
  ({
    id: 'body',
    parameterKey: 'inputs.$.body',
    label: 'Payload',
    type: 'string',
    required: false,
    value: [createLiteralValueSegment('original')],
    editor: 'string',
    editorOptions: {},
    editorViewModel: {},
    info: {},
    ...overrides,
  }) as ParameterInfo;
