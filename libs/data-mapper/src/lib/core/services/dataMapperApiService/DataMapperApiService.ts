import type { SchemaInfoProperties } from '.';
import type { FunctionData } from '../../../models/Function';

export interface DataMapperApiServiceOptions {
  baseUrl: string;
  accessToken?: string;
  resourceUrl?: string;
}

export class DataMapperApiService {
  // TODO: add back when questions answered
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
    return `${this.options.baseUrl}${this.options.resourceUrl}/runtime/webhooks/workflow/api/management/schemas/${xmlName}/contents/schemaTree`; // TODO: to test
  };

  private getFunctionsManifestUri = () => {
    return `${this.options.baseUrl}${this.options.resourceUrl}/runtime/webhooks/workflow/api/management/transformations/getManifest?api-version=2019-10-01-edge-preview`;
  };

  private getGenerateXsltUri = () => {
    return `${this.options.baseUrl}${this.options.resourceUrl}/runtime/webhooks/workflow/api/management/generateXslt?api-version=2019-10-01-edge-preview`;
  };

  private getTestMapUri = (xsltFilename: string) => {
    return `${this.options.baseUrl}${this.options.resourceUrl}/runtime/webhooks/workflow/api/management/maps/${xsltFilename}/testMap?api-version=2019-10-01-edge-preview`;
  };

  async getFunctionsManifest(): Promise<FunctionData[]> {
    const uri = this.getFunctionsManifestUri();
    const response = await fetch(uri, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    const functions: FunctionData[] = await response.json();
    return functions;
  }

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

  async generateDataMapXslt(dataMapDefinition: string): Promise<any> {
    const response = await fetch(this.getGenerateXsltUri(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        MapContent: dataMapDefinition,
      }),
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const dataMapXsltResponse = await response.json();

    return dataMapXsltResponse.xsltContent;
  }

  async testDataMap(dataMapXsltFilename: string, schemaInputValue: string): Promise<any> {
    const base64EncodedSchemaInputValue = Buffer.from(schemaInputValue).toString('base64');

    const response = await fetch(this.getTestMapUri(dataMapXsltFilename), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        InputInstanceMessage: {
          '$content-type': 'application/xml',
          $content: base64EncodedSchemaInputValue,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const testMapResponse = await response.json();

    // NOTE: In future, may need to use testMapResponse.OutputInstance.$content-type
    // Decode base64 response content
    testMapResponse.OutputInstance.$content = Buffer.from(testMapResponse.OutputInstance.$content).toString('utf-8');

    return testMapResponse;
  }
}
