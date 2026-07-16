/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getTriggerName, isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { localSettingsFileName, managementApiPrefix, workflowTenantIdKey } from '../../../../../constants';
import { ext } from '../../../../../extensionVariables';
import { localize } from '../../../../../localize';
import { getLocalSettingsJson } from '../../../../utils/appSettings/localSettings';
import { getAzureConnectorDetailsForLocalProject } from '../../../../utils/codeless/common';
import { getConnectionsJson, getLogicAppProjectRoot } from '../../../../utils/codeless/connection';
import { getAuthorizationToken } from '../../../../utils/codeless/getAuthorizationToken';
import { launchProjectDebugger } from '../../../../utils/vsCodeConfig/launch';
import { isRuntimeUp } from '../../../../utils/startRuntimeApi';
import { createWorkflowProperties, getLocalWorkflowCallbackInfo } from '../utils/overviewHelpers';
import { OverviewPanel } from './overviewPanel';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { ICallbackUrlResponse } from '@microsoft/vscode-extension-logic-apps';
import { readFileSync } from 'fs';
import { basename, dirname, join } from 'path';
import * as vscode from 'vscode';

export default class LocalOverviewPanel extends OverviewPanel {
  protected readonly workflowFilePath: string;
  protected projectPath?: string;
  protected localSettings: Record<string, string> = {};

  constructor(context: IActionContext, node: vscode.Uri) {
    const workflowFilePath = node.fsPath;
    const workflowName = basename(dirname(workflowFilePath));
    const panelName = `${vscode.workspace.name}-${workflowName}-overview`;
    const panelTitle = `${workflowName}-overview`;

    super(context, workflowName, panelName, panelTitle, '2019-10-01-edge-preview', true);

    this.workflowFilePath = workflowFilePath;
  }

  protected async initializeOverviewData(): Promise<void> {
    this.projectPath = await getLogicAppProjectRoot(this.context, this.workflowFilePath);

    if (!isNullOrUndefined(this.projectPath) && !(await isRuntimeUp(ext.workflowRuntimePort))) {
      await launchProjectDebugger(this.context, this.projectPath);
    }

    this.baseUrl = this.getBaseUrl();
    if (!this.baseUrl) {
      ext.outputChannel.appendLog(
        localize(
          'overviewCallbackUrlUnavailable',
          'Callback URL is not available because the workflow runtime is not running. Start debugging or run "func host start" to enable the Run Trigger button.'
        )
      );
    }

    this.localSettings = this.projectPath
      ? (await getLocalSettingsJson(this.context, join(this.projectPath, localSettingsFileName))).Values || {}
      : {};

    this.workflowContent = JSON.parse(readFileSync(this.workflowFilePath, 'utf8'));
    this.triggerName = getTriggerName(this.workflowContent.definition);
    this.callbackInfo = this.baseUrl ? await this.getCallbackInfo(this.baseUrl) : undefined;

    if (this.projectPath) {
      this.azureDetails = await getAzureConnectorDetailsForLocalProject(this.context, this.projectPath);
      const connectionJson = await getConnectionsJson(this.projectPath);
      this.connectionData = connectionJson ? JSON.parse(connectionJson) : {};
    }

    this.accessToken = await this.getAccessToken();
    this.workflowProps = createWorkflowProperties(
      this.workflowName,
      this.workflowContent,
      this.localSettings,
      this.callbackInfo,
      this.triggerName
    );
  }

  protected getBaseUrl(): string | undefined {
    return ext.workflowRuntimePort ? `http://localhost:${ext.workflowRuntimePort}${managementApiPrefix}` : undefined;
  }

  protected async getCallbackInfo(baseUrl: string): Promise<ICallbackUrlResponse | undefined> {
    return await getLocalWorkflowCallbackInfo(
      this.context,
      this.workflowContent.definition,
      baseUrl,
      this.workflowName,
      this.triggerName ?? '',
      this.apiVersion
    );
  }

  protected async getAccessToken(): Promise<string> {
    return await getAuthorizationToken(this.localSettings[workflowTenantIdKey]);
  }

  protected getWorkflowNode(): vscode.Uri {
    return vscode.Uri.file(this.workflowFilePath);
  }
}
