/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import DataMapperPanel from './DataMapperPanel';
import { startBackendRuntime } from './FxWorkflowRuntime';
import { webviewType } from './extensionConfig';
import { guid, type MapDefinitionEntry } from '@microsoft/logic-apps-shared';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { MapDefinitionData } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';
import { Uri, ViewColumn, window } from 'vscode';
import { parse } from 'yaml';
import { localize } from '../../../localize';
import { assetsFolderName, dataMapNameValidation } from '../../../constants';

/**
 * UI metadata for function positions and canvas state.
 */
interface XsltUiMetadata {
  functionNodes: Array<{
    reactFlowGuid: string;
    functionKey: string;
    position: { x: number; y: number };
    connections: Array<{ name: string; inputOrder: number }>;
    connectionShorthand: string;
  }>;
  canvasRect?: { x: number; y: number; width: number; height: number };
}

/**
 * Metadata embedded in XSLT files for Data Mapper v2.
 * Contains mapDefinition in the metadata (legacy format).
 * @deprecated Use XsltMapMetadataV3 which doesn't embed mapDefinition
 */
interface XsltMapMetadataV2 {
  version: '2.0';
  sourceSchema: string;
  targetSchema: string;
  mapDefinition: MapDefinitionEntry;
  metadata: XsltUiMetadata;
}

/**
 * Metadata embedded in XSLT files for Data Mapper v3.
 * Only embeds layout metadata - mapping logic is derived from XSLT content.
 */
interface XsltMapMetadataV3 {
  version: '3.0';
  sourceSchema: string;
  targetSchema: string;
  metadata: XsltUiMetadata;
}

/**
 * Union type supporting both v2 and v3 metadata formats.
 */
type XsltMapMetadata = XsltMapMetadataV2 | XsltMapMetadataV3;

/**
 * Type guard to check if metadata is v2 format (with mapDefinition).
 */
const isV2Metadata = (metadata: XsltMapMetadata): metadata is XsltMapMetadataV2 => {
  return metadata.version === '2.0' && 'mapDefinition' in metadata;
};

/**
 * Type guard to check if metadata is v3 format (without mapDefinition).
 */
const isV3Metadata = (metadata: XsltMapMetadata): metadata is XsltMapMetadataV3 => {
  return metadata.version === '3.0';
};

export default class DataMapperExt {
  public static async openDataMapperPanel(
    context: IActionContext,
    dataMapName?: string,
    mapDefinitionData?: MapDefinitionData
  ): Promise<void> {
    await startBackendRuntime(context, ext.defaultLogicAppPath);
    const name =
      dataMapName ??
      (await context.ui.showInputBox({
        placeHolder: localize('dataMapName', 'Data Map name'),
        prompt: localize('dataMapNamePrompt', 'Enter a name for your Data Map'),
        validateInput: async (input: string): Promise<string | undefined> => await DataMapperExt.validateDataMapName(input),
      }));
    DataMapperExt.createOrShow(name, mapDefinitionData);
  }

  /*
  Note: This method is copied from the MapDefinition.Utils.ts file in the @microsoft/logic-apps-data-mapper package
  if this method gets updated, both need to be updated to keep them in sync. This exists as a copy to avoid a
  package import issue.
  */
  public static loadMapDefinition(mapDefinitionString: string | undefined, ext: any): MapDefinitionEntry {
    if (mapDefinitionString) {
      try {
        // Add extra escapes around custom string values, so that we don't lose which ones are which
        let modifiedMapDefinitionString = mapDefinitionString.replaceAll('"', `\\"`);
        modifiedMapDefinitionString = modifiedMapDefinitionString.replaceAll('$for', () => `${guid()}-$for`);
        modifiedMapDefinitionString = modifiedMapDefinitionString.replaceAll('$if', () => `${guid()}-$if`);

        const mapDefinition = parse(modifiedMapDefinitionString, { strict: false, uniqueKeys: false }) as MapDefinitionEntry;
        // Now that we've parsed the yml, remove the extra escaped quotes to restore the values
        DataMapperExt.fixMapDefinitionCustomValues(mapDefinition);
        return mapDefinition;
      } catch (e) {
        ext.showError('Exception while parsing LML file!', { detail: e.message, modal: true });
      }
    }
    return {};
  }

  private static async validateDataMapName(name: string | undefined): Promise<string | undefined> {
    if (!name || name.length === 0) {
      return localize('dataMapNameEmpty', 'Data Map name cannot be empty');
    }

    if (!dataMapNameValidation.test(name)) {
      return localize(
        'dataMapNameInvalidMessage',
        'Data Map name must start with a letter and can only contain letters, digits, "_" and "-".'
      );
    }
    return undefined;
  }

