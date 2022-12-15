import DataMapperExt from '../DataMapperExt';
import {
  dataMapDefinitionsPath,
  draftMapDefinitionSuffix,
  schemasPath,
  supportedDataMapDefinitionFileExts,
  supportedSchemaFileExts,
} from '../extensionConfig';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling, registerCommand } from '@microsoft/vscode-azext-utils';
import { existsSync as fileExistsSync, promises as fs } from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { Uri, window } from 'vscode';

export const registerCommands = () => {
  registerCommand('azureDataMapper.createNewDataMap', () => createNewDataMapCmd());
  registerCommand('azureDataMapper.loadDataMapFile', (_context: IActionContext, uri: Uri) => loadDataMapFileCmd(uri));
};

const createNewDataMapCmd = () => {
  window.showInputBox({ prompt: 'Data Map name: ' }).then(async (newDataMapName) => {
    if (!newDataMapName) {
      /* TODO
      LogService.log(LogCategory.ExtensionCommands, 'createNewDataMapCmd', {
        message: 'Create new map canceled',
      });
      */

      return;
    }

    /* TODO
    LogService.log(LogCategory.ExtensionCommands, 'createNewDataMapCmd', {
      message: 'New map created',
    });
    */

    DataMapperExt.openDataMapperPanel(newDataMapName);
  });
};

const loadDataMapFileCmd = async (uri: Uri) => {
  let mapDefinitionPath: string | undefined = uri?.fsPath;
  let draftFileIsFoundAndShouldBeUsed = false;

  // Handle if Uri isn't provided/defined (cmd pallette or btn)
  if (!mapDefinitionPath) {
    const fileUris = await window.showOpenDialog({
      title: 'Select a data map definition to load',
      defaultUri: Uri.file(path.join(DataMapperExt.getWorkspaceFolderFsPath(), dataMapDefinitionsPath)),
      canSelectMany: false,
      canSelectFiles: true,
      canSelectFolders: false,
      filters: { 'Data Map Definition': supportedDataMapDefinitionFileExts.map((ext) => ext.replace('.', '')) },
    });

    if (fileUris && fileUris.length > 0) {
      mapDefinitionPath = fileUris[0].fsPath;
    } else {
      /* TODO
      LogService.log(LogCategory.ExtensionCommands, 'loadDataMapFileCmd', {
        message: 'Load map canceled when selecting data map',
      });
      */

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

  const mapDefinition = yaml.load(
    await fs.readFile(draftFileIsFoundAndShouldBeUsed ? draftMapDefinitionPath : mapDefinitionPath, 'utf-8')
  ) as {
    $sourceSchema: string;
    $targetSchema: string;
    [key: string]: any;
  };

  if (!mapDefinition.$sourceSchema || !mapDefinition.$targetSchema) {
    /* TODO
    LogService.error(LogCategory.ExtensionCommands, 'loadDataMapFileCmd', {
      message: 'Attempted to load invalid map, missing schema definitions',
    });
    */

    DataMapperExt.showError('Invalid data map definition: $sourceSchema and $targetSchema must be defined.');
    return;
  }

  // Attempt to load schema files if specified
  const schemasFolder = path.join(DataMapperExt.getWorkspaceFolderFsPath(), schemasPath);
  const srcSchemaPath = path.join(schemasFolder, mapDefinition.$sourceSchema);
  const tgtSchemaPath = path.join(schemasFolder, mapDefinition.$targetSchema);

  const attemptToResolveMissingSchemaFile = async (schemaName: string, schemaPath: string): Promise<boolean> => {
    return !!(await callWithTelemetryAndErrorHandling(
      'azureDataMapper.attemptToResolveMissingSchemaFile',
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
            filters: { 'XML Schema Definition': supportedSchemaFileExts.map((ext) => ext.replace('.', '')) },
          });

          if (fileUris && fileUris.length > 0) {
            // Copy the schema file they selected to the Schemas folder (can safely continue map definition loading)
            await fs.copyFile(fileUris[0].fsPath, schemaPath);
            /* TODO
            LogService.log(LogCategory.ExtensionCommands, 'loadDataMapFileCmd', {
              message: 'Load map successful',
            });
            */

            return true;
          }
        }

        // If user doesn't select a file, or doesn't click the above action, just return (cancel loading the MapDef)
        /* TODO
        LogService.log(LogCategory.ExtensionCommands, 'loadDataMapFileCmd', {
          message: 'Load map canceled during schema selection',
        });
        */

        return false;
      }
    ));
  };

  // If schema file doesn't exist, prompt to find/select it
  if (!fileExistsSync(srcSchemaPath)) {
    const successfullyFoundAndCopiedSchemaFile = await attemptToResolveMissingSchemaFile(mapDefinition.$sourceSchema, srcSchemaPath);

    if (!successfullyFoundAndCopiedSchemaFile) {
      /* TODO
      LogService.log(LogCategory.ExtensionCommands, 'loadDataMapFileCmd', {
        message: 'Load map canceled, no source schema selected',
      });
      */

      DataMapperExt.showError('No source schema file was selected. Aborting load...');
      return;
    }
  }

  if (!fileExistsSync(tgtSchemaPath)) {
    const successfullyFoundAndCopiedSchemaFile = await attemptToResolveMissingSchemaFile(mapDefinition.$targetSchema, tgtSchemaPath);

    if (!successfullyFoundAndCopiedSchemaFile) {
      /* TODO
      LogService.log(LogCategory.ExtensionCommands, 'loadDataMapFileCmd', {
        message: 'Load map canceled, no target schema selected',
      });
      */

      DataMapperExt.showError('No target schema file was selected. Aborting load...');
      return;
    }
  }

  const dataMapName = path.basename(mapDefinitionPath, path.extname(mapDefinitionPath)).replace(draftMapDefinitionSuffix, ''); // Gets filename w/o ext (and w/o draft suffix)

  // Set map definition data to be loaded once webview sends webviewLoaded msg
  DataMapperExt.openDataMapperPanel(dataMapName, {
    mapDefinition,
    sourceSchemaFileName: path.basename(srcSchemaPath),
    targetSchemaFileName: path.basename(tgtSchemaPath),
  });
};
