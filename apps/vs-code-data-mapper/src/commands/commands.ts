import DataMapperExt from '../DataMapperExt';
import { draftMapDefinitionSuffix, schemasPath } from '../extensionConfig';
import { callWithTelemetryAndErrorHandling, registerCommand } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { promises as fs, existsSync as fileExistsSync } from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { window } from 'vscode';
import type { Uri } from 'vscode';

export const registerCommands = () => {
  registerCommand('azureDataMapper.createNewDataMap', () => createNewDataMapCmd());
  registerCommand('azureDataMapper.loadDataMapFile', (_context: IActionContext, uri: Uri) => loadDataMapFileCmd(uri));
};

const createNewDataMapCmd = () => {
  window.showInputBox({ prompt: 'Data Map name: ' }).then(async (newDatamapName) => {
    if (!newDatamapName) {
      return;
    }

    DataMapperExt.openDataMapperPanel(newDatamapName);
  });
};

const loadDataMapFileCmd = async (uri: Uri) => {
  let draftFileIsFoundAndShouldBeUsed = false;

  // Check if there's a draft version of the map (more up-to-date version) definition first, and load that if so
  const mapDefinitionFileName = path.basename(uri.fsPath);
  const mapDefFileExt = path.extname(mapDefinitionFileName);
  const draftMapDefinitionPath = path.join(
    path.dirname(uri.fsPath),
    mapDefinitionFileName.replace(mapDefFileExt, `${draftMapDefinitionSuffix}${mapDefFileExt}`)
  );

  if (!mapDefinitionFileName.includes(draftMapDefinitionSuffix)) {
    // The file we're loading isn't a draft file itself, so now it makes sense to check for a draft version
    if (fileExistsSync(draftMapDefinitionPath)) {
      draftFileIsFoundAndShouldBeUsed = true;
    }
  }

  const mapDefinition = yaml.load(await fs.readFile(draftFileIsFoundAndShouldBeUsed ? draftMapDefinitionPath : uri.fsPath, 'utf-8')) as {
    $sourceSchema: string;
    $targetSchema: string;
    [key: string]: any;
  };

  // Attempt to load schema files if specified
  const workflowFolder = DataMapperExt.getWorkspaceFolderFsPath();
  if (!workflowFolder) {
    throw new Error('No workflow folder found onLoadDataMapFile');
  }

  const schemasFolder = path.join(workflowFolder, schemasPath);
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
            canSelectMany: false,
            canSelectFiles: true,
            canSelectFolders: false,
            filters: { 'XML Schema Definition': ['xsd'] },
          });

          if (fileUris && fileUris.length > 0) {
            // Copy the schema file they selected to the Schemas folder (can safely continue map definition loading)
            await fs.copyFile(fileUris[0].fsPath, schemaPath);
            return true;
          }
        }

        // If user doesn't select a file, or doesn't click the above action, just return (cancel loading the MapDef)
        return false;
      }
    ));
  };

  // If schema file doesn't exist, prompt to find/select it
  if (!fileExistsSync(srcSchemaPath)) {
    const successfullyFoundAndCopiedSchemaFile = await attemptToResolveMissingSchemaFile(mapDefinition.$sourceSchema, srcSchemaPath);

    if (!successfullyFoundAndCopiedSchemaFile) {
      DataMapperExt.showError('No source schema file was selected. Aborting load...');
      return;
    }
  }

  if (!fileExistsSync(tgtSchemaPath)) {
    const successfullyFoundAndCopiedSchemaFile = await attemptToResolveMissingSchemaFile(mapDefinition.$targetSchema, tgtSchemaPath);

    if (!successfullyFoundAndCopiedSchemaFile) {
      DataMapperExt.showError('No target schema file was selected. Aborting load...');
      return;
    }
  }

  const dataMapName = path.basename(uri.fsPath, path.extname(uri.fsPath)).replace(draftMapDefinitionSuffix, ''); // Gets filename w/o ext (and w/o draft suffix)

  // Set map definition data to be loaded once webview sends webviewLoaded msg
  DataMapperExt.openDataMapperPanel(dataMapName, {
    mapDefinition,
    sourceSchemaFileName: path.basename(srcSchemaPath),
    targetSchemaFileName: path.basename(tgtSchemaPath),
  });
};
