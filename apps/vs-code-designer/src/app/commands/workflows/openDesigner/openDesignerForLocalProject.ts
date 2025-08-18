import { localSettingsFileName, managementApiPrefix, workflowAppApiVersion } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { getLocalSettingsJson } from '../../../utils/appSettings/localSettings';
import { getArtifactsInLocalProject } from '../../../utils/codeless/artifacts';
import {
  cacheWebviewPanel,
  getAzureConnectorDetailsForLocalProject,
  getManualWorkflowsInLocalProject,
  getStandardAppData,
  removeWebviewPanelFromCache,
} from '../../../utils/codeless/common';
import {
  addConnectionData,
  getConnectionsAndSettingsToUpdate,
  getConnectionsFromFile,
  getCustomCodeFromFiles,
  getCustomCodeToUpdate,
  getLogicAppProjectRoot,
  getParametersFromFile,
  saveConnectionReferences,
  saveCustomCodeStandard,
} from '../../../utils/codeless/connection';
import { saveWorkflowParameter } from '../../../utils/codeless/parameter';
import { startDesignTimeApi } from '../../../utils/codeless/startDesignTimeApi';
import { sendRequest } from '../../../utils/requestUtils';
import { saveUnitTestDefinition } from '../../../utils/unitTests';
import { createNewDataMapCmd } from '../../dataMapper/dataMapper';
import { OpenDesignerBase } from './openDesignerBase';
import { HTTP_METHODS } from '@microsoft/logic-apps-shared';
import { callWithTelemetryAndErrorHandling, openUrl, type IActionContext } from '@microsoft/vscode-azext-utils';
import type {
  AzureConnectorDetails,
  CompleteFileSystemConnectionData,
  FileSystemConnectionInfo,
  IDesignerPanelMetadata,
  Parameter,
} from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import axios from 'axios';
import { exec } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import * as path from 'path';
import { env, ProgressLocation, Uri, ViewColumn, window, workspace } from 'vscode';
import type { WebviewPanel, ProgressOptions } from 'vscode';
import { saveBlankUnitTest } from '../unitTest/saveBlankUnitTest';
import { getBundleVersionNumber } from '../../../utils/getDebugSymbolDll';
import { createHttpHeaders } from '@azure/core-rest-pipeline';

export default class OpenDesignerForLocalProject extends OpenDesignerBase {
  private readonly workflowFilePath: string;
  private migrationOptions: Record<string, any>;
  private projectPath: string | undefined;
  private panelMetadata: IDesignerPanelMetadata;

  constructor(context: IActionContext, node: Uri, unitTestName?: string, unitTestDefinition?: any, runId?: string) {
    const workflowName = path.basename(path.dirname(node.fsPath));
    const logicAppName = path.basename(path.dirname(path.dirname(node.fsPath)));
    const panelName = `${workspace.name}-${logicAppName}-${workflowName}${unitTestName ? `-${unitTestName}` : ''}`;
    const panelGroupKey = ext.webViewKey.designerLocal;
    const runName = runId ? runId.split('/').slice(-1)[0] : '';

    super(context, workflowName, panelName, workflowAppApiVersion, panelGroupKey, !!unitTestName, true, false, runName);

    this.unitTestName = unitTestName;
    this.isUnitTest = !!unitTestName;
    this.unitTestDefinition = unitTestDefinition ?? null;
    this.workflowFilePath = node.fsPath;
  }

  private createFileSystemConnection = (connectionInfo: FileSystemConnectionInfo): Promise<any> => {
    const rootFolder = connectionInfo.connectionParameters?.['rootFolder'];
    const username = connectionInfo.connectionParameters?.['username'];
    const password = connectionInfo.connectionParameters?.['password'];

    return new Promise((resolve) => {
      exec(`net use ${rootFolder} ${password} /user:${username}`, (error) => {
        if (error) {
          resolve({ errorMessage: JSON.stringify(error.message) });
        } else {
          resolve({
            connection: {
              ...connectionInfo,
              connectionParameters: { mountPath: rootFolder },
            },
          });
        }
      });
    });
  };

