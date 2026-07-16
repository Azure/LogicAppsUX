/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { localSettingsFileName } from '../../../../../constants';
import { ext } from '../../../../../extensionVariables';
import { localize } from '../../../../../localize';
import { getLocalSettingsJson } from '../../../../utils/appSettings/localSettings';
import { getAzureConnectorDetailsForLocalProject } from '../../../../utils/codeless/common';
import { getConnectionsJson, getLogicAppProjectRoot } from '../../../../utils/codeless/connection';
import { launchProjectDebugger } from '../../../../utils/vsCodeConfig/launch';
import { isRuntimeUp } from '../../../../utils/startRuntimeApi';
import {
  createCodefulWorkflowContent,
  createCodefulWorkflowPropertiesList,
  getCodefulWorkflowCallbackInfo,
  getCodefulWorkflowDataList,
  getCodefulWorkflowHasHttpTrigger,
  getRuntimeCodefulWorkflows,
} from '../utils/codefulHelpers';
import { getWorkflowPropertiesListSignature } from '../utils/overviewHelpers';
import LocalOverviewPanel from './localOverviewPanel';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { readFileSync } from 'fs';
import { basename, join } from 'path';
import * as vscode from 'vscode';

export default class LocalCodefulOverviewPanel extends LocalOverviewPanel {
  private codefulWorkflowFileContent = '';
  private isCodefulRuntimeMetadataConfirmed = false;
  private workflowPropertiesListSignature = '';

  constructor(context: IActionContext, node: vscode.Uri) {
    super(context, node);
    this.isCodefulOverview = true;

    const projectName = basename(this.workflowFilePath.replace(/[/\\][^/\\]+$/, ''));
    this.panelName = `${vscode.workspace.name}-${projectName}-codeful-overview`;
    this.panelTitle = `${projectName}-overview`;
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

    const fileContent = readFileSync(this.workflowFilePath, 'utf8');
    this.codefulWorkflowFileContent = fileContent;

    const codefulWorkflowData = await getCodefulWorkflowDataList(
      this.context,
      this.workflowFilePath,
      fileContent,
      this.baseUrl,
      this.apiVersion
    );
    const codefulWorkflows = codefulWorkflowData.workflows;
    this.isCodefulRuntimeMetadataConfirmed = codefulWorkflowData.fromRuntime;

    if (codefulWorkflows.length === 0) {
      throw new Error(localize('noCodefulWorkflowsFound', 'No codeful workflows were found in this project.'));
    }

    this.workflowPropertiesList = await createCodefulWorkflowPropertiesList(
      this.context,
      codefulWorkflows,
      this.workflowFilePath,
      fileContent,
      this.baseUrl,
      this.apiVersion,
      this.localSettings
    );
    this.workflowPropertiesListSignature = getWorkflowPropertiesListSignature(this.workflowPropertiesList);

    this.workflowProps = this.workflowPropertiesList[0];
    this.workflowName = this.workflowProps.name;
    this.triggerName = this.workflowProps.triggerName;
    this.callbackInfo = this.workflowProps.callbackInfo;
    this.workflowContent = createCodefulWorkflowContent(
      {
        workflowName: this.workflowProps.name,
        workflowKind: this.workflowProps.kind ?? 'Stateful',
        triggerName: this.workflowProps.triggerName,
      },
      this.workflowProps.triggerName,
      getCodefulWorkflowHasHttpTrigger(this.workflowProps)
    );

    if (this.projectPath) {
      this.azureDetails = await getAzureConnectorDetailsForLocalProject(this.context, this.projectPath);
      const connectionJson = await getConnectionsJson(this.projectPath);
      this.connectionData = connectionJson ? JSON.parse(connectionJson) : {};
    }

    this.accessToken = await this.getAccessToken();
  }

  protected async onIntervalTick(): Promise<void> {
    if (this.baseUrl && !this.isCodefulRuntimeMetadataConfirmed) {
      await this.refreshCodefulRuntimeMetadata(this.baseUrl);
    }
  }

  protected async handleCallbackInfoUpdate(baseUrl: string): Promise<void> {
    const callbackInfoUpdates = await Promise.all(
      (this.workflowPropertiesList ?? []).map(async (workflow) => ({
        workflowName: workflow.name,
        callbackInfo: workflow.triggerName
          ? await getCodefulWorkflowCallbackInfo(
              this.context,
              baseUrl,
              workflow.name,
              workflow.triggerName,
              this.apiVersion,
              getCodefulWorkflowHasHttpTrigger(workflow)
            )
          : undefined,
      }))
    );

    for (const update of callbackInfoUpdates) {
      const workflowProperty = this.workflowPropertiesList?.find((workflow) => workflow.name === update.workflowName);
      if (
        update.callbackInfo?.value !== workflowProperty?.callbackInfo?.value ||
        update.callbackInfo?.basePath !== workflowProperty?.callbackInfo?.basePath
      ) {
        if (workflowProperty) {
          workflowProperty.callbackInfo = update.callbackInfo;
        }
        this.panel?.webview.postMessage({
          command: ExtensionCommand.update_callback_info,
          data: {
            workflowName: update.workflowName,
            callbackInfo: update.callbackInfo,
          },
        });
      }
    }
    this.callbackInfo = this.workflowPropertiesList?.[0]?.callbackInfo;
  }

  private async refreshCodefulRuntimeMetadata(baseUrl: string): Promise<void> {
    const runtimeWorkflows = await getRuntimeCodefulWorkflows(this.context, baseUrl, this.apiVersion);
    if (runtimeWorkflows.length > 0) {
      const refreshedWorkflowPropertiesList = await createCodefulWorkflowPropertiesList(
        this.context,
        runtimeWorkflows,
        this.workflowFilePath,
        this.codefulWorkflowFileContent,
        baseUrl,
        this.apiVersion,
        this.localSettings
      );
      const refreshedSignature = getWorkflowPropertiesListSignature(refreshedWorkflowPropertiesList);
      this.isCodefulRuntimeMetadataConfirmed = true;

      if (refreshedSignature !== this.workflowPropertiesListSignature) {
        this.workflowPropertiesList = refreshedWorkflowPropertiesList;
        this.workflowProps = this.workflowPropertiesList[0];
        this.workflowName = this.workflowProps.name;
        this.triggerName = this.workflowProps.triggerName;
        this.callbackInfo = this.workflowProps.callbackInfo;
        this.workflowContent = createCodefulWorkflowContent(
          {
            workflowName: this.workflowProps.name,
            workflowKind: this.workflowProps.kind ?? 'Stateful',
            triggerName: this.workflowProps.triggerName,
          },
          this.workflowProps.triggerName,
          getCodefulWorkflowHasHttpTrigger(this.workflowProps)
        );
        this.workflowPropertiesListSignature = refreshedSignature;
        this.panel?.webview.postMessage({
          command: ExtensionCommand.update_workflow_properties,
          data: {
            workflowProperties: this.workflowProps,
            workflowPropertiesList: this.workflowPropertiesList,
            kind: this.workflowProps.kind,
          },
        });
      }
    }
  }
}
