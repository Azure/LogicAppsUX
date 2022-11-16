import type { GenerateXsltResponse, SchemaInfoProperties, TestMapResponse } from '.';
import type { Schema } from '../../../models';
import type { FunctionManifest } from '../../../models/Function';

type DmErrorResponse = { code: string; message: string };

export interface DataMapperApiServiceOptions {
  baseUrl: string;
  port: string;
  accessToken?: string;
}

export class DataMapperApiService {
  private options: DataMapperApiServiceOptions;

  constructor(options: DataMapperApiServiceOptions) {
    this.options = options;
  }

  public setAccessToken = (accessToken: string) => {
    this.options.accessToken = accessToken;
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

  private getBaseUri = () => {
    return `${this.options.baseUrl}:${this.options.port}`;
  };

  private getSchemasUri = () => {
    return `${this.getBaseUri()}/hostruntime/admin/vfs/Artifacts/Schemas?api-version=2018-11-01&relativepath=1`;
  };

  private getSchemaFileUri = (xmlName: string) => {
    return `${this.getBaseUri()}/runtime/webhooks/workflow/api/management/schemas/${xmlName}/contents/schemaTree`;
  };

  private getFunctionsManifestUri = () => {
    return `${this.getBaseUri()}/runtime/webhooks/workflow/api/management/mapTransformations?api-version=2019-10-01-edge-preview`;
  };

  private getGenerateXsltUri = () => {
    return `${this.getBaseUri()}/runtime/webhooks/workflow/api/management/generateXslt?api-version=2019-10-01-edge-preview`;
  };

  private getTestMapUri = (xsltFilename: string) => {
    return `${this.getBaseUri()}/runtime/webhooks/workflow/api/management/maps/${xsltFilename}/testMap?api-version=2019-10-01-edge-preview`;
  };

  async getFunctionsManifest(): Promise<FunctionManifest> {
    const uri = this.getFunctionsManifestUri();
    const response = await fetch(uri, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const functions = await response.json();
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

  async getSchemaFile(xmlName: string): Promise<Schema> {
    const schemaFileUri = this.getSchemaFileUri(xmlName.split('.')[0]);
    const response = await fetch(schemaFileUri, { method: 'GET' });

    if (!response.ok) {
      const errorResponse: DmErrorResponse = (await response.json()).error;
      throw new Error(`${response.status} - ${errorResponse.code}: ${errorResponse.message}`);
    }

    const schemaFileResponse: Schema = await response.json();

    return schemaFileResponse;
  }

  async generateDataMapXslt(dataMapDefinition: string): Promise<string> {
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
      const errorResponse: DmErrorResponse = (await response.json()).error;
      throw new Error(`${response.status} - ${errorResponse.code}: ${errorResponse.message}`);
    }

    const dataMapXsltResponse: GenerateXsltResponse = await response.json();

    return dataMapXsltResponse.xsltContent;
  }

  async testDataMap(dataMapXsltFilename: string, schemaInputValue: string): Promise<TestMapResponse> {
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

    const testMapResponse: TestMapResponse = {
      statusCode: response.status,
      statusText: response.statusText,
    };

    if (!response.ok) {
      const errorResponse: DmErrorResponse = (await response.json()).error;
      testMapResponse.statusText = `${errorResponse.code}: ${errorResponse.message}`;
    } else {
      const respJson = await response.json();
      // Decode base64 response content
      respJson.outputInstance.$content = Buffer.from(respJson.outputInstance.$content, 'base64').toString('utf-8');

      testMapResponse.outputInstance = respJson.outputInstance;

      if (!testMapResponse?.outputInstance) {
        throw new Error(`Test Map error: Schema output instance not properly set on successful response`);
      }
    }

    return testMapResponse;
  }
}