  public async createPanel(): Promise<void> {
    const existingPanel: WebviewPanel | undefined = this.getExistingPanel();

    if (existingPanel) {
      this.panel = existingPanel;
      if (!existingPanel.active) {
        existingPanel.reveal(ViewColumn.Active);
        return;
      }
      return;
    }

    this.projectPath = await getLogicAppProjectRoot(this.context, this.workflowFilePath);
    if (!this.projectPath) {
      throw new Error(localize('FunctionRootFolderError', 'Unable to determine function project root folder.'));
    }

    await startDesignTimeApi(this.projectPath);

    if (!ext.designTimeInstances.has(this.projectPath)) {
      throw new Error(localize('designTimeNotRunning', `Design time is not running for project ${this.projectPath}.`));
    }
    const designTimePort = ext.designTimeInstances.get(this.projectPath).port;
    if (!designTimePort) {
      throw new Error(localize('designTimePortNotFound', 'Design time port not found.'));
    }
    this.baseUrl = `http://localhost:${designTimePort}${managementApiPrefix}`;
    this.workflowRuntimeBaseUrl = `http://localhost:${ext.workflowRuntimePort}${managementApiPrefix}`;

    this.panel = window.createWebviewPanel(
      this.panelGroupKey, // Key used to reference the panel
      this.panelName, // Title display in the tab
      ViewColumn.Active, // Editor column to show the new webview panel in.
      this.getPanelOptions()
    );
    this.panel.iconPath = {
      light: Uri.file(path.join(ext.context.extensionPath, 'assets', 'light', 'workflow.svg')),
      dark: Uri.file(path.join(ext.context.extensionPath, 'assets', 'dark', 'workflow.svg')),
    };

    this.migrationOptions = await this._getMigrationOptions(this.baseUrl);
    this.panelMetadata = await this._getDesignerPanelMetadata(this.migrationOptions);
    const callbackUri: Uri = await (env as any).asExternalUri(
      Uri.parse(`${env.uriScheme}://ms-azuretools.vscode-azurelogicapps/authcomplete`)
    );
    this.context.telemetry.properties.extensionBundleVersion = this.panelMetadata.extensionBundleVersion;
    this.oauthRedirectUrl = callbackUri.toString(true);

    this.panel.webview.html = await this.getWebviewContent({
      connectionsData: this.panelMetadata.connectionsData,
      parametersData: this.panelMetadata.parametersData || {},
      localSettings: this.panelMetadata.localSettings,
      artifacts: this.panelMetadata.artifacts,
      azureDetails: this.panelMetadata.azureDetails,
      workflowDetails: this.panelMetadata.workflowDetails,
    });
    this.panelMetadata.mapArtifacts = this.mapArtifacts;
    this.panelMetadata.schemaArtifacts = this.schemaArtifacts;

    this.panel.webview.onDidReceiveMessage(async (message) => await this._handleWebviewMsg(message), ext.context.subscriptions);

    this.panel.onDidChangeViewState(
      async (event) => {
        const eventPanel: WebviewPanel = event.webviewPanel;
        if (eventPanel.visible) {
          await this.reloadWebviewPanel(eventPanel);
        }
      },
      undefined,
      ext.context.subscriptions
    );

    this.panel.onDidDispose(
      () => {
        removeWebviewPanelFromCache(this.panelGroupKey, this.panelName);
      },
      null,
      ext.context.subscriptions
    );

    cacheWebviewPanel(this.panelGroupKey, this.panelName, this.panel);
    ext.context.subscriptions.push(this.panel);
  }

