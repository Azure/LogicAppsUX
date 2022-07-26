export interface IApiService {
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