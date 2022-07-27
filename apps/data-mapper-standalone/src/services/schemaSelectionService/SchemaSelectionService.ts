import type { ISchemaSelectionService, SchemaInfos } from '.';

export interface SchemaSelectionServiceOptions {
  baseUrl: string;
  accessToken?: string;
  resourceUrl?: string;
}

export class SchemaSelectionService implements ISchemaSelectionService {
  private options: SchemaSelectionServiceOptions;

  constructor(options: SchemaSelectionServiceOptions) {
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
    });
  };

  private getSchemasUri = () => {
    return `${this.options.baseUrl}${this.options.resourceUrl}/hostruntime/admin/vfs/Artifacts/Schemas?api-version=2018-11-01&relativepath=1`;
  };

  private getSchemaFileUri = (xmlName: string) => {
    return `${this.options.baseUrl}${this.options.resourceUrl}/hostruntime/admin/vfs/Artifacts/Schemas${xmlName}?api-version=2018-11-01&relativepath=1`;
  };

  async getSchemas(): Promise<any> {
    const headers = this.getAccessTokenHeaders();
    const schemaInfosUri = this.getSchemasUri();
    const response = await fetch(schemaInfosUri, { headers, method: 'GET' });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const schemaInfosResponse: SchemaInfos = await response.json();
    const { value: schemaInfos } = schemaInfosResponse;

    return { schemaInfos };
  }

  async getSchemaFile(xmlName: string): Promise<any> {
    const headers = this.getAccessTokenHeaders();
    const schemaFileUri = this.getSchemaFileUri(xmlName);
    const response = await fetch(schemaFileUri, { headers, method: 'GET' });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const schemaFileResponse: any = await response.json();
    const { value: schemaFile } = schemaFileResponse;

    return { schemaFile };
  }
}
