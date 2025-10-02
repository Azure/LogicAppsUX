import type {
  ParametersData,
  ConnectionsData,
  IFunctionWizardContext,
  AzureConnectorDetails,
  ILocalSettingsJson,
} from '@microsoft/vscode-extension-logic-apps';
import { getAzureConnectorDetailsForLocalProject } from './codeless/common';
import { getConnectionsAndSettingsToUpdate, getConnectionsJson, saveConnectionReferences } from './codeless/connection';
import { extend, isEmptyString } from '@microsoft/logic-apps-shared';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { getParametersJson } from './codeless/parameter';
import { areAllConnectionsParameterized, parameterizeConnection } from './codeless/parameterizer';
import * as path from 'path';
import * as fse from 'fs-extra';
import { isCSharpProject } from './detectProjectLanguage';
import { azureWebJobsStorageKey, parameterizeConnectionsInProjectLoadSetting, parametersFileName } from '../../constants';
import { addNewFileInCSharpProject } from './codeless/updateBuildFile';
import { writeFormattedJson } from './fs';
import { Uri, window, workspace } from 'vscode';
import { unzipLogicAppArtifacts } from './taskUtils';
import { getGlobalSetting } from './vsCodeConfig/settings';
import { getLocalSettingsJson } from './appSettings/localSettings';
import { callWithTelemetryAndErrorHandling, type IActionContext } from '@microsoft/vscode-azext-utils';
import { getContainingWorkspace } from './workspace';
import AdmZip from 'adm-zip';

interface ICachedTextDocument {
  projectPath: string;
  textDocumentPath: string;
}

const cacheKey = 'azLAPostExtractReadMe';

export async function extractConnectionDetails(connections: any): Promise<any> {
  const SUBSCRIPTION_INDEX = 2;
  const MANAGED_API_LOCATION_INDEX = 6;
  const MANAGED_CONNECTION_RESOURCE_GROUP_INDEX = 4;

  const details = [];
  const managedApiConnections = connections['managedApiConnections'];
  if (managedApiConnections) {
    for (const connKey in managedApiConnections) {
      if (Object.prototype.hasOwnProperty.call(managedApiConnections, connKey)) {
        const api = managedApiConnections[connKey]['api'];
        const connection = managedApiConnections[connKey]['connection'];
        if (api?.id && connection?.id) {
          const idPath = api['id'];
          const connectionIdPath = connection['id'];
          const apiIdParts = idPath.split('/');
          const connectionIdParts = connectionIdPath.split('/');
          if (apiIdParts) {
            const detail = {
              WORKFLOWS_SUBSCRIPTION_ID: apiIdParts[SUBSCRIPTION_INDEX],
              WORKFLOWS_LOCATION_NAME: apiIdParts[MANAGED_API_LOCATION_INDEX],
              WORKFLOWS_RESOURCE_GROUP_NAME: connectionIdParts[MANAGED_CONNECTION_RESOURCE_GROUP_INDEX],
            };
            details.push(detail);
          }
        }
      }
    }
    return details;
  }
}

export async function extractConnectionSettings(context: IFunctionWizardContext): Promise<Record<string, any>> {
  const logicAppPath = path.join(context.workspacePath, context.logicAppName || 'LogicApp');
  const localSettingsPath = path.join(logicAppPath, 'local.settings.json');

  if (logicAppPath) {
    try {
      const connectionsJson = await getConnectionsJson(logicAppPath);
      const localSettings = JSON.parse(fse.readFileSync(localSettingsPath, 'utf8'));
      if (isEmptyString(connectionsJson)) {
        return;
      }
      const connectionsData = JSON.parse(connectionsJson);

      const connectionsValues = await extractConnectionDetails(connectionsData);
      const connectionDetail = connectionsValues[0];

      context.telemetry.properties.addedConnectionDetails = `Extracted the following settings: ${connectionDetail}`;
      const newValues = {
        ...connectionDetail,
        ...localSettings.Values,
      };
      const settings = {
        ...localSettings,
        Values: newValues,
      };

      return settings;
    } catch (error) {
      context.telemetry.properties.error = error.message;
      console.error('Error encountered while extracting connection details:', error);
    }
  }
}

export async function getParametersArtifactData(projectRoot: string): Promise<string> {
  const connectionFilePath: string = path.join(projectRoot, parametersFileName);
  if (await fse.existsSync(connectionFilePath)) {
    const data: string = (await fse.readFileSync(connectionFilePath, 'utf-8')).toString();
    if (/[^\s]/.test(data)) {
      return data;
    }
  }

  return '';
}

