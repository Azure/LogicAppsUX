/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { HTTP_METHODS } from '@microsoft/logic-apps-shared';
import { managementApiPrefix } from '../../../../../constants';
import { ext } from '../../../../../extensionVariables';
import { localize } from '../../../../../localize';
import { sendRequest } from '../../../../utils/requestUtils';
import { delay } from '../../../../utils/delay';
import {
  detectCodefulWorkflow,
  extractTriggerNameFromCodeful,
  extractHttpTriggerName,
  hasHttpRequestTrigger,
} from '../../../../utils/codeful';
import { getCodefulWorkflowMetadata } from '../../../../languageServer/languageServer';
import { getWorkflowProperties } from './overviewHelpers';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { ICallbackUrlResponse } from '@microsoft/vscode-extension-logic-apps';
import type { CodefulTriggerData, CodefulWorkflowData, CodefulWorkflowDataResult, OverviewWorkflowProperties } from './types';
import { readFileSync, readdirSync } from 'fs';
import { basename, dirname, join } from 'path';

export async function getCodefulWorkflowCallbackInfo(
  context: IActionContext,
  baseUrl: string,
  workflowName: string,
  triggerName: string,
  apiVersion: string,
  hasRequestTrigger: boolean
): Promise<ICallbackUrlResponse | undefined> {
  if (hasRequestTrigger) {
    if (!baseUrl) {
      ext.outputChannel.appendLog(
        localize(
          'codefulCallbackUrlNoBaseUrl',
          'Cannot get callback URL for codeful workflow "{0}" with request trigger: baseUrl is not available. Make sure the workflow runtime is running.',
          workflowName
        )
      );
      return undefined;
    }

    const url = `${baseUrl}/workflows/${workflowName}/triggers/${triggerName}/listCallbackUrl?api-version=${apiVersion}`;
    try {
      const response: string = await sendRequest(context, {
        url,
        method: HTTP_METHODS.POST,
      });
      return JSON.parse(response);
    } catch (error) {
      ext.outputChannel.appendLog(
        localize(
          'codefulCallbackUrlApiFailed',
          'Falling back to CodefulWorkflowHttpTrigger URL for codeful workflow "{0}" trigger "{1}" (listCallbackUrl failed: {2}).',
          workflowName,
          triggerName,
          error instanceof Error ? error.message : String(error)
        )
      );
      return getCodefulHttpTriggerCallbackUrl(baseUrl, workflowName, triggerName);
    }
  }

  const fallbackBaseUrl = baseUrl || `http://localhost:7071${managementApiPrefix}`;
  return {
    value: `${fallbackBaseUrl}/workflows/${workflowName}/triggers/${triggerName}/run?api-version=${apiVersion}`,
    method: HTTP_METHODS.POST,
  };
}

export function getCodefulHttpTriggerCallbackUrl(baseUrl: string, workflowName: string, triggerName: string): ICallbackUrlResponse {
  const origin = baseUrl.split(managementApiPrefix)[0] || baseUrl.replace(/\/runtime\/webhooks\/workflow\/api\/management$/, '');
  return {
    value: `${origin}/api/CodefulWorkflowHttpTrigger/scaleUnits/prod-00/workflows/${workflowName}/triggers/${triggerName}/invoke`,
    method: HTTP_METHODS.POST,
  };
}

