import {
  type IConnectionService,
  type IConnectionParameterEditorService,
  type ILoggerService,
  InitCognitiveServiceService,
  InitConnectionService,
  InitConnectionParameterEditorService,
  InitGatewayService,
  InitLoggerService,
  InitResourceService,
  type IResourceService,
  DevLogger,
  type ICognitiveServiceService,
  type IGatewayService,
} from '@microsoft/logic-apps-shared';
import { createAsyncThunk } from '@reduxjs/toolkit';

export interface KnowledgeServiceOptions {
  cognitiveService: ICognitiveServiceService;
  connectionService: IConnectionService;
  connectionParameterEditorService: IConnectionParameterEditorService;
  gatewayService: IGatewayService;
  resourceService: IResourceService;
  loggerService?: ILoggerService;
}

export const initializeData = createAsyncThunk('initializeKnowledgeData', async (services: KnowledgeServiceOptions) => {
  initializeServices(services);
  return true;
});

export const initializeServices = (services: KnowledgeServiceOptions) => {
  const { cognitiveService, connectionService, connectionParameterEditorService, gatewayService, resourceService, loggerService } =
    services;

  InitCognitiveServiceService(cognitiveService);
  InitConnectionService(connectionService);
  InitConnectionParameterEditorService(connectionParameterEditorService);
  InitGatewayService(gatewayService);
  InitResourceService(resourceService);

  const loggerServices: ILoggerService[] = [];
  if (loggerService) {
    loggerServices.push(loggerService);
  }
  if (process.env.NODE_ENV !== 'production') {
    loggerServices.push(new DevLogger());
  }

  InitLoggerService(loggerServices);
};
