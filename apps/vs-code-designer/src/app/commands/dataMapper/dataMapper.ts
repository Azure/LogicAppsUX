/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extensionCommand } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import DataMapperExt from './DataMapperExt';
import {
  dataMapDefinitionsPath,
  dataMapsPath,
  draftMapDefinitionSuffix,
  draftXsltExtension,
  mapXsltExtension,
  schemasPath,
  supportedDataMapDefinitionFileExts,
  supportedDataMapFileExts,
} from './extensionConfig';
import { isNullOrUndefined, type MapDefinitionEntry, type MapMetadataV2 } from '@microsoft/logic-apps-shared';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import { existsSync as fileExistsSync, promises as fs } from 'fs';
import * as path from 'path';
import { Uri, window } from 'vscode';
import { getWorkspaceFolder } from '../../utils/workspace';
import { verifyAndPromptToCreateProject } from '../../utils/verifyIsProject';

export async function createNewDataMapCmd(context: IActionContext): Promise<void> {
  if (isNullOrUndefined(ext.defaultLogicAppPath)) {
    const workspaceFolder = await getWorkspaceFolder(
      context,
      localize('openLogicAppsProject', 'You must have a logic apps project open to use the Data Mapper.')
    );
    const projectPath: string | undefined =
      !isNullOrUndefined(workspaceFolder) && (await verifyAndPromptToCreateProject(context, workspaceFolder?.uri?.fsPath));
    if (!projectPath) {
      return;
    }
    ext.defaultLogicAppPath = projectPath;
  }
  DataMapperExt.openDataMapperPanel(context);
}

export async function loadDataMapFileCmd(context: IActionContext, uri: Uri): Promise<void> {
  let mapFilePath: string | undefined = uri?.fsPath;
  if (isNullOrUndefined(ext.defaultLogicAppPath)) {
    const workspaceFolder = await getWorkspaceFolder(
      context,
      localize('openLogicAppsProject', 'You must have a logic apps project open to use the Data Mapper.')
    );
    const projectPath: string | undefined =
      !isNullOrUndefined(workspaceFolder) && (await verifyAndPromptToCreateProject(context, workspaceFolder?.uri?.fsPath));
    if (!projectPath) {
      return;
    }
    ext.defaultLogicAppPath = projectPath;
  }

  // Handle if Uri isn't provided/defined (cmd palette or btn)
  if (!mapFilePath) {
    // Show file picker supporting both XSLT (new format) and LML (legacy format)
    const fileUris = await window.showOpenDialog({
      title: 'Select a data map to load',
      defaultUri: Uri.file(path.join(ext.defaultLogicAppPath, dataMapsPath)),
      canSelectMany: false,
      canSelectFiles: true,
      canSelectFolders: false,
      filters: {
        'Data Map (XSLT)': supportedDataMapFileExts.map((ext) => ext.replace('.', '')),
        'Data Map Definition (Legacy)': supportedDataMapDefinitionFileExts.map((ext) => ext.replace('.', '')),
      },
    });

    if (fileUris && fileUris.length > 0) {
      mapFilePath = fileUris[0].fsPath;
    } else {
      context.telemetry.properties.result = 'Canceled';
      context.telemetry.properties.wasUsingFilePicker = 'true';
      return;
    }
  }

  const fileExt = path.extname(mapFilePath).toLowerCase();
  const isXsltFile = supportedDataMapFileExts.includes(fileExt);
  const isLmlFile = supportedDataMapDefinitionFileExts.includes(fileExt);

  // Load based on file type
  if (isXsltFile) {
    await loadFromXsltFile(context, mapFilePath);
  } else if (isLmlFile) {
    await loadFromLmlFile(context, mapFilePath);
  } else {
    ext.showError(localize('UnsupportedFileType', 'Unsupported file type: {0}', fileExt));
  }
}

/**
 * Load a data map from an XSLT file with embedded metadata (new format).
 */
async function loadFromXsltFile(context: IActionContext, xsltPath: string): Promise<void> {
  const mapFileName = path.basename(xsltPath);
  const isDraftFile = mapFileName.includes('.draft.');

  // Check for draft version if not already loading a draft
  let fileToLoad = xsltPath;
  if (!isDraftFile) {
    const draftPath = xsltPath.replace(mapXsltExtension, draftXsltExtension);
    if (fileExistsSync(draftPath)) {
      fileToLoad = draftPath;
      context.telemetry.properties.loadingDraftFile = 'true';
    }
  }

  const fileContents = await fs.readFile(fileToLoad, 'utf-8');

  // Try to extract embedded metadata with error handling
  let loadedData: ReturnType<typeof DataMapperExt.loadMapFromXslt> = null;
  try {
    loadedData = DataMapperExt.loadMapFromXslt(fileContents, ext);
  } catch (parseError) {
    const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
    ext.showError(localize('XsltParsingFailed', 'Failed to parse XSLT file: {0}. The file may be corrupted or malformed.', errorMessage));
    context.telemetry.properties.xsltParsingError = errorMessage;
    return;
  }

  if (!loadedData) {
    // XSLT doesn't have embedded metadata - try to find and migrate from LML
    context.telemetry.properties.xsltHasEmbeddedMetadata = 'false';

    const dataMapName = path.basename(xsltPath, mapXsltExtension).replace('.draft', '');
    const lmlPath = path.join(ext.defaultLogicAppPath, dataMapDefinitionsPath, `${dataMapName}.lml`);

    if (fileExistsSync(lmlPath)) {
      ext.showWarning(
        localize(
          'MigratingFromLml',
          'XSLT file does not contain embedded metadata. Loading from legacy LML file and migrating. Please save to update the XSLT.'
        )
      );
      await loadFromLmlFile(context, lmlPath);
    } else {
      ext.showError(localize('NoMetadataFound', 'XSLT file does not contain embedded metadata and no legacy LML file was found.'));
    }
    return;
  }

  context.telemetry.properties.xsltHasEmbeddedMetadata = 'true';

  // Verify schema files exist
  const schemasFolder = path.join(ext.defaultLogicAppPath, schemasPath);
  const srcSchemaPath = path.join(schemasFolder, loadedData.sourceSchemaFileName);
  const tgtSchemaPath = path.join(schemasFolder, loadedData.targetSchemaFileName);

  if (!fileExistsSync(srcSchemaPath)) {
    const resolved = await attemptToResolveMissingSchemaFile(context, loadedData.sourceSchemaFileName, srcSchemaPath);
    if (!resolved) {
      return;
    }
  }

  if (!fileExistsSync(tgtSchemaPath)) {
    const resolved = await attemptToResolveMissingSchemaFile(context, loadedData.targetSchemaFileName, tgtSchemaPath);
    if (!resolved) {
      return;
    }
  }

  const dataMapName = path.basename(xsltPath, mapXsltExtension).replace('.draft', '');

  // Open the panel with map definition and embedded metadata
  // For v3 format, pass xsltContent so webview can parse it to derive connections
  DataMapperExt.openDataMapperPanel(context, dataMapName, {
    mapDefinition: loadedData.mapDefinition,
    sourceSchemaFileName: loadedData.sourceSchemaFileName,
    targetSchemaFileName: loadedData.targetSchemaFileName,
    metadata: loadedData.metadata as MapMetadataV2 | undefined,
    xsltContent: loadedData.xsltContent,
    isV3Format: loadedData.isV3Format,
  });
}

