/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isEmptyString } from '@microsoft/logic-apps-shared';
import { AzureWizardExecuteStep, DialogResponses, type IActionContext } from '@microsoft/vscode-azext-utils';
import type { ConnectionsData, ILocalSettingsJson, IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { DeploymentScriptType, getBaseGraphApi } from '@microsoft/vscode-extension-logic-apps';
import { getConnectionsJson } from '../../utils/codeless/connection';
import { areAllConnectionsParameterized } from '../../utils/codeless/parameterizer';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { convertToWorkspace } from '../createNewCodeProject/CodeProjectBase/ConvertToWorkspace';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { parameterizeConnections } from '../parameterizeConnections';
import { FileManagement } from './iacGestureHelperFunctions';
import {
  localSettingsFileName,
  managementApiPrefix,
  workflowFileName,
  workflowLocationKey,
  workflowResourceGroupNameKey,
  workflowSubscriptionIdKey,
} from '../../../constants';
import { createAzureWizard, type IAzureScriptWizard } from './azureScriptWizard';
import { unzipLogicAppArtifacts } from '../../utils/taskUtils';
import { startDesignTimeApi } from '../../utils/codeless/startDesignTimeApi';
import { getAuthorizationToken, getCloudHost } from '../../utils/codeless/getAuthorizationToken';
import { getLocalSettingsJson } from '../../utils/appSettings/localSettings';

export class GenerateADODeploymentScriptsStep extends AzureWizardExecuteStep<IProjectWizardContext> {
  public priority = 250;

  /**
   * Executes the step to generate deployment scripts for Azure DevOps Pipeline.
   * @param context The context object for the project wizard.
   * @returns A Promise that resolves when the scripts are generated.
   */
  public async execute(context: IProjectWizardContext): Promise<void> {
    const connectionsJson = await getConnectionsJson(context.projectPath);
    const connectionsData: ConnectionsData = isEmptyString(connectionsJson) ? {} : JSON.parse(connectionsJson);
    const isParameterized = await areAllConnectionsParameterized(connectionsData);
    const workflowFiles = GenerateADODeploymentScriptsStep.getWorkflowFilePaths(context.projectPath);
    if (!(await convertToWorkspace(context))) {
      ext.outputChannel.appendLog(localize('exitScriptGen', 'Exiting script generation...'));
      return;
    }

    if (!isParameterized) {
      const message = localize(
        'parameterizeInDeploymentScripts',
        'Allow parameterization for connections? Declining cancels generation for deployment scripts.'
      );
      const result = await vscode.window.showInformationMessage(message, { modal: true }, DialogResponses.yes, DialogResponses.no);
      if (result === DialogResponses.yes) {
        await parameterizeConnections(context);
        context.telemetry.properties.parameterizeConnectionsInDeploymentScripts = 'true';
      } else {
        context.telemetry.properties.parameterizeConnectionsInDeploymentScripts = 'false';
        ext.outputChannel.appendLog(localize('exitScriptGen', 'Exiting script generation...'));
        return;
      }
    }
    const scriptContext = await GenerateADODeploymentScriptsStep.setupWizardScriptContext(context, context.projectPath);
    const inputs = await GenerateADODeploymentScriptsStep.gatherAndValidateInputs(scriptContext, context.projectPath);
    const sourceControlPath = scriptContext.sourceControlPath;
    await GenerateADODeploymentScriptsStep.callConsumptionApi(scriptContext, inputs);
    const standardArtifactsContent = await GenerateADODeploymentScriptsStep.callStandardApi(inputs, context.projectPath);
    await GenerateADODeploymentScriptsStep.handleApiResponse(standardArtifactsContent, sourceControlPath);

    const deploymentScriptLocation = `workspace/${scriptContext.sourceControlPath}`;
    const localizedLogMessage = localize(
      'scriptGenSuccess',
      'Deployment script generation completed successfully. The scripts are added at location: {0}. Warning: One or more workflows in your logic app may contain user-based authentication for managed connectors. You are required to manually authenticate the connection from the Azure portal after the resource is deployed by the DevOps pipeline.',
      deploymentScriptLocation
    );
    ext.outputChannel.appendLog(localizedLogMessage);

    if (scriptContext.isValidWorkspace) {
      FileManagement.addFolderToWorkspace(sourceControlPath);
    } else {
      FileManagement.convertToValidWorkspace(sourceControlPath);
    }

    const correlationId = uuidv4();
    const currentDateTime = new Date().toISOString();
    workflowFiles.forEach((filePath) =>
      GenerateADODeploymentScriptsStep.updateMetadata(filePath, context.projectPath, correlationId, currentDateTime)
    );
  }

  /**
   * Determines whether this step should be executed based on the user's input.
   * @param context The context object for the project wizard.
   * @returns A boolean value indicating whether this step should be executed.
   */
  public shouldExecute(context: IProjectWizardContext): boolean {
    return context.deploymentScriptType === DeploymentScriptType.azureDevOpsPipeline;
  }

  private static getWorkflowFilePaths(source: string): string[] {
    return fs
      .readdirSync(source)
      .filter((name) => {
        const dirPath = path.join(source, name);
        if (fs.statSync(dirPath).isDirectory()) {
          const files = fs.readdirSync(dirPath);
          return files.length === 1 && files[0] === workflowFileName;
        }
        return false;
      })
      .map((name) => path.join(source, name, workflowFileName));
  }

  private static updateMetadata(filePath: string, projectPath: string, correlationId: string, currentDateTime: string): void {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Normalize the metadata key to lowercase
    const metadataKey = Object.keys(data.definition).find((key) => key.toLowerCase() === 'metadata');
    if (metadataKey && metadataKey !== 'metadata') {
      data.definition.metadata = data.definition[metadataKey];
      delete data.definition[metadataKey];
    }

    const iacMetadata = {
      IaCGenerationDate: currentDateTime,
      IaCWorkflowCorrelationId: correlationId,
      LogicAppsExtensionVersion: ext.extensionVersion,
      LogicAppsPinnedBundle: ext.pinnedBundleVersion.has(projectPath) ? ext.pinnedBundleVersion.get(projectPath) : false,
      LogicAppsCurrentBundleVersion: ext.currentBundleVersion.has(projectPath)
        ? ext.currentBundleVersion.get(projectPath)
        : ext.defaultBundleVersion,
    };

    if (data.definition.metadata) {
      data.definition.metadata.IaCMetadata = {
        ...data.definition.metadata.IaCMetadata,
        ...iacMetadata,
      };
    } else {
      data.definition.metadata = { IaCMetadata: iacMetadata };
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Initializes the wizard script context based on the action context and folder.
   * @param context - IActionContext object providing the action context.
   * @param projectPath - The path to the logic app project root.
   * @returns - Promise<IAzureScriptWizard> with the modified script context.
   */
  private static async setupWizardScriptContext(context: IActionContext, projectPath: string): Promise<IAzureScriptWizard> {
    try {
      const parentDirPath: string = path.normalize(path.dirname(projectPath));
      const scriptContext = context as IAzureScriptWizard;
      scriptContext.folderPath = path.normalize(projectPath);
      scriptContext.customWorkspaceFolderPath = parentDirPath;
      scriptContext.projectPath = projectPath;
      return scriptContext;
    } catch (error) {
      const errorMessage = localize('setupWizardScriptContextError', 'Error in setupWizardScriptContext: {0}', error.message ?? error);
      ext.outputChannel.appendLog(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Calls the iac API to obtain the deployment standard artifacts.
   * @param inputs - Object containing required inputs like subscriptionId, resourceGroup etc.
   * @returns - Promise<Buffer> containing the API response as a buffer.
   */
  private static async callStandardApi(inputs: any, projectPath: string): Promise<Buffer> {
    try {
      const { subscriptionId, resourceGroup, storageAccount, location, logicAppName, appServicePlan } = inputs;
      return await GenerateADODeploymentScriptsStep.callStandardResourcesApi(
        subscriptionId,
        resourceGroup,
        storageAccount,
        location,
        logicAppName,
        appServicePlan,
        projectPath
      );
    } catch (error) {
      throw new Error(localize('Error calling Standard Resources API', error));
    }
  }

  /**
   * Calls the iac API to obtain the deployment consumption artifacts for each managed connection.
   * @param scriptContext - The script context containing the source control path.
   * @param inputs - An object containing the subscription ID, resource group, and logic app name.
   * @returns A Promise that resolves when all artifacts are processed.
   */
  private static async callConsumptionApi(scriptContext: IAzureScriptWizard, inputs: any): Promise<void> {
    try {
      ext.outputChannel.appendLog(localize('initCallConsumption', 'Initiating call to Consumption API for deployment artifacts.'));

      const { localSubscriptionId, localResourceGroup, logicAppName } = inputs;
      ext.outputChannel.appendLog(
        localize(
          'operationalContext',
          'Operational context: Subscription ID: {0}, Resource Group: {1}, Logic App: {2}',
          localSubscriptionId,
          localResourceGroup,
          logicAppName
        )
      );

      // Retrieve managed connections
      ext.outputChannel.appendLog(localize('fetchingManagedConnections', 'Fetching list of managed connections...'));
      const managedConnections: { refEndPoint: string; originalKey: string }[] = await GenerateADODeploymentScriptsStep.getConnectionNames(
        scriptContext.folderPath
      );

      for (const connectionObj of managedConnections) {
        try {
          ext.outputChannel.appendLog(
            localize('initiatingApiCallForConnection', 'Initiating API call for managed connection: {0}', connectionObj.originalKey)
          );

          // The line below has been modified to pass both originalKey and refEndPoint
          const bufferData = await GenerateADODeploymentScriptsStep.callManagedConnectionsApi(
            localSubscriptionId,
            localResourceGroup,
            logicAppName,
            connectionObj.originalKey,
            connectionObj.refEndPoint
          );

          if (!bufferData) {
            vscode.window.showErrorMessage(localize('dataRetrievalFailedFor', 'Data retrieval failed for: {0}', connectionObj.originalKey));
            continue;
          }

          // Specify the unzip path and handle the API response
          const unzipPath = path.join(scriptContext.sourceControlPath);
          ext.outputChannel.appendLog(
            localize('attemptingUnzipArtifacts', 'Attempting to unzip artifacts for {0} at {1}', connectionObj.originalKey, unzipPath)
          );
          await GenerateADODeploymentScriptsStep.handleApiResponse(bufferData, unzipPath);
        } catch (error) {
          const errorString = JSON.stringify(error.message);
          ext.outputChannel.appendLog(
            localize(
              'failedApiCallForConnectionWithError',
              'Failed API call for managed connection: {0}. Error: {1}',
              connectionObj.originalKey,
              errorString
            )
          );
          throw new Error(localize('apiCallToConsumptionResourcesFailed', 'API call to Consumption Resources failed: {0}', errorString));
        }
      }
    } catch (error) {
      ext.outputChannel.appendLog(
        localize(
          'failedAllConsumptionCalls',
          'Failed to complete Consumption API calls for all managed connections: {0}',
          error.message ?? error
        )
      );
      throw new Error(localize('errorConsumptionResources', error));
    }
  }

  /**
   * Handles the API response and exports the artifacts.
   * @param zipContent - Buffer containing the API response.
   * @param targetDirectory - String indicating the directory to export to.
   * @param scriptContext - IAzureScriptWizard object for the script context.
   * @returns - Promise<void> indicating success or failure.
   */
  private static async handleApiResponse(zipContent: Buffer | Buffer[], targetDirectory: string): Promise<void> {
    try {
      if (!zipContent) {
        vscode.window.showErrorMessage(localize('invalidApiResponseContent', 'Invalid API response content.'));
        ext.outputChannel.appendLog(localize('invalidApiResponseExiting', 'Invalid API response received. Exiting...'));
        return;
      }
      await unzipLogicAppArtifacts(zipContent, targetDirectory);
      ext.outputChannel.appendLog(localize('artifactsSuccessfullyUnzipped', 'Artifacts successfully unzipped.'));
    } catch (error) {
      const errorMessage = localize('errorHandlingApiResponse', 'Error occurred while handling API response: {0}', error.message ?? error);
      ext.outputChannel.appendLog(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Performs the API call for standard azure resouces
   * @param subscriptionId - Subscription ID for Azure services.
   * @param resourceGroup - Azure resource group name.
   * @param storageAccount - Azure storage account name.
   * @param location - Azure location/region.
   * @param logicAppName - Azure Logic App name.
   * @param appServicePlan - Azure App Service Plan name.
   * @returns - Promise<Buffer> containing the API response.
   */
  private static async callStandardResourcesApi(
    subscriptionId: string,
    resourceGroup: string,
    storageAccount: string,
    location: string,
    logicAppName: string,
    appServicePlan: string,
    projectPath: string
  ): Promise<Buffer> {
    try {
      ext.outputChannel.appendLog(localize('initApiWorkflowDesignerPort', 'Initiating API connection through workflow designer port...'));
      await startDesignTimeApi(projectPath);
      if (!ext.designTimeInstances.has(projectPath)) {
        throw new Error(
          localize('designTimeInstanceNotFound', 'Design time API is undefined. Please retry once Azure Functions Core Tools has started.')
        );
      }
      const designTimeInst = ext.designTimeInstances.get(projectPath);
      if (designTimeInst.port === undefined) {
        throw new Error(
          localize('errorStandardResourcesApi', 'Design time port is undefined. Please retry once Azure Functions Core Tools has started.')
        );
      }
      const apiUrl = `http://localhost:${designTimeInst.port}${managementApiPrefix}/generateDeploymentArtifacts`;
      ext.outputChannel.appendLog(localize('apiUrl', `Calling API URL: ${apiUrl}`));

      // Construct the request body based on the parameters
      const deploymentArtifactsInput = {
        targetSubscriptionName: subscriptionId,
        targetResourceGroupName: resourceGroup,
        targetStorageAccountName: storageAccount,
        targetLocation: location,
        targetLogicAppName: logicAppName,
        targetAppServicePlanName: appServicePlan,
      };

      ext.outputChannel.appendLog(
        localize(
          'operationalContext',
          `Operational context: Subscription ID: ${subscriptionId}, Resource Group: ${resourceGroup}, Logic App: ${logicAppName}`
        )
      );
      ext.outputChannel.appendLog(localize('initiatingStandardResourcesApiCall', 'Initiating Standard Resources API call...'));

      const response = await axios.post(apiUrl, deploymentArtifactsInput, {
        headers: {
          Accept: 'application/zip',
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      });

      ext.outputChannel.appendLog(localize('apiCallSuccessful', 'API call successful, processing response...'));
      return Buffer.from(response.data, 'binary');
    } catch (error) {
      const responseData = JSON.parse(new TextDecoder().decode(error.response.data));
      const { message = '', code = '' } = responseData?.error ?? {};
      ext.outputChannel.appendLog(
        localize('failedStandardResourcesApiCall', `Failed to call Standard Resources API: ${code} - ${message}`)
      );
      throw new Error(localize('errorStandardResourcesApi', message));
    }
  }

  /**
   * Calls the Managed Connections API to retrieve deployment artifacts for a given Logic App.
   * @param subscriptionId - The Azure subscription ID.
   * @param resourceGroup - The Azure resource group name.
   * @param logicAppName - The name of the Logic App.
   * @param managedConnection - The reference name for the managed connection template generation.
   * @param connectionId - The parameter for connection ID endpoint deployed in portal.
   * @returns A Buffer containing the API response.
   */
  private static async callManagedConnectionsApi(
    subscriptionId: string,
    resourceGroup: string,
    logicAppName: string,
    connectionName: string,
    connectionId: string
  ): Promise<Buffer> {
    try {
      const apiVersion = '2018-07-01-preview';
      const accessToken = await getAuthorizationToken();
      const cloudHost = await getCloudHost();
      const baseGraphUri = getBaseGraphApi(cloudHost);

      // Build the URL for the API call
      const apiUrl = `${baseGraphUri}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/connections/${connectionId}/generateDeploymentArtifacts?api-version=${apiVersion}`;
      // Define the request body
      const requestBody = {
        TargetLogicAppName: logicAppName,
        ConnectionReferenceName: connectionName,
      };

      // Execute the API call
      const response = await axios.post(apiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${accessToken}`,
        },
        responseType: 'arraybuffer',
      });

      // Convert and log the successful response
      const buffer = Buffer.from(response.data, 'binary');
      ext.outputChannel.appendLog(
        localize('successfulManagedConnection', `Successfully retrieved deployment artifacts for connection: ${connectionName}.`)
      );
      return buffer;
    } catch (error) {
      const responseData = JSON.parse(new TextDecoder().decode(error.response.data));
      const { message = '', code = '' } = responseData?.error ?? {};
      ext.outputChannel.appendLog(localize('errorManagedConnectionsApi', `Failed to call Managed Connections API: ${code} - ${message}`));
      throw new Error(localize('errorManagedConnectionsApi', message));
    }
  }

  /**
   * Gathers and validates the input required for API calls.
   * @param scriptContext - IAzureScriptWizard object for the script context.
   * @param projectPath - The path to the logic app project root.
   * @returns - Object containing validated inputs.
   */
  private static async gatherAndValidateInputs(scriptContext: IAzureScriptWizard, projectPath: string) {
    let localSettings: ILocalSettingsJson;

    try {
      localSettings = await GenerateADODeploymentScriptsStep.getLocalSettings(scriptContext, projectPath);
    } catch (error) {
      const errorMessage = localize('errorFetchLocalSettings', 'Error fetching local settings: {0}', error.message ?? error);
      ext.outputChannel.appendLog(errorMessage);
      throw new Error(errorMessage);
    }

    const {
      [workflowSubscriptionIdKey]: defaultSubscriptionId,
      [workflowResourceGroupNameKey]: defaultResourceGroup,
      [workflowLocationKey]: defaultLocation,
    } = localSettings.Values;

    ext.outputChannel.appendLog(
      localize(
        'extractDefaultValues',
        `Extracted default values: ${JSON.stringify({ defaultSubscriptionId, defaultResourceGroup, defaultLocation })}`
      )
    );

    const {
      subscriptionId = defaultSubscriptionId,
      resourceGroup = { name: defaultResourceGroup, location: defaultLocation },
      logicAppName = '',
      storageAccountName = '',
      appServicePlan = '',
    } = scriptContext;

    ext.outputChannel.appendLog(
      localize(
        'contextValues',
        `Context values: ${JSON.stringify({ subscriptionId, resourceGroup, logicAppName, storageAccountName, appServicePlan })}`
      )
    );

    try {
      ext.outputChannel.appendLog(localize('AttemptingExecuteAzureWizardSuccess', 'Launching Azure Wizard...'));
      const wizard = createAzureWizard(scriptContext);
      await wizard.prompt();
      await wizard.execute();
      ext.outputChannel.appendLog(localize('executeAzureWizardSuccess', 'Azure Wizard executed successfully.'));
    } catch (error) {
      const errorMessage = localize('executeAzureWizardError', 'Error executing Azure Wizard: {0}', error.message ?? error);
      ext.outputChannel.appendLog(errorMessage);
      throw new Error(errorMessage);
    }

    return {
      subscriptionId: scriptContext.subscriptionId || subscriptionId,
      resourceGroup: scriptContext.resourceGroup.name || resourceGroup.name,
      logicAppName: scriptContext.logicAppName || logicAppName,
      storageAccount: scriptContext.storageAccountName || storageAccountName,
      location: scriptContext.resourceGroup.location || resourceGroup.location,
      appServicePlan: scriptContext.appServicePlan || appServicePlan,
      localSubscriptionId: defaultSubscriptionId,
      localResourceGroup: defaultResourceGroup,
    };
  }

  /**
   * Reads local settings from a JSON file.
   * @param context - IAzureScriptWizard object for the script context.
   * @param projectPath - The path to the logic app project root.
   * @returns - Promise<ILocalSettingsJson> containing local settings.
   */
  private static async getLocalSettings(context: IAzureScriptWizard, projectPath: string): Promise<ILocalSettingsJson> {
    const localSettingsFilePath = path.join(projectPath, localSettingsFileName);
    return await getLocalSettingsJson(context, localSettingsFilePath);
  }

  /**
   * Retrieves the ref names s of connections from a connections JSON file.
   * @param projectRoot The root directory of the project.
   * @returns A promise that resolves to an array of objects, each containing a reference name and the last parameter in the connection id.
   */
  private static async getConnectionNames(projectRoot: string): Promise<{ refEndPoint: string; originalKey: string }[]> {
    const data: string = await getConnectionsJson(projectRoot);
    const managedConnections: { refEndPoint: string; originalKey: string }[] = [];

    if (data) {
      const connectionsJson = JSON.parse(data);
      const managedApiConnections = connectionsJson['managedApiConnections'];
      for (const connection in managedApiConnections) {
        if (Object.prototype.hasOwnProperty.call(managedApiConnections, connection)) {
          const idPath = managedApiConnections[connection]['connection']['id'];
          const lastParam = idPath.substring(idPath.lastIndexOf('/') + 1);
          managedConnections.push({ refEndPoint: lastParam, originalKey: connection });
        }
      }
    }
    return managedConnections;
  }
}