export async function getCodefulWorkflowPropertiesList(
  context: IActionContext,
  codefulWorkflows: CodefulWorkflowData[],
  workflowFilePath: string,
  workflowContent: string,
  baseUrl: string | undefined,
  apiVersion: string,
  localSettings: Record<string, string>
): Promise<OverviewWorkflowProperties[]> {
  return await Promise.all(
    codefulWorkflows.map(async (workflowData) => {
      const triggerData =
        baseUrl && (!workflowData.triggerName || !workflowData.triggerType)
          ? await getCodefulTriggerData(context, workflowData.workflowName, baseUrl, apiVersion).catch(() => undefined)
          : undefined;
      const resolvedWorkflowData: CodefulWorkflowData = {
        ...workflowData,
        triggerName: workflowData.triggerName ?? triggerData?.triggerName,
        triggerType: workflowData.triggerType ?? triggerData?.triggerType,
        triggerKind: workflowData.triggerKind ?? triggerData?.triggerKind,
      };
      const hasHttpTrigger = isHttpRequestTrigger(resolvedWorkflowData, workflowContent);
      const workflowTriggerName =
        resolvedWorkflowData.triggerName ??
        (await getCodefulWorkflowMetadata(workflowFilePath)
          .then((metadata) => metadata?.triggerName)
          .catch(() => undefined)) ??
        getFallbackCodefulTriggerName(workflowContent, hasHttpTrigger);
      const codefulWorkflowContent = getCodefulWorkflowContent(resolvedWorkflowData, workflowTriggerName, hasHttpTrigger);
      const codefulCallbackInfo =
        baseUrl && workflowTriggerName
          ? await getCodefulWorkflowCallbackInfo(
              context,
              baseUrl,
              resolvedWorkflowData.workflowName,
              workflowTriggerName,
              apiVersion,
              hasHttpTrigger
            )
          : undefined;

      return getWorkflowProperties(
        resolvedWorkflowData.workflowName,
        codefulWorkflowContent,
        localSettings,
        codefulCallbackInfo,
        workflowTriggerName
      );
    })
  );
}

export async function getCodefulWorkflowDataList(
  context: IActionContext,
  workflowFilePath: string,
  workflowContent: string,
  baseUrl: string | undefined,
  apiVersion: string
): Promise<CodefulWorkflowDataResult> {
  if (baseUrl) {
    const runtimeWorkflows = await getRuntimeCodefulWorkflows(context, baseUrl, apiVersion);
    if (runtimeWorkflows.length > 0) {
      return {
        workflows: runtimeWorkflows,
        fromRuntime: true,
      };
    }
  }

  const hasHttpTrigger = hasHttpRequestTrigger(workflowContent);
  const fallbackTriggerName = getFallbackCodefulTriggerName(workflowContent, hasHttpTrigger);
  const workflowNames = getCodefulWorkflowNames(workflowFilePath);
  if (workflowNames.length > 0) {
    return {
      workflows: workflowNames.map((workflowName) => ({
        workflowName,
        workflowKind: 'Stateful',
        triggerName: fallbackTriggerName,
        triggerType: hasHttpTrigger ? 'Request' : undefined,
        triggerKind: hasHttpTrigger ? 'Http' : undefined,
      })),
      fromRuntime: false,
    };
  }

  const workflowInfo = detectCodefulWorkflow(workflowContent);
  return {
    workflows: workflowInfo
      ? [
          {
            workflowName: workflowInfo.workflowName,
            workflowKind: workflowInfo.workflowType === 'agent' ? 'Agent' : 'Stateful',
            triggerName: fallbackTriggerName,
            triggerType: hasHttpTrigger ? 'Request' : undefined,
            triggerKind: hasHttpTrigger ? 'Http' : undefined,
          },
        ]
      : [],
    fromRuntime: false,
  };
}

export async function getRuntimeCodefulWorkflows(
  context: IActionContext,
  baseUrl: string,
  apiVersion: string
): Promise<CodefulWorkflowData[]> {
  const workflowsUrl = `${baseUrl}/workflows?api-version=${apiVersion}`;
  const maxRetries = 4;
  const initialDelayMs = 1000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const workflowsResponse = await sendRequest(context, {
        url: workflowsUrl,
        method: HTTP_METHODS.GET,
      });
      const parsed = JSON.parse(workflowsResponse);
      const workflows: {
        name: string;
        kind?: string;
        triggers?: Record<string, { type?: string; kind?: string; properties?: { type?: string; kind?: string } }>;
      }[] = Array.isArray(parsed) ? parsed : (parsed?.value ?? []);

      if (workflows.length > 0) {
        return workflows.map((workflow) => {
          const [runtimeTriggerName, trigger] = Object.entries(workflow.triggers ?? {})[0] ?? [];
          return {
            workflowName: workflow.name,
            workflowKind: workflow.kind ?? 'Stateful',
            triggerName: runtimeTriggerName,
            triggerType: trigger?.properties?.type ?? trigger?.type,
            triggerKind: trigger?.properties?.kind ?? trigger?.kind,
          };
        });
      }
    } catch (error) {
      if (attempt === maxRetries - 1) {
        ext.outputChannel.appendLog(
          localize(
            'codefulWorkflowListApiFailed',
            'Failed to get codeful workflows from the runtime at "{0}": {1}',
            workflowsUrl,
            error instanceof Error ? error.message : String(error)
          )
        );
      }
    }

    if (attempt < maxRetries - 1) {
      await delay(initialDelayMs * 2 ** attempt);
    }
  }

  return [];
}

