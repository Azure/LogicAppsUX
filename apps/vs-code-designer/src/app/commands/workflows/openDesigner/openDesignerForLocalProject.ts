import { localSettingsFileName, managementApiPrefix } from '../../../../constants';
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
  getLogicAppProjectRoot,
  getParametersFromFile,
  saveConnectionReferences,
} from '../../../utils/codeless/connection';
import { saveWorkflowParameter } from '../../../utils/codeless/parameter';
import { startDesignTimeApi } from '../../../utils/codeless/startDesignTimeApi';
import { sendRequest } from '../../../utils/requestUtils';
import { createNewDataMapCmd } from '../../dataMapper/dataMapper';
import { OpenDesignerBase } from './openDesignerBase';
import { HTTP_METHODS } from '@microsoft/logic-apps-shared';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type {
  AzureConnectorDetails,
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

export default class OpenDesignerForLocalProject extends OpenDesignerBase {
  private readonly workflowFilePath: string;
  private migrationOptions: Record<string, any>;
  private projectPath: string | undefined;
  private panelMetadata: IDesignerPanelMetadata;

  constructor(context: IActionContext, node: Uri) {
    const workflowName = path.basename(path.dirname(node.fsPath));
    const apiVersion = '2018-11-01';
    const panelName = `${workspace.name}-${workflowName}`;
    const panelGroupKey = ext.webViewKey.designerLocal;

    super(context, workflowName, panelName, apiVersion, panelGroupKey, false, true, false);

    this.workflowFilePath = node.fsPath;
  }

  private createFileSystemConnection = (connectionInfo: FileSystemConnectionInfo): Promise<any> => {
    const rootFolder = connectionInfo.connectionParameters?.['rootFolder'];
    const username = connectionInfo.connectionParameters?.['username'];
    const password = connectionInfo.connectionParameters?.['password'];

    return new Promise((resolve, _) => {
      exec(`net use ${rootFolder} ${password} /user:${username}`, (error) => {
        if (error) {
          resolve({ errorMessage: JSON.stringify(error.message) });
        }
        resolve({
          connection: {
            ...connectionInfo,
            connectionParameters: { mountPath: rootFolder },
          },
        });
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

    this.baseUrl = `http://localhost:${ext.designTimePort}${managementApiPrefix}`;

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
            apiVersion: this.apiVersion,
            apiHubServiceDetails: this.apiHubServiceDetails,
            readOnly: this.readOnly,
            isLocal: this.isLocal,
            isMonitoringView: this.isMonitoringView,
            workflowDetails: this.workflowDetails,
            oauthRedirectUrl: this.oauthRedirectUrl,
            hostVersion: ext.extensionVersion,
          },
        });
        await this.validateWorkflow(this.panelMetadata.workflowContent);
        break;
      }
      case ExtensionCommand.save: {
        await this.saveWorkflow(
          this.workflowFilePath,
          this.panelMetadata.workflowContent,
          msg,
          this.panelMetadata.parametersData,
          this.panelMetadata.azureDetails?.tenantId,
          this.panelMetadata.azureDetails?.workflowManagementBaseUrl
        );
        await this.validateWorkflow(this.panelMetadata.workflowContent);
        await this.reloadWebviewPanel(this.getExistingPanel());
        break;
      }
      case ExtensionCommand.addConnection: {
        await addConnectionData(this.context, this.workflowFilePath, msg.connectionAndSetting);
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
          this.sendMsgToWebview({
            command: ExtensionCommand.completeFileSystemConnection,
            data: {
              connectionName,
              connection,
              errorMessage,
            },
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
        const { definition, connectionReferences, parameters } = workflowToSave;
        const definitionToSave: any = definition;
        const parametersFromDefinition = parameters;

        workflow.definition = definitionToSave;

        if (connectionReferences) {
          const projectPath = await getLogicAppProjectRoot(this.context, filePath);
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
      } catch (error) {
        window.showErrorMessage(`${localize('saveFailure', 'Workflow not saved.')} ${error.message}`, localize('OK', 'OK'));
        throw error;
      }
    });
  }

  /**
   * Calls the validate api to validate the workflow schema.
   * @param {any} workflow - Workflow schema to validate.
   */
  private async validateWorkflow(workflow: any): Promise<void> {
    const url = `http://localhost:${ext.designTimePort}${managementApiPrefix}/workflows/${this.workflowName}/validate?api-version=${this.apiVersion}`;
    try {
      await sendRequest(this.context, {
        url,
        method: HTTP_METHODS.POST,
        headers: { ['Content-Type']: 'application/json' },
        body: { properties: workflow },
      });
    } catch (error) {
      if (error.statusCode !== 404) {
        const errorMessage = localize('workflowValidationFailed', 'Workflow validation failed: ') + error.message;
        await window.showErrorMessage(errorMessage, localize('OK', 'OK'));
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
      parametersData,
      localSettings,
      azureDetails,
      accessToken: azureDetails.accessToken,
      workflowContent,
      workflowDetails: await getManualWorkflowsInLocalProject(projectPath, this.workflowName),
      workflowName: this.workflowName,
      artifacts: await getArtifactsInLocalProject(projectPath),
      schemaArtifacts: this.schemaArtifacts,
      mapArtifacts: this.mapArtifacts,
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
