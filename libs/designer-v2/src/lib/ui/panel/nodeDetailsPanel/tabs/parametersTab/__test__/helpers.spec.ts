import { describe, it, expect } from 'vitest';
import {
  isAgentConnectorAndAgentServiceModel,
  isAgentConnectorAndDeploymentId,
  isAgentConnectorAndFoundryAgentId,
  isAgentConnectorAndAgentModel,
  agentModelTypeParameterKey,
  getConnectionToAssign,
} from '../helpers';
import type { ParameterGroup } from '../../../../../../core/state/operation/operationMetadataSlice';
import type { ParameterInfo } from '@microsoft/designer-ui';
import type { Connection } from '@microsoft/logic-apps-shared';

function makeParameterGroups(groupId: string, parameters: Partial<ParameterInfo>[]): Record<string, ParameterGroup> {
  return {
    [groupId]: {
      id: groupId,
      description: '',
      parameters: parameters.map((p, i) => ({
        id: `param-${i}`,
        label: '',
        parameterKey: '',
        parameterName: '',
        required: false,
        type: 'string',
        value: [],
        info: {},
        ...p,
      })) as ParameterInfo[],
    },
  };
}

describe('isAgentConnectorAndAgentServiceModel', () => {
  const agentConnectorId = 'connectionProviders/agent';
  const groupId = 'default';

  it('should return true when connector is agent and agentModelType is FoundryAgentService', () => {
    const groups = makeParameterGroups(groupId, [
      {
        parameterKey: agentModelTypeParameterKey,
        value: [{ id: '1', type: 'literal' as any, value: 'FoundryAgentService' }],
      },
    ]);
    expect(isAgentConnectorAndAgentServiceModel(agentConnectorId, groupId, groups)).toBe(true);
  });

  it('should return false when agentModelType is AzureOpenAI', () => {
    const groups = makeParameterGroups(groupId, [
      {
        parameterKey: agentModelTypeParameterKey,
        value: [{ id: '1', type: 'literal' as any, value: 'AzureOpenAI' }],
      },
    ]);
    expect(isAgentConnectorAndAgentServiceModel(agentConnectorId, groupId, groups)).toBe(false);
  });

  it('should return false when agentModelType parameter has no value yet', () => {
    const groups = makeParameterGroups(groupId, [
      {
        parameterKey: agentModelTypeParameterKey,
        value: [],
      },
    ]);
    expect(isAgentConnectorAndAgentServiceModel(agentConnectorId, groupId, groups)).toBe(false);
  });

  it('should return false when connectorId is not the agent connector', () => {
    const groups = makeParameterGroups(groupId, [
      {
        parameterKey: agentModelTypeParameterKey,
        value: [{ id: '1', type: 'literal' as any, value: 'FoundryAgentService' }],
      },
    ]);
    expect(isAgentConnectorAndAgentServiceModel('some/otherConnector', groupId, groups)).toBe(false);
  });

  it('should return false when parameter groups are empty', () => {
    expect(isAgentConnectorAndAgentServiceModel(agentConnectorId, groupId, {})).toBe(false);
  });
});

describe('isAgentConnectorAndDeploymentId', () => {
  it('should return true for agent connector with deploymentId', () => {
    expect(isAgentConnectorAndDeploymentId('/connectionProviders/agent', 'deploymentId')).toBe(true);
  });

  it('should return true for agent connector with modelId', () => {
    expect(isAgentConnectorAndDeploymentId('/connectionProviders/agent', 'modelId')).toBe(true);
  });

  it('should return false for non-agent connector', () => {
    expect(isAgentConnectorAndDeploymentId('other/connector', 'deploymentId')).toBe(false);
  });

  it('should return false for agent connector with non-deployment parameter', () => {
    expect(isAgentConnectorAndDeploymentId('/connectionProviders/agent', 'messages')).toBe(false);
  });
});

describe('isAgentConnectorAndFoundryAgentId', () => {
  it('should return true for agent connector with foundryAgentId', () => {
    expect(isAgentConnectorAndFoundryAgentId('/connectionProviders/agent', 'foundryAgentId')).toBe(true);
  });

  it('should return false for non-agent connector', () => {
    expect(isAgentConnectorAndFoundryAgentId('other/connector', 'foundryAgentId')).toBe(false);
  });

  it('should return false for agent connector with non-foundry parameter', () => {
    expect(isAgentConnectorAndFoundryAgentId('/connectionProviders/agent', 'deploymentId')).toBe(false);
  });
});

describe('isAgentConnectorAndAgentModel', () => {
  it('should return true for agent connector with agentModelType', () => {
    expect(isAgentConnectorAndAgentModel('/connectionProviders/agent', 'agentModelType')).toBe(true);
  });

  it('should return false for non-agent connector', () => {
    expect(isAgentConnectorAndAgentModel('other/connector', 'agentModelType')).toBe(false);
  });

  it('should return false for agent connector with non-model parameter', () => {
    expect(isAgentConnectorAndAgentModel('/connectionProviders/agent', 'deploymentId')).toBe(false);
  });
});

describe('getConnectionToAssign', () => {
  const makeConnection = (id: string): Connection =>
    ({
      id,
      name: id,
      properties: {},
    }) as unknown as Connection;

  const azureConns = [makeConnection('azure-1'), makeConnection('azure-2')];
  const foundryConns = [makeConnection('foundry-1')];

  it('should return first Azure OpenAI connection when modelType is AzureOpenAI', () => {
    const result = getConnectionToAssign('AzureOpenAI', azureConns, foundryConns);
    expect(result?.id).toBe('azure-1');
  });

  it('should return first Azure OpenAI connection when modelType is MicrosoftFoundry', () => {
    const result = getConnectionToAssign('MicrosoftFoundry', azureConns, foundryConns);
    expect(result?.id).toBe('azure-1');
  });

  it('should return first foundry connection when modelType is FoundryAgentService', () => {
    const result = getConnectionToAssign('FoundryAgentService', azureConns, foundryConns);
    expect(result?.id).toBe('foundry-1');
  });

  it('should return null when no connections available for the model type', () => {
    expect(getConnectionToAssign('AzureOpenAI', [], foundryConns)).toBeNull();
    expect(getConnectionToAssign('MicrosoftFoundry', [], foundryConns)).toBeNull();
    expect(getConnectionToAssign('FoundryAgentService', azureConns, [])).toBeNull();
  });
});
