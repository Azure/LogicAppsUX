import DataMapperExt from '../DataMapperExt';
import { startBackendRuntime } from '../FxWorkflowRuntime';
import { schemasPath } from '../extensionConfig';
import { callWithTelemetryAndErrorHandlingSync, registerCommand } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { promises as fs, existsSync as fileExists } from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { window } from 'vscode';
import type { Uri } from 'vscode';

export const registerCommands = () => {
  registerCommand('azureDataMapper.openDataMapper', () => openDataMapperCmd());
  registerCommand('azureDataMapper.createNewDataMap', () => createNewDataMapCmd());
  registerCommand('azureDataMapper.loadDataMapFile', (_context: IActionContext, uri: Uri) => loadDataMapFileCmd(uri));
};

const openDataMapperCmd = async () => {
  const workflowFolder = DataMapperExt.getWorkspaceFolderFsPath();

  if (workflowFolder) {
    await startBackendRuntime(workflowFolder);

    DataMapperExt.createOrShow();
  }
};

const createNewDataMapCmd = () => {
  // TODO: Data map name validation
  window.showInputBox({ prompt: 'Data Map name: ' }).then(async (newDatamapName) => {
    if (!newDatamapName) {
      return;
    }

    DataMapperExt.currentDataMapName = newDatamapName;

    await openDataMapperCmd();
  });
};

const loadDataMapFileCmd = async (uri: Uri) => {
  const mapDefinition = yaml.load(await fs.readFile(uri.fsPath, 'utf-8')) as {
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
    return !!callWithTelemetryAndErrorHandlingSync(
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
    );
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

  await openDataMapperCmd();

  DataMapperExt.currentPanel?.sendMsgToWebview({
    command: 'loadDataMap',
    data: {
      mapDefinition: mapDefinition,
      sourceSchemaFileName: path.basename(srcSchemaPath),
      targetSchemaFileName: path.basename(tgtSchemaPath),
    },
  });
  DataMapperExt.checkForAndSetXsltFilename();
};
