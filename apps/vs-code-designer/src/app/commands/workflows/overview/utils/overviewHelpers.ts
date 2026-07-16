/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getRequestTriggerName, HTTP_METHODS } from '@microsoft/logic-apps-shared';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { managementApiPrefix } from '../../../../../constants';
import { ext } from '../../../../../extensionVariables';
import { localize } from '../../../../../localize';
import { getStandardAppData } from '../../../../utils/codeless/common';
import { sendRequest } from '../../../../utils/requestUtils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { ICallbackUrlResponse } from '@microsoft/vscode-extension-logic-apps';
import type { OverviewWorkflowProperties } from './types';

export async function getLocalWorkflowCallbackInfo(
  context: IActionContext,
  definition: LogicAppsV2.WorkflowDefinition,
  baseUrl: string,
  workflowName: string,
  triggerName: string,
  apiVersion: string
): Promise<ICallbackUrlResponse | undefined> {
  const requestTriggerName = getRequestTriggerName(definition);
  if (requestTriggerName) {
    if (baseUrl) {
      try {
        const url = `${baseUrl}/workflows/${workflowName}/triggers/${requestTriggerName}/listCallbackUrl?api-version=${apiVersion}`;
        const response: string = await sendRequest(context, {
          url,
          method: HTTP_METHODS.POST,
        });
        return JSON.parse(response);
      } catch (error) {
        ext.outputChannel.appendLog(
          localize(
            'callbackUrlApiFailed',
            'Failed to get callback URL for workflow "{0}": {1}',
            workflowName,
            error instanceof Error ? error.message : String(error)
          )
        );
        return undefined;
      }
    }
  } else {
    const fallbackBaseUrl = baseUrl || `http://localhost:7071${managementApiPrefix}`;
    return {
      value: `${fallbackBaseUrl}/workflows/${workflowName}/triggers/${triggerName}/run?api-version=${apiVersion}`,
      method: HTTP_METHODS.POST,
    };
  }
}

export function getWorkflowProperties(
  workflowName: string,
  workflowContent: any,
  localSettings: Record<string, string>,
  callbackInfo: ICallbackUrlResponse | undefined,
  triggerName: string | undefined
): OverviewWorkflowProperties {
  const { name, kind, operationOptions, statelessRunMode } = getStandardAppData(workflowName, workflowContent);
  return {
    name,
    stateType: getWorkflowStateType(name, kind, localSettings),
    operationOptions,
    statelessRunMode,
    callbackInfo,
    triggerName,
    definition: workflowContent.definition,
    kind,
  };
}

export function getWorkflowStateType(workflowName: string, kind: string, settings: Record<string, string>): string {
  const operationOptionsSetting = `Workflows.${workflowName}.OperationOptions`;
  const flowKindLower = kind?.toLowerCase();
  return flowKindLower === 'stateful'
    ? localize('logicapps.stateful', 'Stateful')
    : flowKindLower === 'agent'
      ? localize('logicapps.agent', 'Agent')
      : settings[operationOptionsSetting]?.toLowerCase() === 'withstatelessrunhistory'
        ? localize('logicapps.statelessDebug', 'Stateless (debug mode)')
        : localize('logicapps.stateless', 'Stateless');
}

export function getWorkflowPropertiesListSignature(workflowPropertiesList: OverviewWorkflowProperties[] | undefined): string {
  return JSON.stringify(
    (workflowPropertiesList ?? []).map((workflowProperties) => ({
      name: workflowProperties.name,
      kind: workflowProperties.kind,
      triggerName: workflowProperties.triggerName,
      callbackUrl: workflowProperties.callbackInfo?.value,
    }))
  );
}

export function normalizeLocation(location: string): string {
  if (!location) {
    return '';
  }
  return location.toLowerCase().replace(/ /g, '');
}
