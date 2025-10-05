import {
  ConnectionService,
  DevLogger,
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
import { convertConnectionsDataToReferences, initializeOperationDetails } from '../../mcp/utils/helper';
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
import { McpPanelView, openMcpPanelView, setAutoOpenPanel } from '../../state/mcp/panel/mcpPanelSlice';

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

export const MCP_ConnectionKey = 'mcp-placeholder';
export const initializeMcpData = createAsyncThunk(
  'initializeMcpData',
  async (
    {
      connectorId,
      services,
    }: {
      services: McpServiceOptions;
      connectorId?: string;
      logicAppName?: string;
    },
    { dispatch }
  ) => {
    if (connectorId) {
      dispatch(initEmptyConnectionMap([MCP_ConnectionKey]));
    }

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
  }
);

export const resetMcpStateOnResourceChange = createAsyncThunk(
  'resetMcpStateOnResourceChange',
  async (services: Partial<McpServiceOptions>, { dispatch, getState }) => {
    clearConnectionCaches();
    initializeServices(services);

    const {
      resource: { subscriptionId, resourceGroup, logicAppName },
      connection: { connectionsMapping },
      mcpPanel: { autoOpenPanel },
      mcpSelection: { disableConnectorSelection, disableLogicAppSelection, selectedConnectorId },
    } = getState() as RootState;
    const connectionsData = await getConnectionsInWorkflowApp(subscriptionId, resourceGroup, logicAppName as string, getReactQueryClient());
    const references = convertConnectionsDataToReferences(connectionsData);
    dispatch(initializeConnectionReferences(references));
    dispatch(
      initializeConnectionsMappings(
        Object.keys(connectionsMapping).reduce((result: Record<string, string | null>, key: string) => {
          result[key] = null;
          return result;
        }, {})
      )
    );

    if (disableConnectorSelection && selectedConnectorId && (disableLogicAppSelection || autoOpenPanel)) {
      dispatch(openMcpPanelView({ panelView: McpPanelView.SelectOperation }));

      if (!disableLogicAppSelection) {
        dispatch(setAutoOpenPanel(false));
      }
    }
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
  async ({ operations, area }: { operations: NodeOperation[]; area: string }, { dispatch }): Promise<void> => {
    const promises: Promise<NodeOperationInputsData | undefined>[] = operations.map((operation) =>
      initializeOperationDetails(operation.operationId, operation, area)
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

    dispatch(initializeNodeOperationInputsData(allNodeData));

    // TODO: Initialize dynamic data without user inputs in this section.
  }
);

export const initializeConnectionMappings = createAsyncThunk(
  'initializeConnectionMappings',
  async ({ operations, connectorId, area }: { operations: string[]; connectorId: string; area: string }, { dispatch }): Promise<void> => {
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
        area: `MCP.${area}.initializeConnectionMappings`,
        message: `Cannot initialize connection mappings for connector: ${connectorId}`,
        error: error instanceof Error ? error : undefined,
        args: [`operationIds:${operations.join(',')}`, `connectorId:${connectorId}`],
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