  private static createOrShow(dataMapName: string, mapDefinitionData?: MapDefinitionData) {
    // If a panel has already been created, re-show it
    if (ext.dataMapPanelManagers[dataMapName]) {
      // NOTE: Shouldn't need to re-send runtime port if webview has already been loaded/set up

      window.showInformationMessage(`A Data Mapper panel is already open for this data map (${dataMapName}).`);
      ext.dataMapPanelManagers[dataMapName].panel.reveal(ViewColumn.Active);
      return;
    }

    const panel = window.createWebviewPanel(
      webviewType, // Key used to reference the panel
      dataMapName, // Title displayed in the tab
      ViewColumn.Active, // Editor column to show the new webview panel in
      {
        enableScripts: true,
        // NOTE: Keeps webview content state even when placed in background (same as browsers)
        // - not as performant as vscode's get/setState, but likely not a concern at all for MVP
        retainContextWhenHidden: true,
      }
    );

    ext.dataMapPanelManagers[dataMapName] = new DataMapperPanel(panel, dataMapName);
    ext.dataMapPanelManagers[dataMapName].panel.iconPath = {
      light: Uri.file(path.join(ext.context.extensionPath, assetsFolderName, 'light', 'wand.png')),
      dark: Uri.file(path.join(ext.context.extensionPath, assetsFolderName, 'dark', 'wand.png')),
    };
    ext.dataMapPanelManagers[dataMapName].updateWebviewPanelTitle();
    ext.dataMapPanelManagers[dataMapName].mapDefinitionData = mapDefinitionData;

    // From here, VSIX will handle any other initial-load-time events once receive webviewLoaded msg
  }

  private static fixMapDefinitionCustomValues(mapDefinition: MapDefinitionEntry) {
    for (const key in mapDefinition) {
      const curElement = mapDefinition[key];
      if (typeof curElement === 'object' && curElement !== null) {
        if (Array.isArray(curElement)) {
          // TODO: Handle arrays better, currently fine for XML, but this will need to be re-addressed
          // when we get to the advanced JSON array functionality
          curElement.forEach((arrayElement) => DataMapperExt.fixMapDefinitionCustomValues(arrayElement));
        } else {
          DataMapperExt.fixMapDefinitionCustomValues(curElement);
        }
      } else if (Object.prototype.hasOwnProperty.call(mapDefinition, key) && typeof curElement === 'string') {
        mapDefinition[key] = curElement.replaceAll('\\"', '"');
      }
    }
  }

  /**
   * Regex to extract metadata JSON from XSLT comment.
   */
  private static readonly METADATA_REGEX = /<!--\s*LogicAppsDataMapper:\s*([\s\S]*?)\s*-->/;

  /**
   * Checks if an XSLT string has embedded metadata.
   */
  public static hasEmbeddedMetadata(xslt: string): boolean {
    return DataMapperExt.METADATA_REGEX.test(xslt);
  }

  /**
   * Extracts metadata from an XSLT string if present.
   * Supports both v2 (with mapDefinition) and v3 (without mapDefinition) formats.
   */
  public static extractMetadataFromXslt(xslt: string): XsltMapMetadata | null {
    const match = xslt.match(DataMapperExt.METADATA_REGEX);

    if (!match || !match[1]) {
      return null;
    }

    try {
      const metadata = JSON.parse(match[1]) as XsltMapMetadata;

      // Validate required fields (common to both v2 and v3)
      if (!metadata.version || !metadata.sourceSchema || !metadata.targetSchema) {
        console.warn('XSLT metadata missing required fields');
        return null;
      }

      // v2 requires mapDefinition, v3 does not
      if (metadata.version === '2.0' && !('mapDefinition' in metadata)) {
        console.warn('XSLT metadata v2.0 missing mapDefinition');
        return null;
      }

      return metadata;
    } catch (error) {
      console.error('Failed to parse XSLT metadata JSON:', error);
      return null;
    }
  }

  /**
   * Return type for loadMapFromXslt
   */
  public static loadMapFromXslt(
    xsltContent: string,
    _extInstance: typeof ext
  ): {
    mapDefinition: MapDefinitionEntry;
    sourceSchemaFileName: string;
    targetSchemaFileName: string;
    metadata?: XsltUiMetadata;
    xsltContent?: string;
    isV3Format?: boolean;
  } | null {
    const metadata = DataMapperExt.extractMetadataFromXslt(xsltContent);

    if (!metadata) {
      return null;
    }

    // Handle v2 format (with embedded mapDefinition)
    if (isV2Metadata(metadata)) {
      // Fix custom values in the map definition (same processing as LML)
      DataMapperExt.fixMapDefinitionCustomValues(metadata.mapDefinition);

      return {
        mapDefinition: metadata.mapDefinition,
        sourceSchemaFileName: metadata.sourceSchema,
        targetSchemaFileName: metadata.targetSchema,
        metadata: metadata.metadata,
        isV3Format: false,
      };
    }

    // Handle v3 format (without embedded mapDefinition)
    // For v3, we pass the raw XSLT content so the webview can parse it
    // to derive the mapping connections from the actual XSLT
    if (isV3Metadata(metadata)) {
      return {
        // Empty mapDefinition - webview will derive from XSLT
        mapDefinition: {},
        sourceSchemaFileName: metadata.sourceSchema,
        targetSchemaFileName: metadata.targetSchema,
        metadata: metadata.metadata,
        xsltContent: xsltContent,
        isV3Format: true,
      };
    }

    return null;
  }
}
