/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../localize';
import { getStandardAppData } from '../../../../utils/codeless/common';
import type { ICallbackUrlResponse } from '@microsoft/vscode-extension-logic-apps';
import type { OverviewWorkflowProperties } from './types';

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
