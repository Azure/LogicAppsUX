import DataMapperExt from '../DataMapperExt';
import { startBackendRuntime } from '../FxWorkflowRuntime';
import { schemasPath } from '../extensionConfig';
import { promises as fs, existsSync as fileExists } from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { commands, window, workspace } from 'vscode';
import type { ExtensionContext, Uri } from 'vscode';

export const registerCommands = (context: ExtensionContext) => {
  context.subscriptions.push(commands.registerCommand('azureDataMapper.openDataMapper', () => openDataMapperCmd(context)));
  context.subscriptions.push(commands.registerCommand('azureDataMapper.createNewDataMap', () => createNewDataMapCmd(context)));
  context.subscriptions.push(commands.registerCommand('azureDataMapper.loadDataMapFile', (uri: Uri) => loadDataMapFileCmd(uri, context)));
};

const openDataMapperCmd = async (context: ExtensionContext) => {
  await startBackendRuntime(DataMapperExt.getWorkspaceFolderFsPath());

  DataMapperExt.createOrShow(context);
};

const createNewDataMapCmd = (context: ExtensionContext) => {
  // TODO: Data map name validation
  window.showInputBox({ prompt: 'Data Map name: ' }).then(async (newDatamapName) => {
    if (!newDatamapName) {
      return;
    }

    DataMapperExt.currentDataMapName = newDatamapName;

    await openDataMapperCmd(context);

    DataMapperExt.currentPanel.sendMsgToWebview({ command: 'loadNewDataMap', data: {} });
  });
};

const loadDataMapFileCmd = async (uri: Uri, context: ExtensionContext) => {
  const mapDefinition = yaml.load(await fs.readFile(uri.fsPath, 'utf-8')) as {
    $sourceSchema: string;
    $targetSchema: string;
    [key: string]: any;
  };

  // Attempt to load schema files if specified
  const schemasFolder = path.join(workspace.workspaceFolders[0].uri.fsPath, schemasPath);
  const srcSchemaPath = path.join(schemasFolder, mapDefinition.$sourceSchema);
  const tgtSchemaPath = path.join(schemasFolder, mapDefinition.$targetSchema);

  const attemptToResolveMissingSchemaFile = async (schemaName: string, schemaPath: string): Promise<boolean> => {
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
  };

  // If schema file doesn't exist, prompt to find/select it
  if (!fileExists(srcSchemaPath)) {
    const successfullyFoundAndCopiedSchemaFile = await attemptToResolveMissingSchemaFile(mapDefinition.$sourceSchema, srcSchemaPath);

    if (!successfullyFoundAndCopiedSchemaFile) {
      DataMapperExt.showError('No source schema file was selected. Aborting load...');
      return;
    }
  }

  if (!fileExists(tgtSchemaPath)) {
    const successfullyFoundAndCopiedSchemaFile = await attemptToResolveMissingSchemaFile(mapDefinition.$targetSchema, tgtSchemaPath);

    if (!successfullyFoundAndCopiedSchemaFile) {
      DataMapperExt.showError('No target schema file was selected. Aborting load...');
      return;
    }
  }

  DataMapperExt.currentDataMapName = path.basename(uri.fsPath, path.extname(uri.fsPath)); // Gets filename w/o ext

  await openDataMapperCmd(context);

  DataMapperExt.currentPanel.sendMsgToWebview({
    command: 'loadDataMap',
    data: {
      mapDefinition: mapDefinition,
      sourceSchemaFileName: path.basename(srcSchemaPath),
      targetSchemaFileName: path.basename(tgtSchemaPath),
    },
  });
  DataMapperExt.checkForAndSetXsltFilename();
};
