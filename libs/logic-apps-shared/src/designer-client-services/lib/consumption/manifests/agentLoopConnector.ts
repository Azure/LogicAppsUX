import type { Connector } from 'utils/src';

export default {
  type: 'AgentConnection',
  name: 'agent',
  id: 'connectionProviders/agent',
  properties: {
    displayName: 'Agent (Consumption)',
    iconUri: 'data:image/svg+xml;base64,...',
    brandColor: '#0078D4',
    description: 'Agent connector for Logic App Consumption. API endpoint is preconfigured in code.',
    capabilities: ['actions'],
    operationParameterSets: {
      subscriptionId: {
        name: 'subscriptionId',
        uiDefinition: {
          displayName: 'Subscription ID',
          description: 'Azure subscription ID',
          constraints: { required: 'true' },
        },
      },
      resourceGroup: {
        name: 'resourceGroup',
        uiDefinition: {
          displayName: 'Resource Group',
          description: 'Azure resource group name',
          constraints: { required: 'true' },
        },
      },
      flowName: {
        name: 'flowName',
        uiDefinition: {
          displayName: 'Flow Name',
          description: 'Logic App workflow name',
          constraints: { required: 'true' },
        },
      },
      agentModelType: {
        name: 'agentModelType',
        uiDefinition: {
          displayName: 'Agent model type',
          description: 'Type of agent model to use',
          constraints: { required: 'true' },
        },
      },
    },
  },
} as Connector;