  private async _handleWebviewMsg(msg: any) {
    switch (msg.command) {
      case ExtensionCommand.initialize: {
        this.sendMsgToWebview({
          command: ExtensionCommand.initialize_frame,
          data: {
            project: ProjectName.designer,
            panelMetadata: this.panelMetadata,
            connectionData: this.connectionData,
            baseUrl: this.baseUrl,
            workflowRuntimeBaseUrl: this.workflowRuntimeBaseUrl,
            apiVersion: this.apiVersion,
            apiHubServiceDetails: this.apiHubServiceDetails,
            readOnly: this.readOnly,
            isLocal: this.isLocal,
            isMonitoringView: this.isMonitoringView,
            workflowDetails: this.workflowDetails,
            oauthRedirectUrl: this.oauthRedirectUrl,
            hostVersion: ext.extensionVersion,
            isUnitTest: this.isUnitTest,
            unitTestDefinition: this.unitTestDefinition,
            runId: this.runId,
          },
        });
        await callWithTelemetryAndErrorHandling('InitializeWorkflowFromDesigner', async (activateContext: IActionContext) => {
          if (!this.isUnitTest) {
            await this.validateWorkflow(activateContext, this.panelMetadata.workflowContent, this.panelMetadata.localSettings);
          }
        });
        break;
      }
      case ExtensionCommand.save: {
        await callWithTelemetryAndErrorHandling('SaveWorkflowFromDesigner', async (activateContext: IActionContext) => {
          const projectPath = await getLogicAppProjectRoot(activateContext, this.workflowFilePath);
          const localSettingsPath: string = path.join(projectPath, localSettingsFileName);
          await this.saveWorkflow(
            activateContext,
            this.workflowFilePath,
            this.panelMetadata.workflowContent,
            msg,
            this.panelMetadata.parametersData,
            this.panelMetadata.azureDetails?.tenantId,
            this.panelMetadata.azureDetails?.workflowManagementBaseUrl
          );
          const localSettingsValues = (await getLocalSettingsJson(activateContext, localSettingsPath, true)).Values || {};
          await this.validateWorkflow(activateContext, JSON.parse(readFileSync(this.workflowFilePath, 'utf8')), localSettingsValues);
        });
        break;
      }
      case ExtensionCommand.saveBlankUnitTest: {
        await callWithTelemetryAndErrorHandling('SaveBlankUnitTestFromDesigner', async (activateContext: IActionContext) => {
          await saveBlankUnitTest(activateContext, Uri.file(this.workflowFilePath), msg.definition);
        });
        break;
      }
      case ExtensionCommand.saveUnitTest: {
        await callWithTelemetryAndErrorHandling('SaveUnitTestFromDesigner', async (activateContext: IActionContext) => {
          await saveUnitTestDefinition(activateContext, this.projectPath, this.workflowName, this.unitTestName, msg.definition);
        });
        break;
      }
      case ExtensionCommand.addConnection: {
        await callWithTelemetryAndErrorHandling('AddConnectionFromDesigner', async (activateContext: IActionContext) => {
          await addConnectionData(activateContext, this.workflowFilePath, msg.connectionAndSetting);
        });
        break;
      }
      case ExtensionCommand.openOauthLoginPopup: {
        await env.openExternal(msg.url);
        break;
      }

      case ExtensionCommand.createFileSystemConnection: {
        {
          const connectionName = msg.connectionName;
          const { connection, errorMessage } = await this.createFileSystemConnection(msg.connectionInfo);
          const completeData: CompleteFileSystemConnectionData = {
            connectionName,
            connection,
            error: errorMessage,
          };
          this.sendMsgToWebview({
            command: ExtensionCommand.completeFileSystemConnection,
            data: completeData,
          });
        }
        break;
      }

      case ExtensionCommand.openRelativeLink: {
        if (msg.content === '/dataMapper') {
          createNewDataMapCmd(this.context);
        }
        break;
      }

      case ExtensionCommand.logTelemetry: {
        const eventName = msg.data.name ?? msg.data.area;
        ext.telemetryReporter.sendTelemetryEvent(eventName, { ...msg.data });
        break;
      }
      case ExtensionCommand.fileABug: {
        await openUrl('https://github.com/Azure/LogicAppsUX/issues/new?template=bug_report.yml');
        break;
      }

      default:
        break;
    }
  }

