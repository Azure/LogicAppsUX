/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isEmptyString } from '@microsoft/logic-apps-shared';
import { AzureWizardExecuteStep, DialogResponses, UserCancelledError } from '@microsoft/vscode-azext-utils';
import type { ConnectionsData } from '@microsoft/vscode-extension-logic-apps';
import { getBaseGraphApi, OpenBehavior, DeploymentTargetType } from '@microsoft/vscode-extension-logic-apps';
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
   * Determines whether this step should be executed based on the user's input.
   * @returns {boolean} - A boolean value indicating whether this step should be executed.
   */
  public shouldExecute(): boolean {
    return true;
  }

  /**
   * Executes the step to generate deployment scripts for Azure DevOps Pipeline.
   * @param {IAzureDeploymentScriptsContext} context - The Azure deployment scripts context.
   * @returns {Promise<void>} - A Promise that resolves when the scripts are generated.
   */
  public async execute(context: IAzureDeploymentScriptsContext): Promise<void> {
    context.telemetry.properties.lastStep = 'GenerateADODeploymentScriptsStep';

    const deploymentFolderPath = path.join(context.workspacePath, deploymentDirectory);
    if (!fs.existsSync(deploymentFolderPath)) {
      fs.mkdirSync(deploymentFolderPath);
    }

    context.deploymentFolderPath = deploymentFolderPath;
    context.workspacePath = (context.workspaceFolder && context.workspaceFolder.uri.fsPath) || context.workspacePath;
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

    // For Hybrid, skip the Standard IaC API — it generates App Service infrastructure.
    // Instead, generate ARM templates and pipeline YAML for Container Apps directly.
    if (context.deploymentTarget === DeploymentTargetType.hybrid) {
      context.telemetry.properties.lastStep = 'generateHybridDeploymentArtifacts';
      await GenerateADODeploymentScriptsStep.generateHybridDeploymentArtifacts(context);

      // Transform managed connection templates for Hybrid — replace Microsoft.Web/Sites
      // identity references with AAD parameters since Hybrid uses Container Apps, not App Service.
      context.telemetry.properties.lastStep = 'transformConnectionTemplatesForHybrid';
      const hybridInfraFolder = path.join(context.deploymentFolderPath, context.logicAppName, 'infrastructure');
      GenerateADODeploymentScriptsStep.transformConnectionTemplatesForHybrid(hybridInfraFolder);

      ext.outputChannel.appendLog(localize('hybridArtifactsGenerated', 'Hybrid deployment artifacts generated successfully.'));
    } else {
      context.telemetry.properties.lastStep = 'getLogicAppDeploymentArtifactsBuffer';
      const logicAppArtifactsBuffer = await GenerateADODeploymentScriptsStep.getLogicAppDeploymentArtifactsBuffer(context);
      if (!logicAppArtifactsBuffer) {
        throw new Error('Failed getting Logic App deployment artifacts. No content received from the standard resources API.');
      }
      await unzipLogicAppArtifacts(logicAppArtifactsBuffer, context.deploymentFolderPath);
      ext.outputChannel.appendLog(localize('logicAppDeploymentArtifactsUnzipped', 'Logic app deployment artifacts successfully unzipped.'));
    }

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

  // Generates all Hybrid deployment artifacts: ARM infrastructure templates + pipeline YAML.
  // Hybrid Logic Apps are Microsoft.App/containerApps (kind: workflowapp), NOT Microsoft.Web/sites.
  // Three ARM resources: containerApp, logicApp (scoped on containerApp), connectedEnvironments/storages (SMB).
  // Secrets (AAD creds, SQL connection string, SMB password) must be supplied via ADO secret variables.
  private static async generateHybridDeploymentArtifacts(context: IAzureDeploymentScriptsContext): Promise<void> {
    // Place artifacts under deployment/<logicAppName>/ to match the Standard IaC API structure.
    const logicAppFolder = path.join(context.deploymentFolderPath, context.logicAppName);
    const infraFolder = path.join(logicAppFolder, 'infrastructure');
    const pipelinesFolder = path.join(logicAppFolder, 'pipelines');

    if (!fs.existsSync(infraFolder)) {
      fs.mkdirSync(infraFolder, { recursive: true });
    }
    if (!fs.existsSync(pipelinesFolder)) {
      fs.mkdirSync(pipelinesFolder, { recursive: true });
    }

    // --- Workflow parameters ---
    // The Build task requires workflowparameters/parameters.json when deploymentFolder is set.
    // Copy the app's parameters.json so the build task can overlay deployment-specific values.
    const workflowParamsFolder = path.join(logicAppFolder, 'workflowparameters');
    if (!fs.existsSync(workflowParamsFolder)) {
      fs.mkdirSync(workflowParamsFolder, { recursive: true });
    }
    const sourceParametersFile = path.join(context.workspacePath, 'parameters.json');
    const destParametersFile = path.join(workflowParamsFolder, 'parameters.json');
    if (fs.existsSync(sourceParametersFile)) {
      fs.copyFileSync(sourceParametersFile, destParametersFile);
    } else {
      fs.writeFileSync(destParametersFile, JSON.stringify({}, null, 2));
    }

    // --- ARM template ---
    const armTemplate = GenerateADODeploymentScriptsStep.generateHybridArmTemplate();
    fs.writeFileSync(path.join(infraFolder, 'hybrid-logicapp-template.json'), JSON.stringify(armTemplate, null, 2));

    // --- ARM parameters ---
    const armParameters = GenerateADODeploymentScriptsStep.generateHybridArmParameters(context);
    fs.writeFileSync(path.join(infraFolder, 'hybrid-logicapp-parameters.json'), JSON.stringify(armParameters, null, 2));

    // --- Pipeline YAML ---
    GenerateADODeploymentScriptsStep.generateHybridPipelineTemplates(context, pipelinesFolder);
  }

  // ARM template for Hybrid Logic Apps — 3 resources matching Azure Portal deployment:
  // 1. Microsoft.App/containerApps (kind: workflowapp) — the Container App hosting the logic app
  // 2. Microsoft.App/logicApps — the logic app scoped on the container app
  // 3. Microsoft.App/connectedEnvironments/storages — SMB file share for artifacts
  private static generateHybridArmTemplate(): Record<string, unknown> {
    return {
      $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
      contentVersion: '1.0.0.0',
      parameters: {
        subscriptionId: { type: 'string' },
        logicAppName: { type: 'string' },
        location: { type: 'string' },
        connectedEnvironmentName: { type: 'string' },
        connectedEnvironmentResourceGroup: { type: 'string' },
        customLocationId: { type: 'string', metadata: { description: 'Resource ID of the custom location tied to the connected environment' } },
        sqlConnectionString: { type: 'securestring' },
        fileShareHostName: { type: 'string' },
        fileSharePath: { type: 'string' },
        fileShareUsername: { type: 'string' },
        fileSharePassword: { type: 'securestring' },
        aadClientId: { type: 'string' },
        aadClientSecret: { type: 'securestring' },
        aadObjectId: { type: 'string' },
        aadTenantId: { type: 'string' },
      },
      variables: {
        connectedEnvironmentId:
          "[resourceId(parameters('connectedEnvironmentResourceGroup'), 'Microsoft.App/connectedEnvironments', parameters('connectedEnvironmentName'))]",
        storageShareName: "[concat(parameters('logicAppName'), '-fs')]",
      },
      resources: [
        {
          type: 'Microsoft.Resources/deployments',
          apiVersion: '2021-04-01',
          name: 'PersistentStorageTemplate',
          resourceGroup: "[parameters('connectedEnvironmentResourceGroup')]",
          subscriptionId: "[parameters('subscriptionId')]",
          properties: {
            mode: 'Incremental',
            template: {
              $schema: 'https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#',
              contentVersion: '1.0.0.0',
              parameters: {},
              variables: {},
              resources: [
                {
                  apiVersion: '2024-02-02-preview',
                  name: "[concat(parameters('connectedEnvironmentName'), '/', variables('storageShareName'))]",
                  type: 'Microsoft.App/connectedEnvironments/storages',
                  properties: {
                    smb: {
                      accessMode: 'ReadWrite',
                      host: "[parameters('fileShareHostName')]",
                      shareName: "[parameters('fileSharePath')]",
                      username: "[parameters('fileShareUsername')]",
                      password: "[parameters('fileSharePassword')]",
                    },
                  },
                },
              ],
            },
          },
        },
        {
          type: 'Microsoft.App/containerApps',
          apiVersion: '2024-02-02-preview',
          name: "[parameters('logicAppName')]",
          kind: 'workflowapp',
          location: "[parameters('location')]",
          extendedLocation: {
            name: "[parameters('customLocationId')]",
            type: 'CustomLocation',
          },
          dependsOn: ['Microsoft.Resources/deployments/PersistentStorageTemplate'],
          properties: {
            environmentId: "[variables('connectedEnvironmentId')]",
            configuration: {
              activeRevisionsMode: 'Single',
              secrets: [
                { name: 'sql-connection-string', value: "[parameters('sqlConnectionString')]" },
                { name: 'aad-client-secret', value: "[parameters('aadClientSecret')]" },
              ],
              ingress: {
                external: true,
                targetPort: 80,
                allowInsecure: false,
              },
            },
            template: {
              containers: [
                {
                  name: "[parameters('logicAppName')]",
                  image: 'mcr.microsoft.com/azurelogicapps/logicapps-base:latest',
                  resources: { cpu: 1.0, memory: '2Gi' },
                  env: [
                    { name: 'APP_KIND', value: 'workflowapp' },
                    { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' },
                    {
                      name: 'AzureFunctionsJobHost__extensionBundle__id',
                      value: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows',
                    },
                    { name: 'AzureWebJobsSecretStorageType', value: 'files' },
                    { name: 'IS_ZIP_DEPLOY_ENABLED', value: 'true' },
                    { name: 'Workflows.Sql.ConnectionString', secretRef: 'sql-connection-string' },
                    { name: 'WORKFLOWAPP_AAD_CLIENTID', value: "[parameters('aadClientId')]" },
                    { name: 'WORKFLOWAPP_AAD_CLIENTSECRET', secretRef: 'aad-client-secret' },
                    { name: 'WORKFLOWAPP_AAD_OBJECTID', value: "[parameters('aadObjectId')]" },
                    { name: 'WORKFLOWAPP_AAD_TENANTID', value: "[parameters('aadTenantId')]" },
                  ],
                  volumeMounts: [{ volumeName: 'fileshare', mountPath: '/home/site/wwwroot' }],
                },
              ],
              scale: { minReplicas: 1, maxReplicas: 30 },
              volumes: [
                {
                  name: 'fileshare',
                  storageType: 'Smb',
                  storageName: "[variables('storageShareName')]",
                },
              ],
            },
          },
        },
        {
          type: 'Microsoft.App/logicApps',
          apiVersion: '2024-02-02-preview',
          name: "[parameters('logicAppName')]",
          scope: "[concat('Microsoft.App/containerApps/', parameters('logicAppName'))]",
          dependsOn: [
            "[concat('Microsoft.App/containerApps/', parameters('logicAppName'))]",
          ],
          properties: {},
        },
      ],
    };
  }

  // Post-process managed connection templates for Hybrid deployments.
  // The Consumption API generates access policies referencing Microsoft.Web/Sites to resolve managed identity,
  // but Hybrid Logic Apps are Container Apps — replace with explicit AAD parameters.
  private static transformConnectionTemplatesForHybrid(infraFolder: string): void {
    if (!fs.existsSync(infraFolder)) {
      return;
    }

    const templateFiles = fs
      .readdirSync(infraFolder)
      .filter((f) => f.endsWith('.template.json') && f !== 'hybrid-logicapp-template.json');

    for (const file of templateFiles) {
      const filePath = path.join(infraFolder, file);
      const template = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Add aadObjectId and aadTenantId parameters to the template
      if (template.parameters) {
        if (!template.parameters.aadObjectId) {
          template.parameters.aadObjectId = { type: 'String' };
        }
        if (!template.parameters.aadTenantId) {
          template.parameters.aadTenantId = { type: 'String' };
        }
      }

      // Walk resources and fix access policy identity references
      GenerateADODeploymentScriptsStep.fixAccessPolicyIdentityForHybrid(template.resources || []);

      fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf-8');
    }

    // Also update corresponding parameter files
    const paramFiles = fs
      .readdirSync(infraFolder)
      .filter((f) => f.endsWith('.parameters.json') && f !== 'hybrid-logicapp-parameters.json');

    for (const file of paramFiles) {
      const filePath = path.join(infraFolder, file);
      const params = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      if (params.parameters) {
        if (!params.parameters.aadObjectId) {
          params.parameters.aadObjectId = { value: '' };
        }
        if (!params.parameters.aadTenantId) {
          params.parameters.aadTenantId = { value: '' };
        }
      }

      fs.writeFileSync(filePath, JSON.stringify(params, null, 2), 'utf-8');
    }
  }

  // Recursively walk ARM template resources and replace Microsoft.Web/Sites identity references
  // in accessPolicies with explicit AAD parameter references for Hybrid.
  private static fixAccessPolicyIdentityForHybrid(resources: any[]): void {
    for (const resource of resources) {
      if (resource.type === 'accessPolicies' && resource.properties?.principal?.identity) {
        const identity = resource.properties.principal.identity;
        if (typeof identity.objectId === 'string' && identity.objectId.toLowerCase().includes('microsoft.web/sites')) {
          identity.objectId = "[parameters('aadObjectId')]";
        }
        if (typeof identity.tenantId === 'string' && identity.tenantId.toLowerCase().includes('microsoft.web/sites')) {
          identity.tenantId = "[parameters('aadTenantId')]";
        }
      }
      // Recurse into nested resources
      if (resource.resources) {
        GenerateADODeploymentScriptsStep.fixAccessPolicyIdentityForHybrid(resource.resources);
      }
    }
  }

  // ARM parameters file — secrets are excluded and must be supplied via ADO pipeline secret variables
  // using overrideParameters in the CD pipeline's ARM deployment task.
  private static generateHybridArmParameters(context: IAzureDeploymentScriptsContext): Record<string, unknown> {
    return {
      $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#',
      contentVersion: '1.0.0.0',
      parameters: {
        subscriptionId: { value: context.subscriptionId || '<your-subscription-id>' },
        logicAppName: { value: context.logicAppName },
        location: { value: context.resourceGroup?.location || '' },
        connectedEnvironmentName: { value: context.connectedEnvironmentName || '' },
        connectedEnvironmentResourceGroup: { value: context.connectedEnvironmentResourceGroup || '' },
        customLocationId: { value: '<your-custom-location-resource-id>' },
        fileShareHostName: { value: '<your-smb-host>' },
        fileSharePath: { value: '<your-smb-share-name>' },
        fileShareUsername: { value: '<your-smb-username>' },
        aadClientId: { value: '<your-aad-client-id>' },
        aadObjectId: { value: '<your-aad-object-id>' },
        aadTenantId: { value: '<your-aad-tenant-id>' },
        // DO NOT add secrets here — supply via ADO pipeline secret variables:
        // sqlConnectionString, fileSharePassword, aadClientSecret
      },
    };
  }

  // Generates Hybrid CI/CD pipeline YAML and variable files.
  // CI: HybridBuild task (copy, transform auth, archive).
  // CD: ARM deployment (infrastructure) → ConnectionsDeployment → HybridRelease.
  private static generateHybridPipelineTemplates(context: IAzureDeploymentScriptsContext, pipelinesFolder: string): void {
    // CI pipeline — HybridBuild copies files, transforms MSI→AAD OAuth auth, and archives.
    const ciPipelineContent = `trigger:
- main

pr: none

pool:
  vmImage: 'ubuntu-latest'

variables:
- template: CI-pipeline-variables.yml

jobs:
- job: logic_app_build
  displayName: 'Build and publish Hybrid Logic App'
  steps:
  - task: AzureLogicAppsHybridBuild@0
    displayName: 'Azure Logic Apps Hybrid Build'
    inputs:
      sourceFolder: '\$(Build.SourcesDirectory)/\$(logicAppName)'
      deploymentFolder: '\$(System.DefaultWorkingDirectory)/deployment/\$(logicAppName)/'
      archiveFile: '\$(Build.ArtifactStagingDirectory)/\$(Build.BuildId).zip'

  - task: PublishPipelineArtifact@1
    displayName: 'Publish logic app zip artifact'
    inputs:
      targetPath: '\$(Build.ArtifactStagingDirectory)/\$(Build.BuildId).zip'
      artifact: '\$(logicAppCIArtifactName)'
      publishLocation: 'pipeline'

  - task: PublishPipelineArtifact@1
    displayName: 'Publish infrastructure artifacts'
    inputs:
      targetPath: '\$(Build.SourcesDirectory)/deployment/\$(logicAppName)/infrastructure'
      artifact: 'infrastructure'
      publishLocation: 'pipeline'
`;

    fs.writeFileSync(path.join(pipelinesFolder, 'CI-pipeline.yml'), ciPipelineContent);

    // CD pipeline — ARM deploy infrastructure → ConnectionsDeployment → HybridRelease.
    const cdPipelineContent = `trigger: none

pr: none

pool:
  vmImage: 'ubuntu-latest'

variables:
- template: CD-pipeline-variables.yml

resources:
  pipelines:
  - pipeline: cipipeline
    # TODO: Update with the name of your CI pipeline
    source: CI Pipeline
    trigger:
      branches:
      - main

jobs:
- deployment: deploy_hybrid_logicapp
  displayName: Deploy Hybrid Logic App
  environment: \$(logicAppEnvironment)
  strategy:
    runOnce:
      deploy:
        steps:
        - task: AzureResourceManagerTemplateDeployment@3
          displayName: 'Deploy Hybrid Logic App Infrastructure'
          inputs:
            deploymentScope: 'Resource Group'
            azureResourceManagerConnection: '\$(azureServiceConnection)'
            subscriptionId: '\$(subscriptionId)'
            action: 'Create Or Update Resource Group'
            resourceGroupName: '\$(resourceGroupName)'
            location: '\$(location)'
            templateLocation: 'Linked artifact'
            csmFile: '\$(Pipeline.Workspace)/cipipeline/infrastructure/hybrid-logicapp-template.json'
            csmParametersFile: '\$(Pipeline.Workspace)/cipipeline/infrastructure/hybrid-logicapp-parameters.json'
            overrideParameters: >-
              -sqlConnectionString "\$(sqlConnectionString)"
              -fileSharePassword "\$(fileSharePassword)"
              -aadClientSecret "\$(aadClientSecret)"
            deploymentMode: 'Incremental'

        - task: AzureLogicAppsHybridConnectionsDeployment@0
          displayName: 'Deploy Managed Connections'
          condition: eq(variables['deployConnections'], 'true')
          inputs:
            connectedServiceName: '\$(azureServiceConnection)'
            subscriptionId: '\$(subscriptionId)'
            resourceGroupName: '\$(resourceGroupName)'
            location: '\$(location)'
            sourcePackagePath: '\$(Pipeline.Workspace)/cipipeline/\$(logicAppCIArtifactName)/\$(resources.pipeline.cipipeline.runID).zip'
            outputPackagePath: '\$(Pipeline.Workspace)/cipipeline/\$(logicAppCIArtifactName)/\$(resources.pipeline.cipipeline.runID)-transformed.zip'
            armTemplatePath: '\$(Pipeline.Workspace)/cipipeline/infrastructure'
            deployConnections: true

        - script: |
            transformedZip="\$(Pipeline.Workspace)/cipipeline/\$(logicAppCIArtifactName)/\$(resources.pipeline.cipipeline.runID)-transformed.zip"
            originalZip="\$(Pipeline.Workspace)/cipipeline/\$(logicAppCIArtifactName)/\$(resources.pipeline.cipipeline.runID).zip"
            if [ -f "$transformedZip" ]; then
              echo "##vso[task.setvariable variable=deployPackagePath]$transformedZip"
            else
              echo "##vso[task.setvariable variable=deployPackagePath]$originalZip"
            fi
          displayName: 'Resolve deploy package path'

        - task: AzureLogicAppsHybridRelease@0
          displayName: 'Azure Logic Apps Hybrid Release'
          inputs:
            connectedServiceName: '\$(azureServiceConnection)'
            hybridConnectionName: '\$(hybridServiceConnection)'
            containerAppName: '\$(containerAppName)'
            resourceGroupName: '\$(resourceGroupName)'
            package: '\$(deployPackagePath)'
`;

    fs.writeFileSync(path.join(pipelinesFolder, 'CD-pipeline.yml'), cdPipelineContent);

    // CD variables — includes all inputs for ARM deploy, ConnectionsDeployment, and HybridRelease.
    // Secrets (sqlConnectionString, fileSharePassword, aadClientSecret) should be set as ADO secret variables.
    const cdVariablesContent = `variables:
  azureServiceConnection: '<your-azure-service-connection>'
  hybridServiceConnection: '<your-hybrid-service-connection>'
  subscriptionId: '<your-subscription-id>'
  containerAppName: '${context.logicAppName}'
  resourceGroupName: '${context.resourceGroup?.name || '<your-resource-group>'}'
  location: '${context.resourceGroup?.location || '<your-location>'}'
  logicAppCIArtifactName: 'logic-app-artifact'
  logicAppEnvironment: 'production'
  # Set to 'true' to deploy managed connections via ARM templates
  deployConnections: 'false'
  # Secrets — set these as pipeline secret variables in ADO (Variables button in pipeline editor)
  # Do NOT define them here — YAML variables override pipeline variables
  # Required secrets: sqlConnectionString, fileSharePassword, aadClientSecret
`;

    fs.writeFileSync(path.join(pipelinesFolder, 'CD-pipeline-variables.yml'), cdVariablesContent);

    // CI variables
    const ciVariablesContent = `variables:
  logicAppName: '${context.logicAppName}'
  logicAppCIArtifactName: 'logic-app-artifact'
`;

    fs.writeFileSync(path.join(pipelinesFolder, 'CI-pipeline-variables.yml'), ciVariablesContent);
  }
}
