import type { ArtifactProperties } from '../Models/Workflow';
import type { DynamicCallServiceOptions } from './ChildWorkflow';
import type { ListDynamicValue } from '@microsoft/logic-apps-shared';

interface ArtifactServiceOptions extends DynamicCallServiceOptions {
  integrationAccountCallbackUrl: string | undefined;
}

interface FileDetails {
  extensionName: string;
  fileName: string;
  name: string;
}

interface MapArtifact {
  mapType: string;
  mapName: string;
}

interface SchemaArtifact {
  schemaName: string;
  schemaType: string;
}

export class ArtifactService {
  private _mapArtifacts: Record<string, FileDetails[]> | undefined;
  private _schemaArtifacts: FileDetails[] | undefined;
  private _iaMapArtifacts: Record<string, MapArtifact[]> | undefined;
  private _iaSchemaArtifacts: SchemaArtifact[] | undefined;

  constructor(private readonly options: ArtifactServiceOptions) {
    const { apiVersion, baseUrl, siteResourceId, httpClient } = this.options;

    if (!apiVersion) {
      throw new Error('apiVersion required');
    } else if (!baseUrl) {
      throw new Error('baseUrl required');
    } else if (!siteResourceId) {
      throw new Error('siteResourceId required');
    } else if (!httpClient) {
      throw new Error('httpClient required');
    }
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
    if (this._mapArtifacts === undefined) {
      const mapFiles = await this._getArtifactFiles('Artifacts/Maps', 'Failed to get integration account maps');
      this._mapArtifacts = {};

      for (const file of mapFiles) {
        const { extensionName, fileName, name } = file;

        if (this._mapArtifacts[extensionName] === undefined) {
          this._mapArtifacts[extensionName] = [];
        }

        this._mapArtifacts[extensionName].push({
          name,
          extensionName,
          fileName,
        });
      }
    }

    const normalizedMapType = mapType.toLowerCase();
    return this._mapArtifacts[normalizedMapType]
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
    if (this._schemaArtifacts === undefined) {
      this._schemaArtifacts = await this._getArtifactFiles('Artifacts/Schemas', 'Failed to get integration account schemas');
    }

    return this._schemaArtifacts.map((artifact) => ({
      value: artifact.fileName,
      displayName: artifact.name,
    }));
  }

  private async _getArtifactFiles(filePath: string, _errorMessage: string): Promise<FileDetails[]> {
    const { apiVersion, baseUrl, siteResourceId, httpClient } = this.options;
    const response = await httpClient.get<ArtifactProperties[]>({
      uri: `${baseUrl}${siteResourceId}/hostruntime/admin/vfs/${filePath}/?api-version=${apiVersion}&relativepath=1`,
    });

    return response.map((file: any) => {
      const fileName = file.name;
      const extensionIndex = fileName.lastIndexOf('.');
      const extensionName = extensionIndex > -1 ? fileName.substr(extensionIndex + 1).toLowerCase() : '';
      const name = extensionIndex > -1 ? fileName.substring(0, extensionIndex) : fileName;

      return {
        name,
        extensionName,
        fileName,
      };
    });
  }
}
