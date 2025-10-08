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
}