export function getCodefulWorkflowNames(filePath: string): string[] {
  const workflowNames: string[] = [];
  const visitedFiles = new Set<string>();
  const projectDir = dirname(filePath);

  const extractWorkflowsFromFile = (currentFilePath: string): void => {
    if (visitedFiles.has(currentFilePath)) {
      return;
    }
    visitedFiles.add(currentFilePath);

    try {
      const fileContent = readFileSync(currentFilePath, 'utf8');
      const workflowRegex = /(?:CreateConversationalAgent|CreateAgentWorkflow|CreateStatefulWorkflow)\s*\(\s*["']([^"']+)["']/g;
      let match: RegExpExecArray | null;
      while ((match = workflowRegex.exec(fileContent)) !== null) {
        const workflowName = match[1];
        if (workflowName && !workflowNames.includes(workflowName)) {
          workflowNames.push(workflowName);
        }
      }

      const files = readdirSync(projectDir);
      for (const file of files) {
        if (file.endsWith('.cs') && file !== basename(currentFilePath)) {
          extractWorkflowsFromFile(join(projectDir, file));
        }
      }
    } catch (error) {
      ext.outputChannel.appendLog(
        localize(
          'codefulWorkflowNameParseFailed',
          'Failed to parse codeful workflow names from "{0}": {1}',
          currentFilePath,
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  };

  extractWorkflowsFromFile(filePath);
  return workflowNames;
}

export function getFallbackCodefulTriggerName(workflowContent: string, hasHttpTrigger: boolean): string | undefined {
  return hasHttpTrigger ? extractHttpTriggerName(workflowContent) : extractTriggerNameFromCodeful(workflowContent);
}

export function isHttpRequestTrigger(workflowData: CodefulWorkflowData, workflowContent?: string): boolean {
  const triggerType = workflowData.triggerType?.toLowerCase();
  const triggerKind = workflowData.triggerKind?.toLowerCase();
  if (triggerType === 'request') {
    return !triggerKind || triggerKind === 'http';
  }

  if (triggerKind === 'http') {
    return true;
  }

  return workflowContent ? hasHttpRequestTrigger(workflowContent) : false;
}

export function getCodefulWorkflowHasHttpTrigger(workflowProperties: OverviewWorkflowProperties): boolean {
  const trigger = workflowProperties.triggerName ? workflowProperties.definition?.triggers?.[workflowProperties.triggerName] : undefined;
  return trigger?.type?.toLowerCase() === 'request' && trigger?.kind?.toLowerCase() === 'http';
}

export function getCodefulWorkflowContent(
  workflowData: CodefulWorkflowData,
  triggerName: string | undefined,
  hasHttpTrigger: boolean
): any {
  return {
    definition: {
      $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
      contentVersion: '1.0.0.0',
      triggers: triggerName
        ? {
            [triggerName]: hasHttpTrigger
              ? {
                  type: 'Request',
                  kind: 'Http',
                  inputs: {
                    schema: {},
                  },
                }
              : {
                  type: 'Unknown',
                },
          }
        : {},
      actions: {},
      outputs: {},
    },
    kind: workflowData.workflowKind ?? 'Stateful',
  };
}

export async function getCodefulTriggerData(
  context: IActionContext,
  workflowName: string,
  baseUrl: string,
  apiVersion: string
): Promise<CodefulTriggerData | undefined> {
  const triggersUrl = `${baseUrl}/workflows/${workflowName}/triggers?api-version=${apiVersion}`;
  const response: string = await sendRequest(context, {
    url: triggersUrl,
    method: HTTP_METHODS.GET,
  });
  const triggersData = JSON.parse(response);

  if (triggersData?.value?.length > 0) {
    const trigger = triggersData.value[0];
    return {
      triggerName: trigger.name,
      triggerType: trigger.properties?.type ?? trigger.type,
      triggerKind: trigger.properties?.kind ?? trigger.kind,
    };
  }
}
