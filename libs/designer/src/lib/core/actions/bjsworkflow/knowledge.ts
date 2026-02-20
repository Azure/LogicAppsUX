import { type IConnectionService, type ILoggerService, InitConnectionService, InitLoggerService, InitResourceService, type IResourceService } from "@microsoft/logic-apps-shared";

export interface KnowledgeServiceOptions {
  connectionService: IConnectionService;
  resourceService: IResourceService;
  loggerService?: ILoggerService;
}

export const initializeServices = (services: KnowledgeServiceOptions) => {
  const { connectionService, resourceService, loggerService } = services;

  InitConnectionService(connectionService);
  InitResourceService(resourceService);

  if (loggerService) {
    InitLoggerService([loggerService]);
  }
};