import { handoffDataSvg } from '../../common/dataSvg/handoff';

const brandColor = '#3352b9';

export const handoffOperation = {
  name: 'agenthandoff',
  id: 'agenthandoff',
  type: 'AgentHandOff',
  properties: {
    api: {
      id: 'connectionProviders/agent',
      name: 'agent',
      description: 'Agent operations',
      displayName: 'Agent',
      brandColor,
      iconUri: handoffDataSvg,
    },
    summary: 'Handoff',
    description: 'Handoff to another agent.',
    visibility: 'Important',
    operationType: 'AgentHandOff',
    brandColor,
    iconUri: handoffDataSvg,
  },
};
