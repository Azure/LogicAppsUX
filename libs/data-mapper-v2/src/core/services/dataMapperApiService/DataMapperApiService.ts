import type { GenerateXsltResponse, TestMapResponse } from '.';
import { dataMapperApiVersions } from '.';
import type { FunctionManifest } from '../../../models/Function';
import type { DataMapSchema } from '@microsoft/logic-apps-shared';

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

  /* private getAccessTokenHeaders = () => {
    const { accessToken } = this.options;
    if (!accessToken) {
      return undefined;
    }

    return new Headers({
      Authorization: accessToken,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'api-version': dataMapperApiVersions.Oct2019Edge,
    });
  }; */

  private getHeaders = () => {
    return new Headers({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'api-version': dataMapperApiVersions.Oct2019Edge,
    });
  };

  /********* URIs *********/

  private getBaseUri = () => `${this.options.baseUrl}:${this.options.port}`;

  public getSchemaFileUri = (schemaFilename: string, schemaFilePath: string) => {
    const filename = schemaFilename.substring(0, schemaFilename.lastIndexOf('.'));
    const formattedFilePath = schemaFilePath.replace(schemaFilename, '');
    const queryParams = schemaFilePath === schemaFilename ? '' : `?relativePath=${formattedFilePath}`;
    return `${this.getBaseUri()}/runtime/webhooks/workflow/api/management/schemas/${filename}/contents/schemaTree${queryParams}`;
  };
  private getFunctionsManifestUri = () =>
    `${this.getBaseUri()}/runtime/webhooks/workflow/api/management/mapTransformations?api-version=${dataMapperApiVersions.Oct2019Edge}`;

  private getGenerateXsltUri = () =>
    `${this.getBaseUri()}/runtime/webhooks/workflow/api/management/generateXslt?api-version=${dataMapperApiVersions.Oct2019Edge}`;

  private getTestMapUri = (xsltFilename: string) =>
    `${this.getBaseUri()}/runtime/webhooks/workflow/api/management/maps/${xsltFilename}/testMap?api-version=${
      dataMapperApiVersions.Oct2019Edge
    }`;

  /********* Full Requests *********/

  async getFunctionsManifest(): Promise<FunctionManifest> {
    const headers = this.getHeaders();
    const uri = this.getFunctionsManifestUri();
    const response = await fetch(uri, { headers, method: 'GET' });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const functions = await response.json();
    return functions;
  }

  // NOTE: From BPM repo, looks like two schema files with the same name will prefer the JSON one
  async getSchemaFile(schemaFilename: string, schemaFilePath: string): Promise<DataMapSchema> {
    const headers = this.getHeaders();
    const schemaFileUri = this.getSchemaFileUri(schemaFilename, schemaFilePath);
    console.log(schemaFileUri);
    const response = await fetch(schemaFileUri, { headers, method: 'GET' });

    if (!response.ok) {
      const errorResponse: DmErrorResponse = (await response.json()).error;
      throw new Error(`${response.status} - ${errorResponse.code}: ${errorResponse.message}`);
    }

    const schemaFileResponse: DataMapSchema = await response.json();

    return schemaFileResponse;
  }

  async generateDataMapXslt(dataMapDefinition: string): Promise<string> {
    const headers = this.getHeaders();
    const response = await fetch(this.getGenerateXsltUri(), {
      method: 'POST',
      headers,
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
    const headers = this.getHeaders();
    const base64EncodedSchemaInputValue = Buffer.from(schemaInputValue).toString('base64');

    const response = await fetch(this.getTestMapUri(dataMapXsltFilename), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        InputInstanceMessage: {
          '$content-type': 'application/xml', // This doesn't actually appear to get used in the BPM repo, and still functions correctly when empty - the property itself just has to exist
          $content: base64EncodedSchemaInputValue,
        },
      }),
    });

    const testMapResponse: TestMapResponse = {
      statusCode: response.status,
      statusText: response.statusText,
    };

    if (response.ok) {
      const respJson = await response.json();
      // Decode base64 response content
      respJson.outputInstance.$content = Buffer.from(respJson.outputInstance.$content, 'base64').toString('utf-8');

      testMapResponse.outputInstance = respJson.outputInstance;

      if (!testMapResponse?.outputInstance) {
        throw new Error('Test Map error: Schema output instance not properly set on successful response');
      }
    } else {
      const errorResponse: DmErrorResponse = (await response.json()).error;
      testMapResponse.statusText = `${errorResponse.code}: ${errorResponse.message}`;
    }

    return testMapResponse;
  }
}
