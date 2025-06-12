/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isEmptyString } from '@microsoft/logic-apps-shared';
import { AzureWizardExecuteStep, DialogResponses, UserCancelledError } from '@microsoft/vscode-azext-utils';
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
    context.telemetry.properties.lastStep = 'GenerateADODeploymentScriptsStep';

    const deploymentFolderPath = path.join(context.customWorkspaceFolderPath, deploymentDirectory);
    if (!fs.existsSync(deploymentFolderPath)) {
      fs.mkdirSync(deploymentFolderPath);
    }

    context.deploymentFolderPath = deploymentFolderPath;
    context.workspacePath = (context.workspaceFolder && context.workspaceFolder.uri.fsPath) || context.customWorkspaceFolderPath;
    if (context.workspaceFolder) {
      context.openBehavior = OpenBehavior.alreadyOpen;
    }

    context.telemetry.properties.lastStep = 'getConnectionsJson';
    const connectionsJson = await getConnectionsJson(context.projectPath);
    const connectionsData: ConnectionsData = isEmptyString(connectionsJson) ? {} : JSON.parse(connectionsJson);

    context.telemetry.properties.lastStep = 'areAllConnectionsParameterized';
    const isParameterized = await areAllConnectionsParameterized(connectionsData);

    context.telemetry.properties.lastStep = 'getWorkflowFilePaths';
    const workflowFiles = GenerateADODeploymentScriptsStep.getWorkflowFilePaths(context.projectPath);

    if (!isParameterized) {
      context.telemetry.properties.lastStep = 'parameterizeConnectionsPrompt';
      const parameterizeConnectionsPrompt = localize(
        'parameterizeInDeploymentScripts',
        'Allow parameterization for connections? Declining cancels generation for deployment scripts.'
      );
      const shouldParameterizeConnections = await vscode.window.showInformationMessage(
        parameterizeConnectionsPrompt,
        { modal: true },
        DialogResponses.yes,
        DialogResponses.no
      );
      if (shouldParameterizeConnections === DialogResponses.yes) {
        context.telemetry.properties.lastStep = 'parameterizeConnections';
        await parameterizeConnections(context);
        context.telemetry.properties.parameterizeConnectionsInDeploymentScripts = 'true';
      } else {
        context.telemetry.properties.parameterizeConnectionsInDeploymentScripts = 'false';
        throw new UserCancelledError('User declined to parameterize connections in deployment scripts.');
      }
    }

    context.telemetry.properties.lastStep = 'generateManagedConnectionsDeploymentArtifacts';
    await GenerateADODeploymentScriptsStep.generateManagedConnectionsDeploymentArtifacts(context);

    context.telemetry.properties.lastStep = 'getLogicAppDeploymentArtifactsBuffer';
    const logicAppArtifactsBuffer = await GenerateADODeploymentScriptsStep.getLogicAppDeploymentArtifactsBuffer(context);
    if (!logicAppArtifactsBuffer) {
      throw new Error('Failed getting Logic App deployment artifacts. No content received from the standard resources API.');
    }
    await unzipLogicAppArtifacts(logicAppArtifactsBuffer, context.deploymentFolderPath);
    ext.outputChannel.appendLog(localize('logicAppDeploymentArtifactsUnzipped', 'Logic app deployment artifacts successfully unzipped.'));

    const localizedLogMessage = localize(
      'scriptGenSuccess',
      'Deployment script generation completed successfully. The scripts were added at "{0}". Warning: One or more workflows in your logic app may contain user-based authentication for managed connectors. You are required to manually authenticate the connection from the Azure portal after the resource is deployed by the DevOps pipeline.',
      context.deploymentFolderPath
    );
    ext.outputChannel.appendLog(localizedLogMessage);

    if (context.isValidWorkspace) {
      context.telemetry.properties.lastStep = 'addFolderToWorkspace';
      FileManagement.addFolderToWorkspace(context.deploymentFolderPath);
    } else {
      context.telemetry.properties.lastStep = 'convertToValidWorkspace';
      FileManagement.convertToValidWorkspace(context.deploymentFolderPath);
    }

    const correlationId = uuidv4();
    const currentDateTime = new Date().toISOString();

    context.telemetry.properties.lastStep = 'updateMetadata';
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
   * Calls the IaC API to obtain the deployment consumption artifacts for each managed connection.
   * @param {IAzureDeploymentScriptsContext} context - The Azure deployment scripts context.
   * @returns {Promise<void>} - A Promise that resolves when all artifacts are processed.
   */
  private static async generateManagedConnectionsDeploymentArtifacts(context: IAzureDeploymentScriptsContext): Promise<void> {
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

    ext.outputChannel.appendLog(localize('fetchingManagedConnections', 'Fetching managed connections...'));
    const managedConnections: { refEndPoint: string; originalKey: string }[] = await GenerateADODeploymentScriptsStep.getConnectionNames(
      context.projectPath
    );

    for (const connectionObj of managedConnections) {
      ext.outputChannel.appendLog(
        localize(
          'startRetrieveConnectionDeploymentArtifacts',
          'Retrieving deployment artifacts for managed connection "{0}".',
          connectionObj.originalKey
        )
      );

      const managedConnectionArtifactsBuffer = await GenerateADODeploymentScriptsStep.getManagedConnectionDeploymentArtifactsBuffer(
        context.tenantId,
        context.subscriptionId,
        context.resourceGroup.name,
        context.logicAppName,
        connectionObj.originalKey,
        connectionObj.refEndPoint
      );
      if (!managedConnectionArtifactsBuffer) {
        vscode.window.showErrorMessage(
          localize(
            'failedRetrieveConnectionDeploymentArtifacts',
            'Failed to retrieve deployment artifacts for managed connection "{0}".',
            connectionObj.originalKey
          )
        );
        continue;
      }

      ext.outputChannel.appendLog(
        localize(
          'startUnzipConnectionDeploymentArtifacts',
          'Unzipping artifacts for managed connection "{0}" at "{1}".',
          connectionObj.originalKey,
          context.deploymentFolderPath
        )
      );

      if (!managedConnectionArtifactsBuffer) {
        throw new Error('Failed getting Logic App deployment artifacts. No content received from the standard resources API.');
      }
      await unzipLogicAppArtifacts(managedConnectionArtifactsBuffer, context.deploymentFolderPath);
    }
  }

  /**
   * Calls the consumption Managed Connections API to retrieve deployment artifacts for a given Logic App.
   * @param tenantId - The Azure tenant ID.
   * @param subscriptionId - The Azure subscription ID.
   * @param resourceGroup - The Azure resource group name.
   * @param logicAppName - The name of the Logic App.
   * @param managedConnection - The reference name for the managed connection template generation.
   * @param connectionId - The parameter for connection ID endpoint deployed in portal.
   * @returns A Buffer containing the API response.
   */
  private static async getManagedConnectionDeploymentArtifactsBuffer(
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

      const apiUrl = `${baseGraphUri}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/connections/${connectionId}/generateDeploymentArtifacts?api-version=${apiVersion}`;
      const requestBody = {
        TargetLogicAppName: logicAppName,
        ConnectionReferenceName: connectionName,
      };

      const response = await axios.post(apiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${accessToken}`,
        },
        responseType: 'arraybuffer',
      });

      const buffer = Buffer.from(response.data, 'binary');
      ext.outputChannel.appendLog(
        localize('successfulManagedConnection', `Successfully retrieved deployment artifacts for managed connection "${connectionName}".`)
      );
      return buffer;
    } catch (error) {
      const responseData = JSON.parse(new TextDecoder().decode(error.response.data));
      const { message = '', code = '' } = responseData?.error ?? {};
      throw new Error(`Error getting deployment artifacts for managed connection "${connectionName}": ${code} - ${message}`);
    }
  }

  /**
   * Gets deployment artifacts for the Logic App using standard resources API.
   * @param {IAzureDeploymentScriptsContext} context - The Azure deployment scripts context.
   * @returns {Promise<Buffer>} - A Promise that resolves to a Buffer containing the Logic App deployment artifacts.
   */
  private static async getLogicAppDeploymentArtifactsBuffer(context: IAzureDeploymentScriptsContext): Promise<Buffer> {
    try {
      ext.outputChannel.appendLog(localize('initApiWorkflowDesignerPort', 'Initiating API connection through workflow designer port...'));
      await startDesignTimeApi(context.projectPath);
      if (!ext.designTimeInstances.has(context.projectPath)) {
        throw new Error('Design time API is undefined. Please retry once Azure Functions Core Tools has started.');
      }
      const designTimeInst = ext.designTimeInstances.get(context.projectPath);
      if (designTimeInst.port === undefined) {
        throw new Error('Design time port is undefined. Please retry once Azure Functions Core Tools has started.');
      }
      const apiUrl = `http://localhost:${designTimeInst.port}${managementApiPrefix}/generateDeploymentArtifacts`;

      ext.outputChannel.appendLog(
        localize(
          'operationalContext',
          `Operational context: Subscription ID: ${context.subscriptionId}, Resource Group: ${context.resourceGroup.name}, Logic App: ${context.logicAppName}`
        )
      );

      const deploymentArtifactsInput = {
        targetSubscriptionName: context.subscriptionId,
        targetResourceGroupName: context.resourceGroup.name,
        targetStorageAccountName: context.storageAccountName,
        targetLocation: context.resourceGroup.location,
        targetLogicAppName: context.logicAppName,
        targetAppServicePlanName: context.appServicePlan,
      };

      const response = await axios.post(apiUrl, deploymentArtifactsInput, {
        headers: {
          Accept: 'application/zip',
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data, 'binary');
    } catch (error) {
      const responseData = JSON.parse(new TextDecoder().decode(error.response.data));
      const { message = '', code = '' } = responseData?.error ?? {};
      throw new Error(`Error getting deployment artifacts for Logic App: ${code} - ${message}`);
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