/**
 * Load a data map from an LML file (legacy format).
 * @deprecated Use loadFromXsltFile for new maps. This is for backward compatibility.
 */
async function loadFromLmlFile(context: IActionContext, lmlPath: string): Promise<void> {
  const mapDefinitionFileName = path.basename(lmlPath);
  const mapDefFileExt = path.extname(mapDefinitionFileName);
  let draftFileIsFoundAndShouldBeUsed = false;

  // Check for draft version
  const draftMapDefinitionPath = path.join(
    path.dirname(lmlPath),
    mapDefinitionFileName.replace(mapDefFileExt, `${draftMapDefinitionSuffix}${mapDefFileExt}`)
  );

  if (!mapDefinitionFileName.includes(draftMapDefinitionSuffix)) {
    if (fileExistsSync(draftMapDefinitionPath)) {
      draftFileIsFoundAndShouldBeUsed = true;
    }
  }

  let mapDefinition: MapDefinitionEntry = {};

  // Try to load the draft file first
  if (draftFileIsFoundAndShouldBeUsed) {
    const fileContents = await fs.readFile(draftMapDefinitionPath, 'utf-8');
    mapDefinition = DataMapperExt.loadMapDefinition(fileContents, ext);
  }

  // If there is no draft file, or the draft file fails to deserialize, fall back to the base file
  if (Object.keys(mapDefinition).length === 0) {
    const fileContents = await fs.readFile(lmlPath, 'utf-8');
    mapDefinition = DataMapperExt.loadMapDefinition(fileContents, ext);
  }

  if (
    !mapDefinition.$sourceSchema ||
    typeof mapDefinition.$sourceSchema !== 'string' ||
    !mapDefinition.$targetSchema ||
    typeof mapDefinition.$targetSchema !== 'string'
  ) {
    if (Object.keys(mapDefinition).length !== 0) {
      context.telemetry.properties.eventDescription = 'Attempted to load invalid map, missing schema definitions';
      ext.showError(localize('MissingSourceTargetSchema', 'Invalid map definition: $sourceSchema and $targetSchema must be defined.'));
    }
    return;
  }

  // Verify schema files exist
  const schemasFolder = path.join(ext.defaultLogicAppPath, schemasPath);
  const srcSchemaPath = path.join(schemasFolder, mapDefinition.$sourceSchema);
  const tgtSchemaPath = path.join(schemasFolder, mapDefinition.$targetSchema);

  if (!fileExistsSync(srcSchemaPath)) {
    const resolved = await attemptToResolveMissingSchemaFile(context, mapDefinition.$sourceSchema, srcSchemaPath);
    if (!resolved) {
      return;
    }
  }

  if (!fileExistsSync(tgtSchemaPath)) {
    const resolved = await attemptToResolveMissingSchemaFile(context, mapDefinition.$targetSchema, tgtSchemaPath);
    if (!resolved) {
      return;
    }
  }

  const dataMapName = path.basename(lmlPath, path.extname(lmlPath)).replace(draftMapDefinitionSuffix, '');

  // Set map definition data to be loaded once webview sends webviewLoaded msg
  DataMapperExt.openDataMapperPanel(context, dataMapName, {
    mapDefinition,
    sourceSchemaFileName: path.basename(srcSchemaPath),
    targetSchemaFileName: path.basename(tgtSchemaPath),
  });
}

/**
 * Prompts user to find a missing schema file.
 */
async function attemptToResolveMissingSchemaFile(context: IActionContext, schemaName: string, schemaPath: string): Promise<boolean> {
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
          await fs.copyFile(fileUris[0].fsPath, schemaPath);
          context.telemetry.properties.result = 'Succeeded';
          return true;
        }
      }

      context.telemetry.properties.result = 'Canceled';
      context.telemetry.properties.wasResolvingMissingSchemaFile = 'true';
      ext.showError(localize('MissingSchema', 'No schema file was selected. Aborting load...'));
      return false;
    }
  ));
}
