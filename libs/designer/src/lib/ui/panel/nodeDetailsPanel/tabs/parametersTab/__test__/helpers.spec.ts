import { describe, it, expect } from 'vitest';
import { isAgentConnectorAndAgentServiceModel, agentModelTypeParameterKey } from '../helpers';
import type { ParameterGroup } from '../../../../../../core/state/operation/operationMetadataSlice';
import type { ParameterInfo } from '@microsoft/designer-ui';

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
        value: [{ id: '1', type: 'literal' as any, value: 'FoundryAgentService' }],
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
        value: [{ id: '1', type: 'literal' as any, value: 'FoundryAgentService' }],
      },
    ]);
    expect(isAgentConnectorAndAgentServiceModel(agentConnectorId, groupId, groups)).toBe(false);
  });
});
