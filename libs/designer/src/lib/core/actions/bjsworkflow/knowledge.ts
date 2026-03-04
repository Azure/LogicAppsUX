import {
  type IConnectionService,
  type ILoggerService,
  InitConnectionService,
  InitLoggerService,
  InitResourceService,
  type IResourceService,
  DevLogger,
} from '@microsoft/logic-apps-shared';
import { createAsyncThunk } from '@reduxjs/toolkit';

export interface KnowledgeServiceOptions {
  connectionService: IConnectionService;
  resourceService: IResourceService;
  loggerService?: ILoggerService;
}

export const initializeData = createAsyncThunk('initializeMcpData', async (services: KnowledgeServiceOptions) => {
  initializeServices(services);
  return true;
});

export const initializeServices = (services: KnowledgeServiceOptions) => {
  const { connectionService, resourceService, loggerService } = services;

  InitConnectionService(connectionService);
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