export async function changeAuthTypeToRaw(context: IFunctionWizardContext, parameterizeConnectionsSetting: any): Promise<any> {
  const logicAppPath = path.join(context.workspacePath, context.logicAppName || 'LogicApp');
  const connectionsPath = path.join(logicAppPath, 'connections.json');
  const parametersPath = path.join(logicAppPath, 'parameters.json');
  let connectionsData: ConnectionsData = {};
  let parametersJson: ParametersData = {};

  if (logicAppPath) {
    try {
      const connectionsJson = await getConnectionsJson(logicAppPath);
      if (isEmptyString(connectionsJson)) {
        return;
      }
      connectionsData = JSON.parse(connectionsJson);
      parametersJson = await getParametersJson(logicAppPath);
      if (parameterizeConnectionsSetting) {
        for (const referenceKey of Object.keys(connectionsData.managedApiConnections)) {
          parametersJson[`${referenceKey}-Authentication`].value = {
            type: 'Raw',
            scheme: 'Key',
            parameter: `@appsetting('${referenceKey}-connectionKey')`,
          };
          context.telemetry.properties.convertParamToRaw = `Converted ${referenceKey}-Authentication parameter to Raw`;
        }
      } else {
        for (const referenceKey of Object.keys(connectionsData.managedApiConnections)) {
          const authentication: string | any = connectionsData.managedApiConnections[referenceKey].authentication;
          if (typeof authentication === 'string') {
            if (authentication.includes('@parameters(') || authentication.includes('@{parameters(')) {
              parametersJson[`${referenceKey}-Authentication`].value = {
                type: 'Raw',
                scheme: 'Key',
                parameter: `@appsetting('${referenceKey}-connectionKey')`,
              };
              context.telemetry.properties.convertParamToRaw = `Converted ${referenceKey}-Authentication parameter to Raw`;
            }
          } else {
            connectionsData.managedApiConnections[referenceKey].authentication = {
              type: 'Raw',
              scheme: 'Key',
              parameter: `@appsetting('${referenceKey}-connectionKey')`,
            };
            context.telemetry.properties.convertAuthInConnectionToRaw = `Converted ${referenceKey} connection authentication to Raw`;
          }
        }
      }
    } catch (error) {
      context.telemetry.properties.error = error.message;
      console.error(error);
    }
    await writeFormattedJson(connectionsPath, connectionsData);
    if (Object.keys(parametersJson).length) {
      await writeFormattedJson(parametersPath, parametersJson);
    }
  }
}

export async function updateConnectionKeys(context: IFunctionWizardContext): Promise<void> {
  let azureDetails: AzureConnectorDetails;
  const logicAppPath = path.join(context.workspacePath, context.logicAppName || 'LogicApp');

  if (logicAppPath) {
    azureDetails = await getAzureConnectorDetailsForLocalProject(context, logicAppPath);
    try {
      const connectionsJson = await getConnectionsJson(logicAppPath);
      if (isEmptyString(connectionsJson)) {
        ext.outputChannel.appendLog(localize('noConnectionKeysFound', 'No connection keys found for validation'));
        return;
      }
      const parametersData = getParametersJson(logicAppPath);
      const connectionsData: ConnectionsData = JSON.parse(connectionsJson);

      if (connectionsData.managedApiConnections && Object.keys(connectionsData.managedApiConnections).length) {
        const connectionsAndSettingsToUpdate = await getConnectionsAndSettingsToUpdate(
          context,
          logicAppPath,
          connectionsData.managedApiConnections,
          azureDetails.tenantId,
          azureDetails.workflowManagementBaseUrl,
          parametersData
        );

        await saveConnectionReferences(context, logicAppPath, connectionsAndSettingsToUpdate);
      }
    } catch (error) {
      const errorMessage = localize(
        'errorVerifyingConnectionKeys',
        'Error encountered while verifying existing managed API connections: {0}',
        error.message ?? error
      );
      ext.outputChannel.appendLog(errorMessage);
      context.telemetry.properties.error = errorMessage;
      throw new Error(errorMessage);
    }
  }
}

