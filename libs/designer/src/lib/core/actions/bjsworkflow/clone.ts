import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  DevLogger,
  type ILoggerService,
  InitLoggerService,
  InitResourceService,
  type IResourceService,
  type ICloneService,
  InitCloneService,
} from '@microsoft/logic-apps-shared';

export interface CloneServiceOptions {
  resourceService?: IResourceService;
  cloneService?: ICloneService;
  loggerService?: ILoggerService;
}

export const initializeCloneServices = createAsyncThunk('initializeCloneServices', async (services: CloneServiceOptions) => {
  initializeServices(services);
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

const initializeServices = ({ resourceService, cloneService }: CloneServiceOptions) => {
  if (resourceService) {
    InitResourceService(resourceService);
  }
  if (cloneService) {
    InitCloneService(cloneService);
  }
};