  /**
   * Saves workflow locally in the workflow.json.
   * @param {string} filePath - File path of file to save the workflow.
   * @param {any} workflow - Local workflow schema before changes .
   * @param {any} workflowToSave - Workflow schema to save.
   * @param {string} azureTenantId - Tenant id from azure.
   * @param {string} workflowBaseManagementUri - Workflow base url.
   */
  private async saveWorkflow(
    context: IActionContext,
    filePath: string,
    workflow: any,
    workflowToSave: any,
    panelParameterRecord: Record<string, Parameter>,
    azureTenantId?: string,
    workflowBaseManagementUri?: string
  ): Promise<void> {
    const options: ProgressOptions = {
      location: ProgressLocation.Notification,
      title: localize('azureFunctions.savingWorkflow', 'Saving Workflow...'),
    };

    await window.withProgress(options, async () => {
      try {
        const { definition, connectionReferences, parameters, customCodeData } = workflowToSave;
        const definitionToSave: any = definition;
        const parametersFromDefinition = parameters;
        const projectPath = await getLogicAppProjectRoot(this.context, filePath);

        workflow.definition = definitionToSave;

        if (connectionReferences) {
          const connectionsAndSettingsToUpdate = await getConnectionsAndSettingsToUpdate(
            this.context,
            projectPath,
            connectionReferences,
            azureTenantId,
            workflowBaseManagementUri,
            parametersFromDefinition
          );

          await saveConnectionReferences(this.context, projectPath, connectionsAndSettingsToUpdate);
        }

        if (customCodeData) {
          const customCodeToUpdate = await getCustomCodeToUpdate(this.context, filePath, customCodeData);
          await saveCustomCodeStandard(filePath, customCodeToUpdate);
        }

        if (parametersFromDefinition) {
          delete parametersFromDefinition.$connections;
          for (const parameterKey of Object.keys(parametersFromDefinition)) {
            const parameter = parametersFromDefinition[parameterKey];
            parameter.value = parameter.value ?? parameter.defaultValue;
            delete parameter.defaultValue;
          }
          await this.mergeJsonParameters(filePath, parametersFromDefinition, panelParameterRecord);
          await saveWorkflowParameter(this.context, filePath, parametersFromDefinition);
        }

        writeFileSync(filePath, JSON.stringify(workflow, null, 4));
        this.sendMsgToWebview({
          command: ExtensionCommand.resetDesignerDirtyState,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
        const errorLocalized = `${localize('saveFailure', 'Workflow not saved.')} ${errorMessage}`;
        context.telemetry.properties.saveWorkflowError = errorLocalized;
        window.showErrorMessage(errorLocalized, localize('OK', 'OK'));
        throw error;
      }
    });
  }

  /**
   * Validates a workflow using the design time API.
   *
   * @param context - The action context for the operation
   * @param workflow - The workflow object containing definition and kind properties
   * @throws {Error} If design time is not running for the project
   * @throws {Error} If design time port is not found
   * @remarks
   * This method sends a POST request to the local design time API to validate the workflow definition.
   * If validation fails with a non-404 status code, an error message is displayed to the user.
   * The validation includes the workflow definition, kind, and local app settings.
   */
  private async validateWorkflow(context: IActionContext, workflow: any, localSettings: any): Promise<void> {
    if (!ext.designTimeInstances.has(this.projectPath)) {
      throw new Error(localize('designTimeNotRunning', `Design time is not running for project ${this.projectPath}.`));
    }
    const designTimePort = ext.designTimeInstances.get(this.projectPath).port;
    if (!designTimePort) {
      throw new Error(localize('designTimePortNotFound', 'Design time port not found.'));
    }
    const url = `http://localhost:${designTimePort}${managementApiPrefix}/workflows/${this.workflowName}/validatePartial?api-version=${this.apiVersion}`;
    try {
      const headers = createHttpHeaders({
        'Content-Type': 'application/json',
      });
      await sendRequest(this.context, {
        url,
        method: HTTP_METHODS.POST,
        headers,
        body: JSON.stringify({
          properties: { definition: workflow.definition, kind: workflow.kind, appSettings: { values: localSettings } },
        }),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
      context.telemetry.properties.validateWorkflowError = errorMessage;
      if (error.statusCode !== 404) {
        const errorLocalized = localize('workflowValidationFailed', 'Workflow validation failed: ') + errorMessage;
        window.showErrorMessage(errorLocalized, localize('OK', 'OK'));
      }
    }
  }

  private _migrate(workflow: any, migrationOptions: Record<string, any>): void {
    this._traverseActions(workflow.definition?.actions, migrationOptions);
  }

  private _traverseActions(actions: any, migrationOptions: Record<string, any>): void {
    if (actions) {
      for (const actionName of Object.keys(actions)) {
        this._traverseAction(actions[actionName], migrationOptions);
      }
    }
  }

  private _traverseAction(action: any, migrationOptions: Record<string, any>): void {
    const type = action?.type;
    switch ((type || '').toLowerCase()) {
      case 'liquid': {
        if (migrationOptions['liquidJsonToJson']?.inputs?.properties?.map?.properties?.source) {
          const map = action?.inputs?.map;
          if (map && map.source === undefined) {
            map.source = 'LogicApp';
          }
        }
        break;
      }
      case 'xmlvalidation': {
        if (migrationOptions['xmlValidation']?.inputs?.properties?.schema?.properties?.source) {
          const schema = action?.inputs?.schema;
          if (schema && schema.source === undefined) {
            schema.source = 'LogicApp';
          }
        }
        break;
      }
      case 'xslt': {
        if (migrationOptions['xslt']?.inputs?.properties?.map?.properties?.source) {
          const map = action?.inputs?.map;
          if (map && map.source === undefined) {
            map.source = 'LogicApp';
          }
        }
        break;
      }
      case 'flatfileencoding':
      case 'flatfiledecoding': {
        if (migrationOptions['flatFileEncoding']?.inputs?.properties?.schema?.properties?.source) {
          const schema = action?.inputs?.schema;
          if (schema && schema.source === undefined) {
            schema.source = 'LogicApp';
          }
        }
        break;
      }
      case 'if': {
        this._traverseActions(action.else?.actions, migrationOptions);
        break;
      }
      case 'scope':
      case 'foreach':
      case 'changeset':
      case 'until': {
        this._traverseActions(action.actions, migrationOptions);
        break;
      }
      case 'switch': {
        for (const caseKey of Object.keys(action.cases || {})) {
          this._traverseActions(action.cases[caseKey]?.actions, migrationOptions);
        }
        this._traverseActions(action.default?.actions, migrationOptions);

        break;
      }
    }
  }

  private _getMigrationOptions(baseUrl: string): Promise<Record<string, any>> {
    const flatFileEncodingPromise = axios.get(
      `${baseUrl}/operationGroups/flatFileOperations/operations/flatFileEncoding?api-version=2019-10-01-edge-preview&$expand=properties/manifest`
    );
    const liquidJsonToJsonPromise = axios.get(
      `${baseUrl}/operationGroups/liquidOperations/operations/liquidJsonToJson?api-version=2019-10-01-edge-preview&$expand=properties/manifest`
    );
    const xmlValidationPromise = axios.get(
      `${baseUrl}/operationGroups/xmlOperations/operations/xmlValidation?api-version=2019-10-01-edge-preview&$expand=properties/manifest`
    );
    const xsltPromise = axios.get(
      `${baseUrl}/operationGroups/xmlOperations/operations/xmlTransform?api-version=2019-10-01-edge-preview&$expand=properties/manifest`
    );

    return Promise.all([flatFileEncodingPromise, liquidJsonToJsonPromise, xmlValidationPromise, xsltPromise]).then(
      ([ff, liquid, xmlvalidation, xslt]) => {
        return {
          flatFileEncoding: ff.data.properties.manifest,
          liquidJsonToJson: liquid.data.properties.manifest,
          xmlValidation: xmlvalidation.data.properties.manifest,
          xslt: xslt.data.properties.manifest,
        };
      }
    );
  }

  private async _getDesignerPanelMetadata(migrationOptions: Record<string, any> = {}): Promise<IDesignerPanelMetadata> {
    const workflowContent: any = JSON.parse(readFileSync(this.workflowFilePath, 'utf8'));
    this._migrate(workflowContent, migrationOptions);
    const connectionsData: string = await getConnectionsFromFile(this.context, this.workflowFilePath);
    const projectPath: string | undefined = await getLogicAppProjectRoot(this.context, this.workflowFilePath);
    const parametersData: Record<string, Parameter> = await getParametersFromFile(this.context, this.workflowFilePath);
    const customCodeData: Record<string, string> = await getCustomCodeFromFiles(this.workflowFilePath);
    const workflowDetails = await getManualWorkflowsInLocalProject(projectPath, this.workflowName);
    const artifacts = await getArtifactsInLocalProject(projectPath);
    const bundleVersionNumber = await getBundleVersionNumber();

    let localSettings: Record<string, string>;
    let azureDetails: AzureConnectorDetails;

    if (projectPath) {
      azureDetails = await getAzureConnectorDetailsForLocalProject(this.context, projectPath);
      localSettings = (await getLocalSettingsJson(this.context, path.join(projectPath, localSettingsFileName))).Values;
    } else {
      throw new Error(localize('FunctionRootFolderError', 'Unable to determine function project root folder.'));
    }

    return {
      panelId: this.panelName,
      appSettingNames: Object.keys(localSettings),
      standardApp: getStandardAppData(this.workflowName, workflowContent),
      connectionsData,
      customCodeData,
      parametersData,
      localSettings,
      azureDetails,
      accessToken: azureDetails.accessToken,
      workflowContent,
      workflowDetails,
      workflowName: this.workflowName,
      artifacts,
      schemaArtifacts: this.schemaArtifacts,
      mapArtifacts: this.mapArtifacts,
      extensionBundleVersion: bundleVersionNumber,
    };
  }

  /**
   * Merges parameters from JSON.
   * @param filePath The file path of the parameters JSON file.
   * @param definitionParameters The parameters from the designer.
   * @param panelParameterRecord The parameters from the panel
   * @returns parameters from JSON file and designer.
   */
  private async mergeJsonParameters(
    filePath: string,
    definitionParameters: any,
    panelParameterRecord: Record<string, Parameter>
  ): Promise<void> {
    const jsonParameters = await getParametersFromFile(this.context, filePath);

    Object.entries(jsonParameters).forEach(([key, parameter]) => {
      if (!definitionParameters[key] && !panelParameterRecord[key]) {
        definitionParameters[key] = parameter;
      }
    });
  }

  /**
   * Reloads the webview panel and updates the view state.
   * @param webviewPanel The web view panel to update.
   */
  private async reloadWebviewPanel(webviewPanel: WebviewPanel): Promise<void> {
    this.panelMetadata = await this._getDesignerPanelMetadata(this.migrationOptions);
    webviewPanel.webview.html = await this.getWebviewContent({
      connectionsData: this.panelMetadata.connectionsData,
      parametersData: this.panelMetadata.parametersData || {},
      localSettings: this.panelMetadata.localSettings,
      artifacts: this.panelMetadata.artifacts,
      azureDetails: this.panelMetadata.azureDetails,
      workflowDetails: this.panelMetadata.workflowDetails,
    });
    this.sendMsgToWebview({
      command: ExtensionCommand.update_panel_metadata,
      data: {
        panelMetadata: this.panelMetadata,
        connectionData: this.connectionData,
        apiHubServiceDetails: this.apiHubServiceDetails,
      },
    });
  }
}
