import {
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
} from '@microsoft/logic-apps-shared';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { clearConnectionCaches } from '../../queries/connections';
import type { RootState } from '../../state/mcp/store';
import { getConnectionsInWorkflowApp } from '../../configuretemplate/utils/queries';
import { getReactQueryClient } from '../../ReactQueryProvider';
import { convertConnectionsDataToReferences, initializeOperationDetails } from '../../mcp/utils/helper';
import { initializeConnectionReferences, initializeConnectionsMappings } from '../../state/connection/connectionSlice';
import {
  initializeNodeOperationInputsData,
  type NodeOperation,
  type NodeOperationInputsData,
} from '../../state/operation/operationMetadataSlice';

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
    const promises: Promise<NodeOperationInputsData | undefined>[] = operations.map((operation) =>
      initializeOperationDetails(operation.operationId, operation)
    );
    const allNodeData = (await Promise.all(promises)).filter((data) => !!data) as NodeOperationInputsData[];

    dispatch(initializeNodeOperationInputsData(allNodeData));
  }
);
