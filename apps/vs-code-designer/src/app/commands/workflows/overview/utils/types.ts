/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { ICallbackUrlResponse } from '@microsoft/vscode-extension-logic-apps';

export interface OverviewWorkflowProperties {
  name: string;
  stateType: string;
  operationOptions?: string;
  statelessRunMode?: string;
  callbackInfo?: ICallbackUrlResponse;
  triggerName?: string;
  definition: LogicAppsV2.WorkflowDefinition;
  kind?: string;
}

export interface CallbackInfoUpdate {
  workflowName: string;
  callbackInfo?: ICallbackUrlResponse;
}

export interface CodefulWorkflowData {
  workflowName: string;
  workflowKind: string;
  triggerName?: string;
  triggerType?: string;
  triggerKind?: string;
}

export interface CodefulWorkflowDataResult {
  workflows: CodefulWorkflowData[];
  fromRuntime: boolean;
}

export interface CodefulTriggerData {
  triggerName?: string;
  triggerType?: string;
  triggerKind?: string;
}
