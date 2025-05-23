/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isEmptyString } from '@microsoft/logic-apps-shared';
import { AzureWizardExecuteStep, DialogResponses } from '@microsoft/vscode-azext-utils';
import type { ConnectionsData } from '@microsoft/vscode-extension-logic-apps';
import { getBaseGraphApi, OpenBehavior } from '@microsoft/vscode-extension-logic-apps';
import { getConnectionsJson } from '../../../../utils/codeless/connection';
import { areAllConnectionsParameterized } from '../../../../utils/codeless/parameterizer';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { ext } from '../../../../../extensionVariables';
import { localize } from '../../../../../localize';
import { parameterizeConnections } from '../../../parameterizeConnections';
import { FileManagement } from '../../iacGestureHelperFunctions';
import { deploymentDirectory, managementApiPrefix, workflowFileName } from '../../../../../constants';
import { unzipLogicAppArtifacts } from '../../../../utils/taskUtils';
import { startDesignTimeApi } from '../../../../utils/codeless/startDesignTimeApi';
import { getAuthorizationToken, getCloudHost } from '../../../../utils/codeless/getAuthorizationToken';
import type { IAzureDeploymentScriptsContext } from '../../generateDeploymentScripts';

export class GenerateADODeploymentScriptsStep extends AzureWizardExecuteStep<IAzureDeploymentScriptsContext> {
  public priority = 250;

  /**
   * Executes the step to generate deployment scripts for Azure DevOps Pipeline.
   * @param {IAzureDeploymentScriptsContext} context - The Azure deployment scripts context.
   * @returns {Promise<void>} - A Promise that resolves when the scripts are generated.
   */
  public async execute(context: IAzureDeploymentScriptsContext): Promise<void> {
    const deploymentFolderPath = path.join(context.customWorkspaceFolderPath, deploymentDirectory);
    if (!fs.existsSync(deploymentFolderPath)) {
      fs.mkdirSync(deploymentFolderPath);
    }

    context.deploymentFolderPath = deploymentFolderPath;
    context.workspacePath = (context.workspaceFolder && context.workspaceFolder.uri.fsPath) || context.customWorkspaceFolderPath;
    if (context.workspaceFolder) {
      context.openBehavior = OpenBehavior.alreadyOpen;
    }

    const connectionsJson = await getConnectionsJson(context.projectPath);
    const connectionsData: ConnectionsData = isEmptyString(connectionsJson) ? {} : JSON.parse(connectionsJson);
    const isParameterized = await areAllConnectionsParameterized(connectionsData);
    const workflowFiles = GenerateADODeploymentScriptsStep.getWorkflowFilePaths(context.projectPath);

    if (!isParameterized) {
      const message = localize(
        'parameterizeInDeploymentScripts',
        'Allow parameterization for connections? Declining cancels generation for deployment scripts.'
      );
      const shouldParameterizeConnections = await vscode.window.showInformationMessage(
        message,
        { modal: true },
        DialogResponses.yes,
        DialogResponses.no
      );
      if (shouldParameterizeConnections === DialogResponses.yes) {
        await parameterizeConnections(context);
        context.telemetry.properties.parameterizeConnectionsInDeploymentScripts = 'true';
      } else {
        context.telemetry.properties.parameterizeConnectionsInDeploymentScripts = 'false';
        ext.outputChannel.appendLog(localize('exitScriptGen', 'Exiting script generation...'));
        return;
      }
    }

    await GenerateADODeploymentScriptsStep.callConsumptionApi(context);
    const standardArtifactsContent = await GenerateADODeploymentScriptsStep.callStandardApi(context);
    await GenerateADODeploymentScriptsStep.handleApiResponse(standardArtifactsContent, context.deploymentFolderPath);

    const localizedLogMessage = localize(
      'scriptGenSuccess',
      'Deployment script generation completed successfully. The scripts were added at "{0}". Warning: One or more workflows in your logic app may contain user-based authentication for managed connectors. You are required to manually authenticate the connection from the Azure portal after the resource is deployed by the DevOps pipeline.',
      context.deploymentFolderPath
    );
    ext.outputChannel.appendLog(localizedLogMessage);

    if (context.isValidWorkspace) {
      FileManagement.addFolderToWorkspace(context.deploymentFolderPath);
    } else {
      FileManagement.convertToValidWorkspace(context.deploymentFolderPath);
    }

    const correlationId = uuidv4();
    const currentDateTime = new Date().toISOString();
    workflowFiles.forEach((filePath) =>
      GenerateADODeploymentScriptsStep.updateMetadata(filePath, context.projectPath, correlationId, currentDateTime)
    );
  }

