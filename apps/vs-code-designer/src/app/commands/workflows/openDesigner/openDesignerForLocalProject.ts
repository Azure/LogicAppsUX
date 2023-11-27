import { localSettingsFileName, managementApiPrefix } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { getLocalSettingsJson } from '../../../utils/appSettings/localSettings';
import {
  cacheWebviewPanel,
  getArtifactsInLocalProject,
  getAzureConnectorDetailsForLocalProject,
  getManualWorkflowsInLocalProject,
  getStandardAppData,
  removeWebviewPanelFromCache,
} from '../../../utils/codeless/common';
import {
  addConnectionData,
  containsApiHubConnectionReference,
  getConnectionsAndSettingsToUpdate,
  getConnectionsFromFile,
  getFunctionProjectRoot,
  getParametersFromFile,
  saveConnectionReferences,
} from '../../../utils/codeless/connection';
import { saveParameters } from '../../../utils/codeless/parameter';
import { startDesignTimeApi } from '../../../utils/codeless/startDesignTimeApi';
import { sendRequest } from '../../../utils/requestUtils';
import { OpenDesignerBase } from './openDesignerBase';
import { HTTP_METHODS } from '@microsoft/utils-logic-apps';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { AzureConnectorDetails, FileSystemConnectionInfo, IDesignerPanelMetadata, Parameter } from '@microsoft/vscode-extension';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension';
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

    this.projectPath = await getFunctionProjectRoot(this.context, this.workflowFilePath);
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
        this.panelMetadata = await this._getDesignerPanelMetadata(this.migrationOptions);
        eventPanel.webview.html = await this.getWebviewContent({
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
          this.panelMetadata.azureDetails?.tenantId,
          this.panelMetadata.azureDetails?.workflowManagementBaseUrl
        );
        await this.validateWorkflow(this.panelMetadata.workflowContent);
        break;
      }
      case ExtensionCommand.addConnection: {
        await addConnectionData(this.context, this.workflowFilePath, msg.connectionAndSetting);
        break;
      }
      case ExtensionCommand.openOauthLoginPopup:
        await env.openExternal(msg.url);
        break;

      case ExtensionCommand.createFileSystemConnection:
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

        if (parametersFromDefinition) {
          delete parametersFromDefinition.$connections;
          for (const parameterKey of Object.keys(parametersFromDefinition)) {
            const parameter = parametersFromDefinition[parameterKey];
            parameter.value = parameter.value ?? parameter.defaultValue;
            delete parameter.defaultValue;
          }
          await saveParameters(this.context, filePath, parametersFromDefinition);
        }

        workflow.definition = definitionToSave;

        if (connectionReferences) {
          const connectionsAndSettingsToUpdate = await getConnectionsAndSettingsToUpdate(
            this.context,
            filePath,
            connectionReferences,
            azureTenantId,
            workflowBaseManagementUri
          );

          await saveConnectionReferences(this.context, filePath, connectionsAndSettingsToUpdate);

          if (containsApiHubConnectionReference(connectionReferences)) {
            window.showInformationMessage(localize('keyValidity', 'The connection will be valid for 7 days only.'), 'OK');
          }
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
      case 'liquid':
        if (migrationOptions['liquidJsonToJson']?.inputs?.properties?.map?.properties?.source) {
          const map = action?.inputs?.map;
          if (map && map.source === undefined) {
            map.source = 'LogicApp';
          }
        }
        break;
      case 'xmlvalidation':
        if (migrationOptions['xmlValidation']?.inputs?.properties?.schema?.properties?.source) {
          const schema = action?.inputs?.schema;
          if (schema && schema.source === undefined) {
            schema.source = 'LogicApp';
          }
        }
        break;
      case 'xslt':
        if (migrationOptions['xslt']?.inputs?.properties?.map?.properties?.source) {
          const map = action?.inputs?.map;
          if (map && map.source === undefined) {
            map.source = 'LogicApp';
          }
        }
        break;
      case 'flatfileencoding':
      case 'flatfiledecoding':
        if (migrationOptions['flatFileEncoding']?.inputs?.properties?.schema?.properties?.source) {
          const schema = action?.inputs?.schema;
          if (schema && schema.source === undefined) {
            schema.source = 'LogicApp';
          }
        }
        break;
      case 'if':
        this._traverseActions(action.else?.actions, migrationOptions);
      // fall through
      case 'scope':
      case 'foreach':
      case 'changeset':
      case 'until':
        this._traverseActions(action.actions, migrationOptions);
        break;
      case 'switch':
        for (const caseKey of Object.keys(action.cases || {})) {
          this._traverseActions(action.cases[caseKey]?.actions, migrationOptions);
        }
        this._traverseActions(action.default?.actions, migrationOptions);

        break;
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
    const projectPath: string | undefined = await getFunctionProjectRoot(this.context, this.workflowFilePath);
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
}
