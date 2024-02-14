import type { ApiHubServiceDetails } from '../base/connection';
import type { ListDynamicValue } from '../connector';
import type { IHttpClient } from '../httpClient';

interface ArtifactServiceOptions {
  apiVersion: string;
  baseUrl: string;
  httpClient: IHttpClient;
  integrationAccountCallbackUrl: string | undefined;
  schemaArtifacts?: FileDetails[] | undefined;
  mapArtifacts?: Record<string, FileDetails[]> | undefined;
  apiHubServiceDetails?: ApiHubServiceDetails;
}

interface FileDetails {
  name: string;
  fileName: string;
  relativePath: string;
}

interface MapArtifact {
  mapType: string;
  mapName: string;
}

interface SchemaArtifact {
  schemaName: string;
  schemaType: string;
}

export class StandardArtifactService {
  private _mapArtifacts: Record<string, FileDetails[]> | undefined = {};
  private _schemaArtifacts: FileDetails[] | undefined;
  private _iaMapArtifacts: Record<string, MapArtifact[]> | undefined;
  private _iaSchemaArtifacts: SchemaArtifact[] | undefined;

  constructor(private readonly options: ArtifactServiceOptions) {
    const { apiVersion, baseUrl, httpClient, schemaArtifacts, mapArtifacts } = this.options;

    if (!apiVersion) {
      throw new Error('apiVersion required');
    } else if (!baseUrl) {
      throw new Error('baseUrl required');
    } else if (!httpClient) {
      throw new Error('httpClient required');
    }
    this._schemaArtifacts = schemaArtifacts;
    this._mapArtifacts = mapArtifacts;
  }

  public getMapArtifacts(mapType: string, mapSource: string): Promise<ListDynamicValue[]> {
    if (mapSource === 'IntegrationAccount') {
      return this._getMapArtifactsFromIA(mapType);
    } else {
      return this._getMapArtifactsFromLA(mapType);
    }
  }

  private async _getMapArtifactsFromIA(mapType: string): Promise<ListDynamicValue[]> {
    if (this._iaMapArtifacts === undefined) {
      const mapArtifacts = await this._loadMapArtifactsFromIA();
      this._iaMapArtifacts = {};
      for (const mapArtifact of mapArtifacts) {
        if (this._iaMapArtifacts[mapArtifact.mapType] === undefined) {
          this._iaMapArtifacts[mapArtifact.mapType] = [];
        }
        this._iaMapArtifacts[mapArtifact.mapType].push(mapArtifact);
      }
    }

    const normalizedMapType = mapType.toLowerCase();
    return this._iaMapArtifacts[normalizedMapType]
      ? this._iaMapArtifacts[normalizedMapType].map((artifact) => ({
          value: artifact.mapName,
          displayName: artifact.mapName,
        }))
      : [];
  }

  private async _loadMapArtifactsFromIA(): Promise<MapArtifact[]> {
    const { integrationAccountCallbackUrl } = this.options;
    if (!integrationAccountCallbackUrl) {
      throw new Error(
        'Integration account callback URL not specified. Please see https://aka.ms/link-integration-account for more information.'
      );
    }

    const url = new URL(integrationAccountCallbackUrl);
    if (url.pathname == '/') {
      url.pathname += 'groups/common';
    }

    url.pathname += '/maps';
    const response = await fetch(url.href);
    const responseJson = await response.json();

    if (!response.ok) {
      throw new Error(responseJson ? responseJson.message : 'Failed to load maps.');
    }

    return (responseJson.value || []).map((map: any) => {
      return {
        mapType: map.properties.mapType.toLowerCase(),
        mapName: map.name,
      };
    });
  }

  private async _getMapArtifactsFromLA(mapType: string): Promise<ListDynamicValue[]> {
    const normalizedMapType = mapType.toLowerCase();
    return this._mapArtifacts && this._mapArtifacts[normalizedMapType]
      ? this._mapArtifacts[normalizedMapType].map((artifact) => ({
          value: artifact.fileName,
          displayName: artifact.name,
        }))
      : [];
  }

  public getSchemaArtifacts(schemaSource: string): Promise<ListDynamicValue[]> {
    if (schemaSource === 'IntegrationAccount') {
      return this._getSchemaArtifactsFromIA();
    } else {
      return this._getSchemaArtifactsFromLA();
    }
  }

  private async _getSchemaArtifactsFromIA(): Promise<ListDynamicValue[]> {
    if (this._iaSchemaArtifacts === undefined) {
      const schemaArtifacts = await this._loadSchemaArtifactsFromIA();
      this._iaSchemaArtifacts = [];
      for (const schemaArtifact of schemaArtifacts) {
        this._iaSchemaArtifacts.push(schemaArtifact);
      }
    }

    return this._iaSchemaArtifacts.map((artifact) => ({
      value: artifact.schemaName,
      displayName: artifact.schemaName,
    }));
  }

  private async _loadSchemaArtifactsFromIA(): Promise<SchemaArtifact[]> {
    const { integrationAccountCallbackUrl } = this.options;
    if (!integrationAccountCallbackUrl) {
      throw new Error(
        'Integration account callback URL not specified. Please see https://aka.ms/link-integration-account for more information.'
      );
    }

    const url = new URL(integrationAccountCallbackUrl);
    if (url.pathname == '/') {
      url.pathname += 'groups/common';
    }

    url.pathname += '/schemas';
    const response = await fetch(url.href);
    const responseJson = await response.json();

    if (!response.ok) {
      throw new Error(responseJson ? responseJson.message : 'Failed to load schemas.');
    }

    return (responseJson.value || []).map((schema: any) => {
      return {
        schemaType: schema.properties.schemaType,
        schemaName: schema.name,
      };
    });
  }

  private async _getSchemaArtifactsFromLA(): Promise<ListDynamicValue[]> {
    return this._schemaArtifacts
      ? this._schemaArtifacts.map((artifact) => ({
          value: artifact.fileName,
          displayName: artifact.name,
        }))
      : [];
  }
}
