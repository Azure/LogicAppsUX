import { createAsyncThunk } from '@reduxjs/toolkit';
import type {
  IConnectionService,
  ILoggerService,
  IOperationManifestService,
  ITemplateResourceService,
  IResourceService,
} from '@microsoft/logic-apps-shared';
import {
  DevLogger,
  InitConnectionService,
  InitLoggerService,
  InitOperationManifestService,
  InitResourceService,
  InitTemplateResourceService,
} from '@microsoft/logic-apps-shared';

export interface ConfigureTemplateServiceOptions {
  connectionService: IConnectionService;
  operationManifestService: IOperationManifestService;
  loggerService?: ILoggerService;
  resourceService: IResourceService;
  templateResourceService: ITemplateResourceService;
}

export const initializeConfigureTemplateServices = createAsyncThunk(
  'initializeConfigureTemplateServices',
  async ({
    connectionService,
    operationManifestService,
    resourceService,
    templateResourceService,
    loggerService,
  }: ConfigureTemplateServiceOptions) => {
    InitConnectionService(connectionService);
    InitOperationManifestService(operationManifestService);
    InitResourceService(resourceService);
    InitTemplateResourceService(templateResourceService);

    const loggerServices: ILoggerService[] = [];
    if (loggerService) {
      loggerServices.push(loggerService);
    }
    if (process.env.NODE_ENV !== 'production') {
      loggerServices.push(new DevLogger());
    }
    InitLoggerService(loggerServices);
    return true;
  }
);
