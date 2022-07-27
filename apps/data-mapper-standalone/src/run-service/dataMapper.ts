export interface IDataMapperService {
  getSchemas(subscriptionId: string, resourceGroupName: string, logicAppResource: string): Promise<any>;
  getSchemaFile(subscriptionId: string, resourceGroupName: string, logicAppResource: string, schemaName: string): Promise<any>;
}

export interface SchemaInfoProperties {
  name: string;
  size: number;
  mtime: string;
  crtime: string;
  mime: string;
  href: string;
  path: string;
}

export interface SchemaInfos {
  value: Array<SchemaInfoProperties>;
}

export enum ResourceType {
  schemaList = 'schemaList',
}

// let service: IConnectionService;

// export const InitConnectionService = (connectionService: IConnectionService): void => {
//   service = connectionService;
// };

// export const ConnectionService = (): IConnectionService => {
//   if (!service) {
//     throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'ConectionService need to be initialized before using');
//   }

//   return service;
// };
