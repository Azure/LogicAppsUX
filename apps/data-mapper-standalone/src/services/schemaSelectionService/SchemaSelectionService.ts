import type { ISchemaSelectionService, SchemaInfos } from '.';

export interface SchemaSelectionServiceOptions {
  baseUrl?: string;
  accessToken?: string;
}

export class SchemaSelectionService implements ISchemaSelectionService {
  private options: SchemaSelectionServiceOptions;

  constructor(options: SchemaSelectionServiceOptions) {
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

  private getSchemasUri = (resourceUrl: string) => {
    return `${this.options.baseUrl}${resourceUrl}`;
  };

  private getSchemaFileUri = (resourceUrl: string) => {
    return `${this.options.baseUrl}${resourceUrl}`;
  };

  async getSchemas(getSchemaRscUrl: string): Promise<any> {
    const headers = this.getAccessTokenHeaders();
    const schemaInfosUri = this.getSchemasUri(getSchemaRscUrl);
    const response = await fetch(schemaInfosUri, { headers, method: 'GET' });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const schemaInfosResponse: SchemaInfos = await response.json();
    const { value: schemaInfos } = schemaInfosResponse;

    return { schemaInfos };
  }

  async getSchemaFile(getSchemaFileRscUrl: string): Promise<any> {
    const headers = this.getAccessTokenHeaders();
    const schemaFileUri = this.getSchemaFileUri(getSchemaFileRscUrl);
    const response = await fetch(schemaFileUri, { headers, method: 'GET' });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const schemaFileResponse: any = await response.json();
    const { value: schemaFile } = schemaFileResponse;

    return { schemaFile };
  }
}
