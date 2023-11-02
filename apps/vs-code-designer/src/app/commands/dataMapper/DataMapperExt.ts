import { ext } from '../../../extensionVariables';
import DataMapperPanel from './DataMapperPanel';
import { startBackendRuntime } from './FxWorkflowRuntime';
import { webviewType } from './extensionConfig';
import type { MapDefinitionData, MapDefinitionEntry } from '@microsoft/logic-apps-data-mapper';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { Uri, ViewColumn, window } from 'vscode';

export default class DataMapperExt {
  public static async openDataMapperPanel(dataMapName: string, mapDefinitionData?: MapDefinitionData) {
    const workflowFolder = ext.logicAppWorkspace;

    if (workflowFolder) {
      await startBackendRuntime(workflowFolder);

      DataMapperExt.createOrShow(dataMapName, mapDefinitionData);
    }
  }

  public static createOrShow(dataMapName: string, mapDefinitionData?: MapDefinitionData) {
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
      light: Uri.file(path.join(ext.context.extensionPath, 'assets', 'light', 'wand.png')),
      dark: Uri.file(path.join(ext.context.extensionPath, 'assets', 'dark', 'wand.png')),
    };
    ext.dataMapPanelManagers[dataMapName].updateWebviewPanelTitle();
    ext.dataMapPanelManagers[dataMapName].mapDefinitionData = mapDefinitionData;

    // From here, VSIX will handle any other initial-load-time events once receive webviewLoaded msg
  }

  /*
  Note: This method is copied from the MapDefinition.Utils.ts file in the @microsoft/logic-apps-data-mapper package
  if this method gets updated, both need to be updated to keep them in sync. This exists as a copy to avoid a
  package import issue.
  */
  public static loadMapDefinition = (mapDefinitionString: string | undefined): MapDefinitionEntry => {
    if (mapDefinitionString) {
      // Add extra escapes around custom string values, so that we don't lose which ones are which
      const modifiedMapDefinitionString = mapDefinitionString.replaceAll('"', `\\"`);
      const mapDefinition = yaml.load(modifiedMapDefinitionString) as MapDefinitionEntry;

      // Now that we've parsed the yml, remove the extra escaped quotes to restore the values
      DataMapperExt.fixMapDefinitionCustomValues(mapDefinition);

      return mapDefinition;
    } else {
      return {};
    }
  };

  static fixMapDefinitionCustomValues = (mapDefinition: MapDefinitionEntry) => {
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
        // eslint-disable-next-line no-param-reassign
        mapDefinition[key] = curElement.replaceAll('\\"', '"');
      }
    }
  };
}