export async function parameterizeConnectionsDuringImport(
  context: IFunctionWizardContext,
  localSettingsValues: Record<string, string>
): Promise<void> {
  const logicAppPath = path.join(context.workspacePath, context.logicAppName || 'LogicApp');
  const parametersFilePath = path.join(logicAppPath, parametersFileName);
  const parametersFileExists = fse.existsSync(parametersFilePath);

  if (logicAppPath) {
    try {
      const connectionsJson = await getConnectionsJson(logicAppPath);
      if (isEmptyString(connectionsJson)) {
        return;
      }
      const connectionsData = JSON.parse(connectionsJson);
      const parametersJson = await getParametersJson(logicAppPath);

      if (areAllConnectionsParameterized(connectionsData)) {
        window.showInformationMessage(localize('connectionsAlreadyParameterized', 'Connections are already parameterized.'));
        return;
      }

      Object.keys(connectionsData).forEach((connectionType) => {
        if (connectionType !== 'serviceProviderConnections') {
          const connectionTypeJson = connectionsData[connectionType];
          Object.keys(connectionTypeJson).forEach((connectionKey) => {
            connectionTypeJson[connectionKey] = parameterizeConnection(
              connectionTypeJson[connectionKey],
              connectionKey,
              parametersJson,
              localSettingsValues
            );

            context.telemetry.properties.parameterizedConnections = `Parameterized ${connectionKey} connection.`;
          });
        }
      });

      if (parametersJson && Object.keys(parametersJson).length) {
        await writeFormattedJson(parametersFilePath, parametersJson);
        if (!parametersFileExists && (await isCSharpProject(context, logicAppPath))) {
          await addNewFileInCSharpProject(context, parametersFileName, logicAppPath);
        }
      } else if (parametersFileExists) {
        await writeFormattedJson(parametersFilePath, parametersJson);
      }

      await saveConnectionReferences(context, logicAppPath, { connections: connectionsData, settings: localSettingsValues });
    } catch (error) {
      const errorMessage = localize(
        'errorParameterizeConnections',
        'Error encountered while parameterizing existing connections: {0}',
        error.message ?? error
      );
      ext.outputChannel.appendLog(errorMessage);
      context.telemetry.properties.error = errorMessage;
      throw new Error(errorMessage);
    }
  }
}

export async function cleanLocalSettings(context: IFunctionWizardContext): Promise<void> {
  const logicAppPath = path.join(context.workspacePath, context.logicAppName || 'LogicApp');
  const localSettingsPath = path.join(logicAppPath, 'local.settings.json');
  const localSettings = JSON.parse(fse.readFileSync(localSettingsPath, 'utf8'));

  if (localSettings.Values) {
    Object.keys(localSettings.Values).forEach((key) => {
      if (key.startsWith('WEBSITE_') || key === 'ScmType' || key.startsWith('FUNCTIONS_RUNTIME')) {
        delete localSettings.Values[key];
        context.telemetry.properties.removedSetting = `Removing ${key} from local settings`;
      } else if (key === azureWebJobsStorageKey) {
        localSettings.Values[azureWebJobsStorageKey] = 'UseDevelopmentStorage=true';
        context.telemetry.properties.removedSetting = 'Changed AzureWebJobsStorage to UseDevelopmentStorage=true';
      }
    });

    await writeFormattedJson(localSettingsPath, localSettings);
  }
}

export function mergeAppSettings(targetSettings: Record<string, any>, sourceSettings: Record<string, any>): Record<string, any> {
  const newValues = Object.assign({}, targetSettings.Values, sourceSettings.Values);
  return { IsEncrypted: targetSettings.IsEncrypted, Values: newValues };
}

export async function unzipLogicAppPackageIntoWorkspace(context: IFunctionWizardContext): Promise<void> {
  try {
    const data: Buffer | Buffer[] = fse.readFileSync(context.packagePath);
    await unzipLogicAppArtifacts(data, context.projectPath);

    const projectFiles = fse.readdirSync(context.projectPath);
    const filesToExclude = [];
    const excludedFiles = ['.vscode', 'obj', 'bin', 'local.settings.json', 'host.json', '.funcignore'];
    const excludedExt = ['.csproj'];

    projectFiles.forEach((fileName) => {
      if (excludedExt.includes(path.extname(fileName))) {
        filesToExclude.push(path.join(context.projectPath, fileName));
      }
    });

    excludedFiles.forEach((excludedFile) => {
      if (fse.existsSync(path.join(context.projectPath, excludedFile))) {
        filesToExclude.push(path.join(context.projectPath, excludedFile));
      }
    });

    filesToExclude.forEach((path) => {
      fse.removeSync(path);
      context.telemetry.properties.excludedFile = `Excluded ${path.basename} from package`;
    });

    // Create README.md file
    const readMePath = path.join(__dirname, 'assets', 'readmes', 'importReadMe.md');
    const readMeContent = fse.readFileSync(readMePath, 'utf8');
    fse.writeFileSync(path.join(context.projectPath, 'README.md'), readMeContent);
  } catch (error) {
    context.telemetry.properties.error = error.message;
    console.error(`Failed to extract contents of package to ${context.projectPath}`, error);
  }
}

