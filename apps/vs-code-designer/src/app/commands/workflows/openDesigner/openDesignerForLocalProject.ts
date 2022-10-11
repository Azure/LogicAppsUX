import { localSettingsFileName, managementApiPrefix } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { getLocalSettingsJson } from '../../../funcConfig/local.settings';
import {
  cacheWebviewPanel,
  getArtifactsInLocalProject,
  getAzureConnectorDetailsForLocalProject,
  getCodelessAppData,
  removeWebviewPanelFromCache,
} from '../../../utils/codeless/common';
import { getConnectionsFromFile, getFunctionProjectRoot, getParametersFromFile } from '../../../utils/codeless/connection';
import { startDesignTimeApi } from '../../../utils/codeless/startDesignTimeApi';
import { OpenDesignerBase } from './openDesignerBase';
import { ExtensionCommand } from '@microsoft-logic-apps/utils';
import type { IDesignerPanelMetadata, AzureConnectorDetails, Parameter } from '@microsoft-logic-apps/utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { readFileSync } from 'fs';
import * as path from 'path';
import * as requestP from 'request-promise';
import { Uri, ViewColumn, window, workspace } from 'vscode';
import type { WebviewPanel } from 'vscode';

export default class OpenDesignerForLocalProject extends OpenDesignerBase {
  private _migrationOptions: Record<string, any>;
  private readonly workflowFilePath: string;
  private readonly context: IActionContext;
  private projectPath: string | undefined;
  private panelMetadata: IDesignerPanelMetadata;

  constructor(context: IActionContext, node: Uri) {
    const workflowName = path.basename(path.dirname(node.fsPath));
    const apiVersion = '2019-10-01-edge-preview';
    const panelName = `${workspace.name}-${workflowName}`;
    const panelGroupKey = ext.webViewKey.designerLocal;

    super(workflowName, panelName, apiVersion, panelGroupKey);
    this.workflowFilePath = node.fsPath;
    this.context = context;
  }

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

    this.baseUrl = `http://localhost:${ext.workflowDesignTimePort}${managementApiPrefix}`;
    this.panel = window.createWebviewPanel(
      this.panelGroupKey, // Key used to reference the panel
      this.panelName, // Title display in the tab
      ViewColumn.Active, // Editor column to show the new webview panel in.
      { enableScripts: true }
    );
    this._migrationOptions = await this._getMigrationOptions(this.baseUrl);
    this.panelMetadata = await this._getDesignerPanelMetadata(this._migrationOptions);

    this.panel.webview.html = await this.getWebviewContent({
      connectionsData: this.panelMetadata.connectionsData,
      parametersData: this.panelMetadata.parametersData || {},
      localSettings: this.panelMetadata.localSettings,
      artifacts: this.panelMetadata.artifacts,
    });

    this.panel.webview.onDidReceiveMessage(async (message) => this._handleWebviewMsg(message), ext.context.subscriptions);

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

  public sendMsgToWebview(msg: any) {
    this.panel.webview.postMessage(msg);
  }

  private _handleWebviewMsg(msg: any) {
    switch (msg.command) {
      case ExtensionCommand.initialize:
        this.sendMsgToWebview({
          command: ExtensionCommand.initialize_frame,
          data: {
            panelMetadata: this.panelMetadata,
            connectionReferences: this.connectionReferences,
            baseUrl: this.baseUrl,
          },
        });
        break;
      default:
        break;
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
    const flatFileEncodingPromise = requestP({
      json: true,
      method: 'GET',
      uri: `${baseUrl}/operationGroups/flatFileOperations/operations/flatFileEncoding?api-version=2019-10-01-edge-preview&$expand=properties/manifest`,
    });
    const liquidJsonToJsonPromise = requestP({
      json: true,
      method: 'GET',
      uri: `${baseUrl}/operationGroups/liquidOperations/operations/liquidJsonToJson?api-version=2019-10-01-edge-preview&$expand=properties/manifest`,
    });
    const xmlValidationPromise = requestP({
      json: true,
      method: 'GET',
      uri: `${baseUrl}/operationGroups/xmlOperations/operations/xmlValidation?api-version=2019-10-01-edge-preview&$expand=properties/manifest`,
    });
    const xsltPromise = requestP({
      json: true,
      method: 'GET',
      uri: `${baseUrl}/operationGroups/xmlOperations/operations/xmlTransform?api-version=2019-10-01-edge-preview&$expand=properties/manifest`,
    });

    return Promise.all([flatFileEncodingPromise, liquidJsonToJsonPromise, xmlValidationPromise, xsltPromise]).then(
      ([ff, liquid, xmlvalidation, xslt]) => {
        return {
          flatFileEncoding: ff.properties.manifest,
          liquidJsonToJson: liquid.properties.manifest,
          xmlValidation: xmlvalidation.properties.manifest,
          xslt: xslt.properties.manifest,
        };
      }
    );
  }

  private async _getDesignerPanelMetadata(migrationOptions: Record<string, any> = {}): Promise<any> {
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
      appSettingNames: Object.keys(localSettings),
      codelessApp: getCodelessAppData(this.workflowName, workflowContent, parametersData),
      scriptPath: this.panel.webview.asWebviewUri(Uri.file(path.join(ext.context.extensionPath, 'dist', 'designer'))).toString(),
      connectionsData,
      parametersData,
      localSettings,
      azureDetails,
      workflowContent,
      artifacts: await getArtifactsInLocalProject(projectPath),
    };
  }
}
