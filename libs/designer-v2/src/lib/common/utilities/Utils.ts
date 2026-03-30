import toTitleCase from 'to-title-case';
import constants from '../constants';
import type { Connection } from '@microsoft/logic-apps-shared';
import { equals } from '@microsoft/logic-apps-shared';
import { isAgentSubgraphFromMetadata } from '../hooks/agent';
import type { RootState } from '../../core';

export const titleCase = (s: string) => toTitleCase(s);

export const isOpenApiSchemaVersion = (definition: any) => definition?.$schema?.includes('2023-01-31-preview');

export const getSKUDefaultHostOptions = (sku: string) => {
  switch (sku) {
    case constants.SKU.CONSUMPTION:
      return {
        recurrenceInterval: constants.RECURRENCE_OPTIONS.CONSUMPTION,
        maximumWaitingRuns: constants.MAXIMUM_WAITING_RUNS.CONSUMPTION,
      };
    case constants.SKU.STANDARD:
      return { recurrenceInterval: constants.RECURRENCE_OPTIONS.STANDARD, maximumWaitingRuns: constants.MAXIMUM_WAITING_RUNS.DEFAULT };
    default:
      return {};
  }
};

export const isDynamicConnection = (feature?: string): boolean => {
  return equals(feature ?? '', 'DynamicUserInvoked', true);
};

export class AgentUtils {
  public static ModelType = {
    AzureOpenAI: 'Azure OpenAI',
    MicrosoftFoundry: 'Foundry Models',
    FoundryService: 'Foundry project',
    APIM: 'APIM Gen AI Gateway',
    V1ChatCompletionsService: 'V1 Chat Completions Service',
  };

  /** Maps manifest/parameter values (e.g. 'AzureOpenAI') to display names (e.g. 'Azure OpenAI'). */
  public static ManifestToDisplayName: Record<string, string> = {
    AzureOpenAI: AgentUtils.ModelType.AzureOpenAI,
    MicrosoftFoundry: AgentUtils.ModelType.MicrosoftFoundry,
    FoundryAgentService: AgentUtils.ModelType.FoundryService,
    APIMGenAIGateway: AgentUtils.ModelType.APIM,
    V1ChatCompletionsService: AgentUtils.ModelType.V1ChatCompletionsService,
  };

  /** Maps display names (e.g. 'Azure OpenAI') to manifest/parameter values (e.g. 'AzureOpenAI'). */
  public static DisplayNameToManifest: Record<string, string> = {
    [AgentUtils.ModelType.AzureOpenAI]: 'AzureOpenAI',
    [AgentUtils.ModelType.MicrosoftFoundry]: 'MicrosoftFoundry',
    [AgentUtils.ModelType.FoundryService]: 'FoundryAgentService',
    [AgentUtils.ModelType.APIM]: 'APIMGenAIGateway',
    [AgentUtils.ModelType.V1ChatCompletionsService]: 'V1ChatCompletionsService',
  };

  public static isConnector = (connectorId?: string): boolean => {
    return equals(connectorId ?? '', 'connectionProviders/agent', true) || equals(connectorId ?? '', '/connectionProviders/agent', true);
  };

  public static isDeploymentOrModelIdParameter = (parameterName?: string): boolean => {
    return equals(parameterName ?? '', 'deploymentId', true) || equals(parameterName ?? '', 'modelId', true);
  };

  public static isAgentModelTypeParameter = (parameterName?: string): boolean => {
    return equals(parameterName ?? '', 'agentModelType', true);
  };

  public static isFoundryAgentIdParameter = (parameterName?: string): boolean => {
    return equals(parameterName ?? '', 'foundryAgentId', true);
  };

  public static filterDynamicConnectionFeatures = (connections: Connection, nodeId?: string, state?: RootState): boolean => {
    const isAgentSubgraph = isAgentSubgraphFromMetadata(nodeId, state?.workflow?.nodesMetadata);
    return isAgentSubgraph || !isDynamicConnection(connections.properties?.features);
  };
}