  /**
   * Determines whether this step should be executed based on the user's input.
   * @returns {boolean} - A boolean value indicating whether this step should be executed.
   */
  public shouldExecute(): boolean {
    return true;
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
   * Calls the IaC API to obtain the deployment standard artifacts.
   * @param {IAzureDeploymentScriptsContext} context - The Azure deployment scripts context.
   * @returns {Promise<Buffer>} - A Promise that resolves to a Buffer containing the API response.
   */
  private static async callStandardApi(context: IAzureDeploymentScriptsContext): Promise<Buffer> {
    try {
      return await GenerateADODeploymentScriptsStep.callStandardResourcesApi(
        context.subscriptionId,
        context.resourceGroup.name,
        context.storageAccountName,
        context.resourceGroup.location,
        context.logicAppName,
        context.appServicePlan,
        context.projectPath
      );
    } catch (error) {
      throw new Error(localize('Error calling Standard Resources API', error));
    }
  }

  /**
   * Calls the IaC API to obtain the deployment consumption artifacts for each managed connection.
   * @param context - The Azure deployment scripts context.
   * @returns A Promise that resolves when all artifacts are processed.
   */
  private static async callConsumptionApi(context: IAzureDeploymentScriptsContext): Promise<void> {
    ext.outputChannel.appendLog(localize('initCallConsumption', 'Initiating call to Consumption API for deployment artifacts.'));

    ext.outputChannel.appendLog(
      localize(
        'operationalContext',
        'Operational context: Tenant ID: {0}, Subscription ID: {1}, Resource Group: {2}, Logic App: {3}',
        context.tenantId,
        context.subscriptionId,
        context.resourceGroup.name,
        context.logicAppName
      )
    );

    // Retrieve managed connections
    ext.outputChannel.appendLog(localize('fetchingManagedConnections', 'Fetching managed connections...'));
    const managedConnections: { refEndPoint: string; originalKey: string }[] = await GenerateADODeploymentScriptsStep.getConnectionNames(
      context.projectPath
    );

    for (const connectionObj of managedConnections) {
      try {
        ext.outputChannel.appendLog(
          localize(
            'startRetrieveConnectionDeploymentArtifacts',
            'Retrieving deployment artifacts for managed connection "{0}".',
            connectionObj.originalKey
          )
        );

        // The line below has been modified to pass both originalKey and refEndPoint
        const bufferData = await GenerateADODeploymentScriptsStep.callManagedConnectionsApi(
          context.tenantId,
          context.subscriptionId,
          context.resourceGroup.name,
          context.logicAppName,
          connectionObj.originalKey,
          connectionObj.refEndPoint
        );
        if (!bufferData) {
          vscode.window.showErrorMessage(
            localize(
              'failedRetrieveConnectionDeploymentArtifacts',
              'Failed to retrieve deployment artifacts for managed connection "{0}".',
              connectionObj.originalKey
            )
          );
          continue;
        }

        // Specify the unzip path and handle the API response
        const unzipPath = path.join(context.deploymentFolderPath);
        ext.outputChannel.appendLog(
          localize(
            'startUnzipConnectionDeploymentArtifacts',
            'Unzipping artifacts for managed connection "{0}" at "{1}".',
            connectionObj.originalKey,
            unzipPath
          )
        );
        await GenerateADODeploymentScriptsStep.handleApiResponse(bufferData, unzipPath);
      } catch (error) {
        const errorMessage = localize(
          'failedRetrieveConnectionDeploymentArtifacts',
          'Failed to retrieve deployment artifacts for managed connection "{0}". Error: "{1}".',
          connectionObj.originalKey,
          JSON.stringify(error.message)
        );
        ext.outputChannel.appendLog(errorMessage);
        throw new Error(errorMessage);
      }
    }
  }

  /**
   * Handles the API response and exports the artifacts.
   * @param zipContent - Buffer containing the API response.
   * @param targetDirectory - String indicating the directory to export to.
   * @returns {Promise<void>} - A promise that resolves when the artifacts are unzipped.
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
   * @param tenantId - The Azure tenant ID.
   * @param subscriptionId - The Azure subscription ID.
   * @param resourceGroup - The Azure resource group name.
   * @param logicAppName - The name of the Logic App.
   * @param managedConnection - The reference name for the managed connection template generation.
   * @param connectionId - The parameter for connection ID endpoint deployed in portal.
   * @returns A Buffer containing the API response.
   */
  private static async callManagedConnectionsApi(
    tenantId: string,
    subscriptionId: string,
    resourceGroup: string,
    logicAppName: string,
    connectionName: string,
    connectionId: string
  ): Promise<Buffer> {
    try {
      const apiVersion = '2018-07-01-preview';
      const accessToken = await getAuthorizationToken(tenantId);
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
