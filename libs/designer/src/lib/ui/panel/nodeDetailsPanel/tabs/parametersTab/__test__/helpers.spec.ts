import { describe, it, expect } from 'vitest';
import {
  isAgentConnectorAndAgentServiceModel,
  isAgentConnectorAndDeploymentId,
  isAgentConnectorAndFoundryAgentName,
  isAgentConnectorAndAgentModel,
  isAgentConnectorAndConsumptionAgentModel,
  agentModelTypeParameterKey,
  getConnectionToAssign,
  categorizeConnections,
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

  it('should return true when connector is agent and agentModelType is FoundryAgentServiceV2', () => {
    const groups = makeParameterGroups(groupId, [
      {
        parameterKey: agentModelTypeParameterKey,
        value: [{ id: '1', type: 'literal' as any, value: 'FoundryAgentServiceV2' }],
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

  it('should return false when agentModelType parameter has no value yet (loading state)', () => {
    const groups = makeParameterGroups(groupId, [
      {
        parameterKey: agentModelTypeParameterKey,
        value: [],
      },
    ]);
    expect(isAgentConnectorAndAgentServiceModel(agentConnectorId, groupId, groups)).toBe(false);
  });

  it('should return false when agentModelType parameter does not exist', () => {
    const groups = makeParameterGroups(groupId, [
      { parameterKey: 'inputs.$.someOtherParam', value: [{ id: '1', type: 'literal' as any, value: 'test' }] },
    ]);
    expect(isAgentConnectorAndAgentServiceModel(agentConnectorId, groupId, groups)).toBe(false);
  });

  it('should return false when connectorId is not the agent connector', () => {
    const groups = makeParameterGroups(groupId, [
      {
        parameterKey: agentModelTypeParameterKey,
        value: [{ id: '1', type: 'literal' as any, value: 'FoundryAgentServiceV2' }],
      },
    ]);
    expect(isAgentConnectorAndAgentServiceModel('some/otherConnector', groupId, groups)).toBe(false);
  });

  it('should return false when parameter groups are empty', () => {
    expect(isAgentConnectorAndAgentServiceModel(agentConnectorId, groupId, {})).toBe(false);
  });

  it('should return false when groupId does not match any group', () => {
    const groups = makeParameterGroups('other-group', [
      {
        parameterKey: agentModelTypeParameterKey,
        value: [{ id: '1', type: 'literal' as any, value: 'FoundryAgentServiceV2' }],
      },
    ]);
    expect(isAgentConnectorAndAgentServiceModel(agentConnectorId, groupId, groups)).toBe(false);
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

describe('isAgentConnectorAndFoundryAgentName', () => {
  it('should return true for agent connector with foundryAgentName', () => {
    expect(isAgentConnectorAndFoundryAgentName('/connectionProviders/agent', 'foundryAgentName')).toBe(true);
  });

  it('should return true for agent connector with legacy foundryAgentId', () => {
    expect(isAgentConnectorAndFoundryAgentName('/connectionProviders/agent', 'foundryAgentId')).toBe(true);
  });

  it('should return false for non-agent connector', () => {
    expect(isAgentConnectorAndFoundryAgentName('other/connector', 'foundryAgentName')).toBe(false);
  });

  it('should return false for agent connector with non-foundry parameter', () => {
    expect(isAgentConnectorAndFoundryAgentName('/connectionProviders/agent', 'deploymentId')).toBe(false);
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

  it('should return first foundry connection when modelType is FoundryAgentServiceV2', () => {
    const result = getConnectionToAssign('FoundryAgentServiceV2', azureConns, foundryConns);
    expect(result?.id).toBe('foundry-1');
  });

  it('should return null when no connections available for the model type', () => {
    expect(getConnectionToAssign('AzureOpenAI', [], foundryConns)).toBeNull();
    expect(getConnectionToAssign('MicrosoftFoundry', [], foundryConns)).toBeNull();
    expect(getConnectionToAssign('FoundryAgentServiceV2', azureConns, [])).toBeNull();
  });
});

describe('isAgentConnectorAndConsumptionAgentModel', () => {
  it('should return true for agent connector with agentModelType', () => {
    expect(isAgentConnectorAndConsumptionAgentModel('/connectionProviders/agent', 'agentModelType')).toBe(true);
  });

  it('should return false for non-agent connector', () => {
    expect(isAgentConnectorAndConsumptionAgentModel('other/connector', 'agentModelType')).toBe(false);
  });

  it('should return false for agent connector with non-model parameter', () => {
    expect(isAgentConnectorAndConsumptionAgentModel('/connectionProviders/agent', 'deploymentId')).toBe(false);
  });
});

describe('categorizeConnections', () => {
  const makeConnection = (id: string, cognitiveServiceId?: string): Connection =>
    ({
      id,
      name: id,
      properties: {
        connectionParameters: cognitiveServiceId
          ? {
              cognitiveServiceAccountId: {
                metadata: { value: cognitiveServiceId },
              },
            }
          : {},
      },
    }) as unknown as Connection;

  it('should categorize Azure OpenAI connections (no foundry pattern)', () => {
    const connections = [
      makeConnection('conn-1', '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/myaccount'),
      makeConnection('conn-2'),
    ];
    const result = categorizeConnections(connections);
    expect(result.azureOpenAI).toHaveLength(2);
    expect(result.foundry).toHaveLength(0);
  });

  it('should categorize Foundry connections by resource pattern', () => {
    const connections = [
      makeConnection(
        'foundry-conn',
        '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/myaccount/projects/myproject'
      ),
    ];
    const result = categorizeConnections(connections);
    expect(result.azureOpenAI).toHaveLength(0);
    expect(result.foundry).toHaveLength(1);
    expect(result.foundry[0].id).toBe('foundry-conn');
  });

  it('should handle mixed connections', () => {
    const connections = [
      makeConnection('azure-conn', '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/myaccount'),
      makeConnection(
        'foundry-conn',
        '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/myaccount/projects/myproject'
      ),
    ];
    const result = categorizeConnections(connections);
    expect(result.azureOpenAI).toHaveLength(1);
    expect(result.foundry).toHaveLength(1);
  });

  it('should return empty arrays for empty input', () => {
    const result = categorizeConnections([]);
    expect(result.azureOpenAI).toHaveLength(0);
    expect(result.foundry).toHaveLength(0);
  });
});
