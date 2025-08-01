import {
  ConnectionService,
  DevLogger,
  getIntl,
  type IConnectionParameterEditorService,
  type IConnectionService,
  type IConnectorService,
  type IGatewayService,
  type ILoggerService,
  InitConnectionParameterEditorService,
  InitConnectionService,
  InitConnectorService,
  InitGatewayService,
  InitHostService,
  InitLoggerService,
  InitOAuthService,
  InitResourceService,
  InitSearchService,
  InitTenantService,
  InitWorkflowService,
  type IOAuthService,
  type IResourceService,
  type ISearchService,
  type ITenantService,
  type IWorkflowService,
  LogEntryLevel,
  LoggerService,
} from '@microsoft/logic-apps-shared';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { clearConnectionCaches, getConnectionsForConnector } from '../../queries/connections';
import type { RootState } from '../../state/mcp/store';
import { getConnectionsInWorkflowApp } from '../../configuretemplate/utils/queries';
import { getReactQueryClient } from '../../ReactQueryProvider';
import { convertConnectionsDataToReferences, getUnsupportedOperations, initializeOperationDetails } from '../../mcp/utils/helper';
import {
  initEmptyConnectionMap,
  initializeConnectionReferences,
  initializeConnectionsMappings,
} from '../../state/connection/connectionSlice';
import {
  deinitializeNodes,
  deinitializeOperationInfos,
  initializeNodeOperationInputsData,
  type NodeOperation,
  type NodeOperationInputsData,
} from '../../state/operation/operationMetadataSlice';
import { tryGetMostRecentlyUsedConnectionId } from './add';
import { isConnectionValid } from '../../utils/connectors/connections';
import { updateMcpConnection } from './connections';
import { getConnector } from '../../queries/operation';

export interface McpServiceOptions {
  connectionService: IConnectionService;
  gatewayService?: IGatewayService;
  tenantService?: ITenantService;
  oAuthService: IOAuthService;
  connectionParameterEditorService?: IConnectionParameterEditorService;
  connectorService: IConnectorService;
  resourceService: IResourceService;
  searchService?: ISearchService;
  loggerService?: ILoggerService;
  workflowService?: IWorkflowService;
  hostService?: any; // Placeholder for IHostService, not used in this context
}

export const initializeMcpServices = createAsyncThunk('initializeMcpServices', async (services: McpServiceOptions) => {
  initializeServices(services);
  const loggerServices: ILoggerService[] = [];
  if (services.loggerService) {
    loggerServices.push(services.loggerService);
  }
  if (process.env.NODE_ENV !== 'production') {
    loggerServices.push(new DevLogger());
  }
  InitLoggerService(loggerServices);
  InitHostService(services.hostService);
  return true;
});

export const resetMcpStateOnResourceChange = createAsyncThunk(
  'resetMcpStateOnResourceChange',
  async (services: Partial<McpServiceOptions>, { dispatch, getState }) => {
    clearConnectionCaches();
    initializeServices(services);

    const {
      resource: { subscriptionId, resourceGroup, logicAppName },
    } = getState() as RootState;
    const connectionsData = await getConnectionsInWorkflowApp(subscriptionId, resourceGroup, logicAppName as string, getReactQueryClient());
    const references = convertConnectionsDataToReferences(connectionsData);
    dispatch(initializeConnectionReferences(references));
    dispatch(initializeConnectionsMappings({}));
    return true;
  }
);

const initializeServices = ({
  connectionService,
  connectorService,
  workflowService,
  oAuthService,
  gatewayService,
  tenantService,
  connectionParameterEditorService,
  resourceService,
  searchService,
}: Partial<McpServiceOptions>) => {
  if (connectionService) {
    InitConnectionService(connectionService);
  }

  if (oAuthService) {
    InitOAuthService(oAuthService);
  }

  if (workflowService) {
    InitWorkflowService(workflowService);
  }

  if (searchService) {
    InitSearchService(searchService);
  }

  if (connectorService) {
    InitConnectorService(connectorService);
  }

  if (gatewayService) {
    InitGatewayService(gatewayService);
  }

  if (tenantService) {
    InitTenantService(tenantService);
  }

  if (connectionParameterEditorService) {
    InitConnectionParameterEditorService(connectionParameterEditorService);
  }

  if (resourceService) {
    InitResourceService(resourceService);
  }
};

export const initializeOperationsMetadata = createAsyncThunk(
  'initializeOperationsMetadata',
  async ({ operations }: { operations: NodeOperation[] }, { dispatch }): Promise<void> => {
    const intl = getIntl();
    const promises: Promise<NodeOperationInputsData | undefined>[] = operations.map((operation) =>
      initializeOperationDetails(operation.operationId, operation)
    );

    const results = await Promise.allSettled(promises);
    const failedResults = results.filter((result) => result.status === 'rejected');
    if (failedResults.length > 0) {
      const errorMessage = failedResults.map((result) => (result as PromiseRejectedResult).reason.message).join('\n');
      throw new Error(errorMessage);
    }

    const allNodeData = results
      .filter((result) => result.status === 'fulfilled' && !!result.value)
      .map((result) => (result as PromiseFulfilledResult<any>).value) as NodeOperationInputsData[];
    const unsupportedOperations = getUnsupportedOperations(allNodeData);
    if (unsupportedOperations.length > 0) {
      const errorMessage = intl.formatMessage(
        {
          defaultMessage:
            'The following operations: "{operations}", are unsupported currently, so please unselect these operations and continue with save.',
          id: 'vXgDEY',
          description: 'Error message when unsupported operations are selected during initialization.',
        },
        {
          operations: unsupportedOperations.join(', '),
        }
      );

      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'MCP.initializeOperationsMetadata',
        message: errorMessage,
        args: ['Unsupported operations: ', ...unsupportedOperations],
      });

      // throw new Error(errorMessage);
    }

    dispatch(initializeNodeOperationInputsData(allNodeData));
  }
);

export const initializeConnectionMappings = createAsyncThunk(
  'initializeConnectionMappings',
  async ({ operations, connectorId }: { operations: string[]; connectorId: string }, { dispatch }): Promise<void> => {
    try {
      const connector = await getConnector(connectorId, /* useCachedData */ true);
      const connections = (await getConnectionsForConnector(connectorId)).filter(isConnectionValid);
      if (connector && connections.length > 0) {
        const connection = (await tryGetMostRecentlyUsedConnectionId(connectorId, connections)) ?? connections[0];
        await ConnectionService().setupConnectionIfNeeded(connection);
        dispatch(updateMcpConnection({ nodeIds: operations, connection, connector, reset: true }));
      } else {
        dispatch(initEmptyConnectionMap(operations));
      }
    } catch (error: any) {
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'MCP.initializeConnectionMappings',
        message: `Cannot initialize connection mappings for connector: ${connectorId}`,
        error,
      });

      dispatch(initEmptyConnectionMap(operations));
    }
  }
);

export const deinitializeOperations = createAsyncThunk(
  'deinitializeOperations',
  async ({ operationIds }: { operationIds: string[] }, { dispatch }) => {
    dispatch(deinitializeOperationInfos({ ids: operationIds }));
    dispatch(deinitializeNodes(operationIds));
    return operationIds;
  }
);
