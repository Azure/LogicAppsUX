import type { IApiService, SchemaInfos } from "./types";

export interface DataMapperServiceOptions {
  baseUrl?: string;
  accessToken?: string;
}

export class DataMapperService implements IApiService {
  private options: DataMapperServiceOptions;

  constructor(options: DataMapperServiceOptions) {
    this.options = options;
  }

  private getAccessTokenHeaders = () => {
    const { accessToken } = this.options;
    if (!accessToken) {
      return undefined;
    }

    return new Headers({
      Authorization: accessToken,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
  };

  private getSchemasUri = (subscriptionId: string, resourceGroupName: string, logicAppResource: string) => {
    return `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Web/sites/${logicAppResource}/hostruntime/admin/vfs/Artifacts/Schemas/?api-version=2018-11-01&relativepath=1`;
  }

  private getSchemaFileUri = (subscriptionId: string, resourceGroupName: string, logicAppResource: string, schemaName: string) => {
    return `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Web/sites/${logicAppResource}/hostruntime/admin/vfs/Artifacts/Schemas/${schemaName}?api-version=2018-11-01&relativepath=1`;
  }


  async getSchemas(subscriptionId: string, resourceGroupName: string, logicAppResource: string): Promise<any> {
    const headers = this.getAccessTokenHeaders();
    const schemaInfosUri = this.getSchemasUri(subscriptionId, resourceGroupName, logicAppResource);
    const response = await fetch(schemaInfosUri, { headers, method: 'GET' });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const schemaInfosResponse: SchemaInfos = await response.json();
    const { value: schemaInfos } = schemaInfosResponse;

    return { schemaInfos };
  }

  async getSchemaFile(subscriptionId: string, resourceGroupName: string, logicAppResource: string, schemaName: string): Promise<any> {
    const headers = this.getAccessTokenHeaders();
    const schemaFileUri = this.getSchemaFileUri(subscriptionId, resourceGroupName, logicAppResource, schemaName);
    const response = await fetch(schemaFileUri, { headers, method: 'GET' });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const schemaFileResponse: any = await response.json();
    const { value: schemaFile } = schemaFileResponse;

    return { schemaFile };
  }
}
