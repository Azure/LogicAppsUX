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
}

export const initializeMcpServices = createAsyncThunk('initializeMcpServices', async (services: McpServiceOptions) => {
  initializeMcpServices(services);
  const loggerServices: ILoggerService[] = [];
  if (services.loggerService) {
    loggerServices.push(services.loggerService);
  }
  if (process.env.NODE_ENV !== 'production') {
    loggerServices.push(new DevLogger());
  }
  InitLoggerService(loggerServices);
  return true;
});

export const resetMcpStateOnResourceChange = createAsyncThunk(
  'resetMcpStateOnResourceChange',
  async (services: Partial<McpServiceOptions>) => {
    clearConnectionCaches();
    initializeServices(services);
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
  async (_payload: { connectorId: string; operations: string[] }, _data): Promise<void> => {
    // This function is a placeholder for initializing operations metadata.
  }
);
