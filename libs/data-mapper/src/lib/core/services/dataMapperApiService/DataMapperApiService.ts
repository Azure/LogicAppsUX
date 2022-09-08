import type { SchemaInfoProperties } from '.';

export interface DataMapperApiServiceOptions {
  baseUrl: string;
  accessToken?: string;
  resourceUrl?: string;
}

export class DataMapperApiService {
  // TODO (danielle): add back when questions answered
  private options: DataMapperApiServiceOptions;

  constructor(options: DataMapperApiServiceOptions) {
    this.options = options;
  }

  public setAccessToken = (accessToken: string) => {
    this.options.accessToken = accessToken;
  };

  public setResourceURL = (resourceUrl: string) => {
    this.options.resourceUrl = resourceUrl;
  };

  private getAccessTokenHeaders = () => {
    const { accessToken } = this.options;
    if (!accessToken) {
      return undefined;
    }

    return new Headers({
      Authorization: accessToken,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'api-version': '2019-10-01-edge-preview',
    });
  };
  private getHeaders = () => {
    return new Headers({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'api-version': '2019-10-01-edge-preview',
    });
  };

  private getSchemasUri = () => {
    return `${this.options.baseUrl}${this.options.resourceUrl}/hostruntime/admin/vfs/Artifacts/Schemas?api-version=2018-11-01&relativepath=1`;
  };

  private getSchemaFileUri = (xmlName: string) => {
    return `${this.options.baseUrl}${this.options.resourceUrl}/runtime/webhooks/workflow/api/management/schemas/${xmlName}/contents/schemaTree`; // TODO (danielle): to test
  };

  async getSchemas(): Promise<SchemaInfoProperties[]> {
    const headers = this.getHeaders();
    const schemaInfosUri = this.getSchemasUri();
    const response = await fetch(schemaInfosUri, { headers, method: 'GET' });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const schemaInfosResponse: Array<SchemaInfoProperties> = await response.json();

    return schemaInfosResponse;
  }

  async getSchemaFile(xmlName: string): Promise<any> {
    const schemaFileUri = this.getSchemaFileUri(xmlName.split('.')[0]);
    const response = await fetch(schemaFileUri, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const schemaFileResponse: string = await response.json();

    return schemaFileResponse;
  }
}
