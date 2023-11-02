/* eslint-disable no-param-reassign */
import { extensionCommand } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import DataMapperExt from './DataMapperExt';
import { dataMapDefinitionsPath, draftMapDefinitionSuffix, schemasPath, supportedDataMapDefinitionFileExts } from './extensionConfig';
import type { MapDefinitionEntry } from '@microsoft/logic-apps-data-mapper';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import { existsSync as fileExistsSync, promises as fs } from 'fs';
import * as path from 'path';
import { Uri, window } from 'vscode';

export const createNewDataMapCmd = (context: IActionContext) => {
  window.showInputBox({ prompt: 'Data Map name: ' }).then(async (newDataMapName) => {
    if (!newDataMapName) {
      context.telemetry.properties.result = 'Canceled';
      return;
    }

    context.telemetry.properties.result = 'Succeeded';

    DataMapperExt.openDataMapperPanel(newDataMapName);
  });
};

export const loadDataMapFileCmd = async (context: IActionContext, uri: Uri) => {
  let mapDefinitionPath: string | undefined = uri?.fsPath;
  let draftFileIsFoundAndShouldBeUsed = false;

  // Handle if Uri isn't provided/defined (cmd pallette or btn)
  if (!mapDefinitionPath) {
    const fileUris = await window.showOpenDialog({
      title: 'Select a data map definition to load',
      defaultUri: Uri.file(path.join(ext.logicAppWorkspace, dataMapDefinitionsPath)),
      canSelectMany: false,
      canSelectFiles: true,
      canSelectFolders: false,
      filters: { 'Data Map Definition': supportedDataMapDefinitionFileExts.map((ext) => ext.replace('.', '')) },
    });

    if (fileUris && fileUris.length > 0) {
      mapDefinitionPath = fileUris[0].fsPath;
    } else {
      context.telemetry.properties.result = 'Canceled';
      context.telemetry.properties.wasUsingFilePicker = 'true';
      return;
    }
  }

  // Check if there's a draft version of the map (more up-to-date version) definition first, and load that if so
  const mapDefinitionFileName = path.basename(mapDefinitionPath);
  const mapDefFileExt = path.extname(mapDefinitionFileName);
  const draftMapDefinitionPath = path.join(
    path.dirname(mapDefinitionPath),
    mapDefinitionFileName.replace(mapDefFileExt, `${draftMapDefinitionSuffix}${mapDefFileExt}`)
  );

  if (!mapDefinitionFileName.includes(draftMapDefinitionSuffix)) {
    // The file we're loading isn't a draft file itself, so now it makes sense to check for a draft version
    if (fileExistsSync(draftMapDefinitionPath)) {
      draftFileIsFoundAndShouldBeUsed = true;
    }
  }

  let mapDefinition: MapDefinitionEntry = {};
  // Try to load the draft file first
  if (draftFileIsFoundAndShouldBeUsed) {
    const fileContents = await fs.readFile(draftMapDefinitionPath, 'utf-8');
    mapDefinition = DataMapperExt.loadMapDefinition(fileContents);
  }

  //If there is no draft file, or the draft file fails to deserialize, fall back to the base file
  if (Object.keys(mapDefinition).length === 0) {
    const fileContents = await fs.readFile(mapDefinitionPath, 'utf-8');
    mapDefinition = DataMapperExt.loadMapDefinition(fileContents);
  }

  /*   const mapDefinition = yaml.load(
      fileContents
    ) as {
      $sourceSchema: string;
      $targetSchema: string;
      [key: string]: any;
    }; */

  if (
    !mapDefinition.$sourceSchema ||
    typeof mapDefinition.$sourceSchema !== 'string' ||
    !mapDefinition.$targetSchema ||
    typeof mapDefinition.$targetSchema !== 'string'
  ) {
    context.telemetry.properties.eventDescription = 'Attempted to load invalid map, missing schema definitions';
    ext.showError(localize('MissingSourceTargetSchema', 'Invalid map definition: $sourceSchema and $targetSchema must be defined.'));
    return;
  }

  // Attempt to load schema files if specified
  const schemasFolder = path.join(ext.logicAppWorkspace, schemasPath);
  const srcSchemaPath = path.join(schemasFolder, mapDefinition.$sourceSchema);
  const tgtSchemaPath = path.join(schemasFolder, mapDefinition.$targetSchema);

  const attemptToResolveMissingSchemaFile = async (schemaName: string, schemaPath: string): Promise<boolean> => {
    return !!(await callWithTelemetryAndErrorHandling(
      extensionCommand.dataMapAttemptToResolveMissingSchemaFile,
      async (_context: IActionContext) => {
        const findSchemaFileButton = 'Find schema file';
        const clickedButton = await window.showErrorMessage(
          `Error loading map definition: ${schemaName} was not found in the Schemas folder!`,
          findSchemaFileButton
        );

        if (clickedButton && clickedButton === findSchemaFileButton) {
          const fileUris = await window.showOpenDialog({
            title: 'Select the missing schema file',
            canSelectMany: false,
            canSelectFiles: true,
            canSelectFolders: false,
            filters: { 'XML Schema': ['xsd'], 'JSON Schema': ['json'] },
          });

          if (fileUris && fileUris.length > 0) {
            // Copy the schema file they selected to the Schemas folder (can safely continue map definition loading)
            await fs.copyFile(fileUris[0].fsPath, schemaPath);
            context.telemetry.properties.result = 'Succeeded';

            return true;
          }
        }

        // If user doesn't select a file, or doesn't click the above action, just return (cancel loading the MapDef)
        context.telemetry.properties.result = 'Canceled';
        context.telemetry.properties.wasResolvingMissingSchemaFile = 'true';

        return false;
      }
    ));
  };

  // If schema file doesn't exist, prompt to find/select it
  if (!fileExistsSync(srcSchemaPath)) {
    const successfullyFoundAndCopiedSchemaFile = await attemptToResolveMissingSchemaFile(mapDefinition.$sourceSchema, srcSchemaPath);

    if (!successfullyFoundAndCopiedSchemaFile) {
      context.telemetry.properties.result = 'Canceled';
      context.telemetry.properties.missingSourceSchema = 'true';

      ext.showError(localize('MissingSourceSchema', 'No source schema file was selected. Aborting load...'));
      return;
    }
  }

  if (!fileExistsSync(tgtSchemaPath)) {
    const successfullyFoundAndCopiedSchemaFile = await attemptToResolveMissingSchemaFile(mapDefinition.$targetSchema, tgtSchemaPath);

    if (!successfullyFoundAndCopiedSchemaFile) {
      context.telemetry.properties.result = 'Canceled';
      context.telemetry.properties.missingTargetSchema = 'true';

      ext.showError(localize('MissingTargetSchema', 'No target schema file was selected. Aborting load...'));
      return;
    }
  }

  const dataMapName = path.basename(mapDefinitionPath, path.extname(mapDefinitionPath)).replace(draftMapDefinitionSuffix, ''); // Gets filename w/o ext (and w/o draft suffix)

  // Set map definition data to be loaded once webview sends webviewLoaded msg
  DataMapperExt.openDataMapperPanel(dataMapName, {
    mapDefinition,
    sourceSchemaFileName: path.basename(srcSchemaPath),
    targetSchemaFileName: path.basename(tgtSchemaPath),
    metadata: undefined,
  });
};
