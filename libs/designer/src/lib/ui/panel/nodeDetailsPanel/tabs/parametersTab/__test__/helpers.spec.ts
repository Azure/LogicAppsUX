import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../connectionsPanel/createConnection/custom/useCognitiveService', () => ({
  getCognitiveServiceAccountDeploymentsForConnection: vi.fn(),
}));

import {
  isAgentConnectorAndAgentServiceModel,
  isAgentConnectorAndDeploymentId,
  isAgentConnectorAndFoundryAgentName,
  isAgentConnectorAndAgentModel,
  isAgentConnectorAndConsumptionAgentModel,
  agentModelTypeParameterKey,
  getConnectionToAssign,
  categorizeConnections,
  getFirstDeploymentInfo,
  getFirstDeploymentModelName,
} from '../helpers';
import { getCognitiveServiceAccountDeploymentsForConnection } from '../../../../connectionsPanel/createConnection/custom/useCognitiveService';
import type { ParameterGroup } from '../../../../../../core/state/operation/operationMetadataSlice';
import type { ParameterInfo } from '@microsoft/designer-ui';
import type { Connection } from '@microsoft/logic-apps-shared';

const mockGetDeployments = vi.mocked(getCognitiveServiceAccountDeploymentsForConnection);

function makeParameterGroups(groupId: string, parameters: Partial<ParameterInfo>[]): Record<string, ParameterGroup> {
  return {
    [groupId]: {
      id: groupId,
      description: '',
      rawInputs: [],
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

describe('getFirstDeploymentInfo', () => {
  const dummyConnection = { id: 'conn-1', name: 'conn-1', properties: {} } as unknown as Connection;

  beforeEach(() => {
    mockGetDeployments.mockReset();
  });

  it('should return undefined when connection has no deployments', async () => {
    mockGetDeployments.mockResolvedValue([]);
    const result = await getFirstDeploymentInfo(dummyConnection);
    expect(result).toBeUndefined();
  });

  it('should return correct deployment info when deployment has full model properties', async () => {
    mockGetDeployments.mockResolvedValue([
      {
        name: 'my-deployment',
        properties: {
          model: {
            name: 'gpt-4o',
            format: 'OpenAI',
            version: '2024-11-20',
          },
        },
      },
    ]);
    const result = await getFirstDeploymentInfo(dummyConnection);
    expect(result).toEqual({
      deploymentName: 'my-deployment',
      modelName: 'gpt-4o',
      modelFormat: 'OpenAI',
      modelVersion: '2024-11-20',
    });
  });

  it('should return first deployment when multiple deployments exist', async () => {
    mockGetDeployments.mockResolvedValue([
      {
        name: 'deploy-1',
        properties: { model: { name: 'gpt-4o', format: 'OpenAI', version: '2024-11-20' } },
      },
      {
        name: 'deploy-2',
        properties: { model: { name: 'gpt-4', format: 'OpenAI', version: 'turbo-2024-04-09' } },
      },
    ]);
    const result = await getFirstDeploymentInfo(dummyConnection);
    expect(result?.deploymentName).toBe('deploy-1');
    expect(result?.modelName).toBe('gpt-4o');
  });

  it('should handle deployment with missing model properties gracefully', async () => {
    mockGetDeployments.mockResolvedValue([
      {
        name: 'deploy-no-model',
        properties: {},
      },
    ]);
    const result = await getFirstDeploymentInfo(dummyConnection);
    expect(result).toEqual({
      deploymentName: 'deploy-no-model',
      modelName: '',
      modelFormat: undefined,
      modelVersion: undefined,
    });
  });

  it('should handle deployment with partial model properties', async () => {
    mockGetDeployments.mockResolvedValue([
      {
        name: 'deploy-partial',
        properties: {
          model: {
            name: 'gpt-4o',
          },
        },
      },
    ]);
    const result = await getFirstDeploymentInfo(dummyConnection);
    expect(result).toEqual({
      deploymentName: 'deploy-partial',
      modelName: 'gpt-4o',
      modelFormat: undefined,
      modelVersion: undefined,
    });
  });

  it('should default deploymentName to empty string when name is undefined', async () => {
    mockGetDeployments.mockResolvedValue([
      {
        properties: { model: { name: 'gpt-4o', format: 'OpenAI', version: '2024-11-20' } },
      },
    ]);
    const result = await getFirstDeploymentInfo(dummyConnection);
    expect(result?.deploymentName).toBe('');
  });
});

describe('getFirstDeploymentModelName', () => {
  const dummyConnection = { id: 'conn-1', name: 'conn-1', properties: {} } as unknown as Connection;

  beforeEach(() => {
    mockGetDeployments.mockReset();
  });

  it('should return deployment name when deployments exist', async () => {
    mockGetDeployments.mockResolvedValue([
      {
        name: 'my-deployment',
        properties: { model: { name: 'gpt-4o', format: 'OpenAI', version: '2024-11-20' } },
      },
    ]);
    const result = await getFirstDeploymentModelName(dummyConnection);
    expect(result).toBe('my-deployment');
  });

  it('should return empty string when no deployments exist', async () => {
    mockGetDeployments.mockResolvedValue([]);
    const result = await getFirstDeploymentModelName(dummyConnection);
    expect(result).toBe('');
  });
});

describe('Foundry managed settings — regression contract', () => {
  // Reads the parametersTab source to ensure filterFoundryManagedSettings
  // hides system instructions for Foundry agent connections.
  it('filterFoundryManagedSettings should set hideSystemInstructions', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(path.resolve(__dirname, '../index.tsx'), 'utf-8');

    const functionMatch = source.match(/filterFoundryManagedSettings[\s\S]*?=>\s*[\s\S]*?\n  \);/);
    expect(functionMatch).not.toBeNull();

    const fnBody = functionMatch?.[0] ?? '';
    expect(fnBody).toContain('hideSystemInstructions: true');
  });
});