export async function logicAppPackageProcessing(context: IFunctionWizardContext): Promise<void> {
  const localSettingsPath = path.join(context.projectPath, 'local.settings.json');
  const parameterizeConnectionsSetting = getGlobalSetting(parameterizeConnectionsInProjectLoadSetting);

  let appSettings: ILocalSettingsJson = {};
  let zipSettings: ILocalSettingsJson = {};
  let connectionsData: any = {};

  try {
    const connectionsString = await getConnectionsJson(context.projectPath);

    // merge the app settings from local.settings.json and the settings from the zip file
    appSettings = await getLocalSettingsJson(context, localSettingsPath, false);
    const zipEntries = await getPackageEntries(context.packagePath);
    const zipSettingsBuffer = zipEntries.find((entry) => entry.entryName === 'local.settings.json');
    if (zipSettingsBuffer) {
      context.telemetry.properties.localSettingsInZip = 'Local settings found in the zip file';
      zipSettings = JSON.parse(zipSettingsBuffer.getData().toString('utf8'));
      await writeFormattedJson(localSettingsPath, mergeAppSettings(appSettings, zipSettings));
    }

    if (isEmptyString(connectionsString)) {
      context.telemetry.properties.noConnectionsInZip = 'No connections found in the zip file';
      return;
    }

    connectionsData = JSON.parse(connectionsString);
    if (Object.keys(connectionsData).length && connectionsData.managedApiConnections) {
      /** Extract details from connections and add to local.settings.json
       * independent of the parameterizeConnectionsInProject setting */
      appSettings = await getLocalSettingsJson(context, localSettingsPath, false);
      await writeFormattedJson(localSettingsPath, extend(appSettings, await extractConnectionSettings(context)));

      if (parameterizeConnectionsSetting) {
        await parameterizeConnectionsDuringImport(context as IFunctionWizardContext, appSettings.Values);
      }

      await changeAuthTypeToRaw(context, parameterizeConnectionsSetting);
      await updateConnectionKeys(context);
      await cleanLocalSettings(context);
    }

    // OpenFolder will restart the extension host so we will cache README to open on next activation
    const readMePath = path.join(context.projectPath, 'README.md');
    const postExtractCache: ICachedTextDocument = { projectPath: context.projectPath, textDocumentPath: readMePath };
    ext.context.globalState.update(cacheKey, postExtractCache);
    // Delete cached information if the extension host was not restarted after 5 seconds
    setTimeout(() => {
      ext.context.globalState.update(cacheKey, undefined);
    }, 5 * 1000);
    runPostExtractSteps(postExtractCache);
  } catch (error) {
    context.telemetry.properties.error = error.message;
  }
}

export async function getPackageEntries(zipFilePath: string) {
  const zip = new AdmZip(zipFilePath);
  return zip.getEntries();
}

export function runPostExtractStepsFromCache(): void {
  const cachedDocument: ICachedTextDocument | undefined = ext.context.globalState.get(cacheKey);
  if (cachedDocument) {
    try {
      runPostExtractSteps(cachedDocument);
    } finally {
      ext.context.globalState.update(cacheKey, undefined);
    }
  }
}

function runPostExtractSteps(cache: ICachedTextDocument): void {
  callWithTelemetryAndErrorHandling('postExtractPackage', async (context: IActionContext) => {
    context.telemetry.suppressIfSuccessful = true;

    if (getContainingWorkspace(cache.projectPath)) {
      if (await fse.pathExists(cache.textDocumentPath)) {
        window.showTextDocument(await workspace.openTextDocument(Uri.file(cache.textDocumentPath)));
      }
    }
    context.telemetry.properties.finishedImportingProject = 'Finished importing project';
    window.showInformationMessage(localize('finishedImporting', 'Finished importing project.'));
  });
}
